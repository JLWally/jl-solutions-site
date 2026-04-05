'use strict';

const { getNamedBlobStore } = require('./get-blob-store');
const {
  getPreset,
  normalizeServices,
  normalizeIssueOptions,
} = require('./demo-industry-presets');
const { insertJlDemoConfig } = require('./demo-config-supabase');
const {
  STORE_NAME,
  DEFAULT_DEMO_SUBTEXT,
  BLOB_UNAVAILABLE_DETAILS,
  isSlugAvailableOrOwnedByLead,
  sanitizeCtaService,
  originFromEvent,
} = require('./demo-config-core');
const {
  resolveDemoIndustryForLead,
  getServicesAndIssuesForDemoIndustry,
  mapRecommendedOfferToCtaService,
  normalizeLeadBusinessName,
  leadEngineDemoSlug,
  buildOutreachDemoFooter,
} = require('./lead-engine-demo-templates');
const { getLeadEnginePublicSiteUrl } = require('./lead-engine-public-site-url');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lead-engine-audit-log');

const LEAD_SELECT_DEMO =
  'id, company_name, business_name, website_url, source, status, niche, demo_slug';

/**
 * Append demo link to latest email draft + lead snapshot when not already present.
 */
async function appendDemoLinkToLatestDraft(supabase, leadId, pathUrl, publicUrl) {
  const line = buildOutreachDemoFooter(pathUrl, publicUrl);
  const { data: drafts, error: dErr } = await supabase
    .from('lead_engine_outreach')
    .select('id, draft_body')
    .eq('lead_id', leadId)
    .eq('channel', 'email')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1);
  if (dErr || !drafts || !drafts[0]) return;

  const body = String(drafts[0].draft_body || '');
  if (body.includes(pathUrl)) return;

  const nowIso = new Date().toISOString();
  await supabase
    .from('lead_engine_outreach')
    .update({
      draft_body: body + line,
      updated_at: nowIso,
    })
    .eq('id', drafts[0].id);

  const { data: leadRow } = await supabase
    .from('lead_engine_leads')
    .select('first_email_draft')
    .eq('id', leadId)
    .maybeSingle();
  const fe = leadRow && leadRow.first_email_draft != null ? String(leadRow.first_email_draft) : '';
  if (fe && !fe.includes(pathUrl)) {
    await supabase
      .from('lead_engine_leads')
      .update({ first_email_draft: fe + line, updated_at: nowIso })
      .eq('id', leadId);
  }
}

/**
 * @param {object} params
 * @param {*} params.supabase
 * @param {string} params.leadId
 * @param {object} params.event - Netlify event (for absolute URL)
 * @param {string|null} params.actor
 * @returns {Promise<{ ok: boolean, statusCode?: number, error?: string, code?: string, value?: object }>}
 */
async function runLeadEngineDemoGenerate({ supabase, leadId, event, actor }) {
  let store;
  try {
    store = getNamedBlobStore(STORE_NAME);
  } catch (e) {
    console.error('[lead-engine-demo-generate] getStore', e);
    return {
      ok: false,
      statusCode: 503,
      code: 'BLOB_UNAVAILABLE',
      error: 'Demo storage is not available in this environment.',
      details: BLOB_UNAVAILABLE_DETAILS,
    };
  }

  const { data: lead, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select(LEAD_SELECT_DEMO)
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr) {
    return { ok: false, statusCode: 500, code: 'LEAD_LOAD_FAILED', error: 'Failed to load lead' };
  }
  if (!lead) {
    return { ok: false, statusCode: 404, code: 'LEAD_NOT_FOUND', error: 'Lead not found' };
  }

  const { data: scoreRows } = await supabase
    .from('lead_engine_ai_scores')
    .select('recommended_offer')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1);

  const recommendedOffer = scoreRows && scoreRows[0] ? scoreRows[0].recommended_offer : null;

  const industryKey = resolveDemoIndustryForLead(lead);
  const { services: templateServices, issues: templateIssues } =
    getServicesAndIssuesForDemoIndustry(industryKey);

  const businessName = normalizeLeadBusinessName(lead);
  const ctaService = mapRecommendedOfferToCtaService(recommendedOffer);

  const services = normalizeServices(templateServices, industryKey, 12);
  const issueOptions = normalizeIssueOptions(templateIssues, industryKey, 12);

  const slug = leadEngineDemoSlug(lead.id);
  const allowed = await isSlugAvailableOrOwnedByLead(store, slug, lead.id);
  if (!allowed) {
    return {
      ok: false,
      statusCode: 409,
      code: 'SLUG_CONFLICT',
      error: 'Demo slug is in use by another record',
    };
  }

  const preset = getPreset(industryKey);
  const nowIso = new Date().toISOString();
  const config = {
    version: 2,
    slug,
    businessName,
    industry: industryKey,
    industryLabel: preset.label,
    services,
    issueOptions,
    ctaService: sanitizeCtaService(ctaService),
    subtext: DEFAULT_DEMO_SUBTEXT,
    headerTitle: `${businessName} – Smart Intake Demo`,
    createdAt: nowIso,
    source: 'lead-engine',
    leadEngineLeadId: lead.id,
    notes: `Lead engine auto · lead ${lead.id}`,
  };

  try {
    await store.setJSON(slug, config);
  } catch (e) {
    console.error('[lead-engine-demo-generate] setJSON', e);
    return { ok: false, statusCode: 500, code: 'SAVE_FAILED', error: 'Failed to save demo config' };
  }

  const dbOut = await insertJlDemoConfig({ config, notes: config.notes });
  if (!dbOut.ok && !dbOut.skipped) {
    console.warn('[lead-engine-demo-generate] jl_demo_configs upsert failed (blob saved)');
  }

  const pathUrl = `/demo/${slug}`;
  const origin = originFromEvent(event);
  const publicBase = getLeadEnginePublicSiteUrl();
  const absoluteUrl = origin ? `${origin}${pathUrl}` : publicBase ? `${publicBase}${pathUrl}` : pathUrl;

  const { error: slugUpErr } = await supabase
    .from('lead_engine_leads')
    .update({ demo_slug: slug, updated_at: nowIso })
    .eq('id', leadId);
  if (slugUpErr) {
    console.warn('[lead-engine-demo-generate] demo_slug update failed (run supabase migration?):', slugUpErr.message);
  }

  await appendDemoLinkToLatestDraft(supabase, leadId, pathUrl, absoluteUrl);

  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    event_type: EVENT_TYPES.DEMO_GENERATED,
    actor: actor || null,
    message: 'Smart intake demo generated',
    metadata_json: { slug, path: pathUrl, industry: industryKey },
  });

  return {
    ok: true,
    statusCode: 200,
    value: {
      success: true,
      leadId,
      slug,
      path: pathUrl,
      url: absoluteUrl,
      industry: industryKey,
      businessName,
      persistedSupabase: !!(dbOut && dbOut.ok && !dbOut.skipped),
    },
  };
}

module.exports = {
  runLeadEngineDemoGenerate,
};
