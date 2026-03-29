/**
 * Slice G: compact per-lead history for operators (audits, scores, outreach).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateAnalyzeBody } = require('./lib/lead-engine-analyze-validate');
const {
  shapeAnalysisListItem,
  shapeScoreListItem,
  shapeOutreachListItem,
} = require('./lib/lead-engine-lead-detail-shape');
const { fetchSuppressionLookupForLeads, isLeadGloballySuppressed } = require('./lib/lead-engine-global-suppression');

const LEAD_SELECT =
  'id, company_name, website_url, contact_email, email_opted_out, status, source, created_at, created_by, external_crm_id, crm_source, sync_status, last_synced_at, sync_error';

exports.handler = async (event) => {
  const headers = withCors('GET, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) {
    return g.response;
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

  const qs = event.queryStringParameters || {};
  const leadId = qs.leadId != null ? String(qs.leadId).trim() : '';
  const validated = validateAnalyzeBody({ leadId });
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const id = validated.value.leadId;

  const { data: lead, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select(LEAD_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (leadErr) {
    console.error('[lead-engine-lead-detail] lead', leadErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load lead' }),
    };
  }

  if (!lead) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Lead not found' }),
    };
  }

  const [
    { data: analysisRows, error: aErr },
    { data: scoreRows, error: sErr },
    { data: outreachRows, error: oErr },
    { count: cAnalysis },
    { count: cScores },
    { count: cOutreach },
    { data: eventRows, error: eErr },
  ] = await Promise.all([
    supabase
      .from('lead_engine_analysis')
      .select('id, created_at, signals')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('lead_engine_ai_scores')
      .select('id, analysis_id, created_at, scores, recommended_offer')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('lead_engine_outreach')
      .select('id, status, created_at, sent_at, approved_by, draft_subject, draft_body, send_started_at')
      .eq('lead_id', id)
      .eq('channel', 'email')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('lead_engine_analysis')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', id),
    supabase
      .from('lead_engine_ai_scores')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', id),
    supabase
      .from('lead_engine_outreach')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', id)
      .eq('channel', 'email'),
    supabase
      .from('lead_engine_events')
      .select('id, event_type, actor, message, created_at, outreach_id')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (aErr) console.error('[lead-engine-lead-detail] analyses', aErr);
  if (sErr) console.error('[lead-engine-lead-detail] scores', sErr);
  if (oErr) console.error('[lead-engine-lead-detail] outreach', oErr);
  if (eErr) console.error('[lead-engine-lead-detail] events', eErr);

  let failedAuditCount = 0;
  for (const r of analysisRows || []) {
    if (r.signals && r.signals.success === false) failedAuditCount += 1;
  }
  let globalSuppressed = false;
  try {
    const lookup = await fetchSuppressionLookupForLeads(supabase, [lead]);
    globalSuppressed = isLeadGloballySuppressed(lead, lookup);
  } catch (e) {
    console.error('[lead-engine-lead-detail] global suppression', e);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      lead: {
        ...lead,
        email_opted_out: lead.email_opted_out === true,
        global_email_suppressed: globalSuppressed,
      },
      counts: {
        analysisRuns: cAnalysis ?? 0,
        aiScoreRuns: cScores ?? 0,
        outreachRows: cOutreach ?? 0,
        failedAuditsInRecent: failedAuditCount,
      },
      audits: (analysisRows || []).map(shapeAnalysisListItem),
      scores: (scoreRows || []).map(shapeScoreListItem),
      outreach: (outreachRows || []).map(shapeOutreachListItem),
      events: eventRows || [],
    }),
  };
};
