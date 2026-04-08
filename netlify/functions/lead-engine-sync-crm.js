/**
 * Slice K: manual one-way CRM sync (lead engine -> HubSpot contact).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateSyncCrmBody } = require('./lib/lead-engine-crm-sync-validate');
const { normalizeOptionalEmail } = require('./lib/lead-engine-ingest-validate');
const { pickPreferredAnalysisRow } = require('./lib/lead-engine-analysis-pick');
const { buildOutreachSummaryByLead } = require('./lib/lead-engine-outreach-classify');
const {
  buildLatestAiScoreByAnalysis,
  pickLatestAiScoreForPreferredAnalysis,
} = require('./lib/lead-engine-canonical-select');
const {
  hasHubspotConfig,
  buildHubspotContactPayload,
  upsertHubspotContact,
  fetchHubspotContactLifecycleSnapshot,
} = require('./lib/lead-engine-crm-hubspot');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const { logNativeLeadOutcome, NATIVE_SOURCES } = require('./lib/lead-engine-native-outcome-log');

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;
  const operator = g.session.username;

  if (!hasHubspotConfig()) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'CRM sync is not configured. Set HUBSPOT_PRIVATE_APP_TOKEN.',
      }),
    };
  }

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  const validated = validateSyncCrmBody(body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const { leadId } = validated.value;
  const leadSelect =
    'id, company_name, website_url, contact_email, status, created_at, created_by, external_id, external_crm_id, crm_source, sync_status, last_synced_at, sync_error, niche, city, state, lead_score, page_speed_score, performance_score, accessibility_score, best_practices_score, seo_score';

  const { data: lead, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select(leadSelect)
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr) {
    console.error('[lead-engine-sync-crm] lead', leadErr);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load lead' }) };
  }
  if (!lead) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Lead not found' }) };
  }

  const emailNorm = normalizeOptionalEmail(lead.contact_email);
  if (!emailNorm.ok || !emailNorm.value) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'Lead needs a valid contact_email before CRM sync.',
        code: 'MISSING_CONTACT_EMAIL',
      }),
    };
  }
  lead.contact_email = emailNorm.value;

  const [{ data: analyses }, { data: aiScores }, { data: outreachRows }] = await Promise.all([
    supabase
      .from('lead_engine_analysis')
      .select('id, created_at, signals')
      .eq('lead_id', leadId),
    supabase
      .from('lead_engine_ai_scores')
      .select('id, analysis_id, created_at, scores, recommended_offer')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
    supabase
      .from('lead_engine_outreach')
      .select('id, lead_id, status, created_at, sent_at, approved_by, draft_subject')
      .eq('lead_id', leadId)
      .eq('channel', 'email')
      .order('created_at', { ascending: false }),
  ]);

  const preferredAnalysis = pickPreferredAnalysisRow(analyses || []);
  const latestAiByAnalysis = buildLatestAiScoreByAnalysis(aiScores || []);
  const latestAiForPreferred = pickLatestAiScoreForPreferredAnalysis(
    preferredAnalysis,
    latestAiByAnalysis
  );
  const outreachSummary = buildOutreachSummaryByLead([leadId], outreachRows || []).get(leadId) || null;

  const payload = buildHubspotContactPayload({
    lead,
    analysisRow: preferredAnalysis,
    aiScoreRow: latestAiForPreferred,
    outreachSummary,
  });

  const nowIso = new Date().toISOString();
  const existingCrmId = lead.external_crm_id || lead.external_id || '';
  let beforeSnap = null;
  if (existingCrmId) {
    try {
      beforeSnap = await fetchHubspotContactLifecycleSnapshot(existingCrmId);
    } catch (e) {
      console.warn('[lead-engine-sync-crm] lifecycle pre-fetch', (e && e.message) || e);
    }
  }

  try {
    const { crmId, action } = await upsertHubspotContact({
      externalCrmId: lead.external_crm_id || lead.external_id,
      payload,
    });

    const { error: saveErr } = await supabase
      .from('lead_engine_leads')
      .update({
        external_crm_id: crmId,
        external_id: crmId,
        crm_source: 'hubspot',
        sync_status: 'synced',
        last_synced_at: nowIso,
        sync_error: null,
      })
      .eq('id', leadId);
    if (saveErr) {
      console.error('[lead-engine-sync-crm] save synced state', saveErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'CRM record synced but local sync state update failed' }),
      };
    }
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      event_type: EVENT_TYPES.CRM_SYNC_SUCCEEDED,
      actor: operator || null,
      message: 'CRM sync succeeded',
      metadata_json: { crm_source: 'hubspot', action, external_crm_id: crmId },
    });

    let afterSnap = null;
    try {
      afterSnap = await fetchHubspotContactLifecycleSnapshot(crmId);
    } catch (e) {
      console.warn('[lead-engine-sync-crm] lifecycle post-fetch', (e && e.message) || e);
    }
    const canCompare = Boolean(beforeSnap && afterSnap);
    const lifecycleDiff =
      canCompare &&
      (beforeSnap.lifecyclestage !== afterSnap.lifecyclestage ||
        beforeSnap.hs_lead_status !== afterSnap.hs_lead_status);
    const shouldLogCrmOutcome = action === 'created' || !beforeSnap || lifecycleDiff;
    if (shouldLogCrmOutcome) {
      await logNativeLeadOutcome(supabase, {
        leadId,
        outcome_code: 'crm_stage_changed',
        native_source: NATIVE_SOURCES.HUBSPOT_CRM_SYNC,
        context: 'hubspot_lifecycle',
        evidence: {
          hubspot_action: action,
          before: beforeSnap,
          after: afterSnap,
          stage_changed: Boolean(lifecycleDiff || action === 'created'),
        },
        actor: operator ? `operator:${operator}` : 'operator:crm_sync',
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        leadId,
        crmSource: 'hubspot',
        syncStatus: 'synced',
        externalCrmId: crmId,
        action,
        lastSyncedAt: nowIso,
      }),
    };
  } catch (e) {
    const syncMsg = String((e && e.message) || 'CRM sync failed').slice(0, 1000);
    await supabase
      .from('lead_engine_leads')
      .update({
        crm_source: 'hubspot',
        sync_status: 'failed',
        last_synced_at: nowIso,
        sync_error: syncMsg,
      })
      .eq('id', leadId);
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      event_type: EVENT_TYPES.CRM_SYNC_FAILED,
      actor: operator || null,
      message: 'CRM sync failed',
      metadata_json: { crm_source: 'hubspot', error: syncMsg },
    });
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'CRM sync failed',
        code: 'CRM_SYNC_FAILED',
        details: syncMsg,
      }),
    };
  }
};

