'use strict';

const { openNamedBlobStoreOrNull } = require('./get-blob-store');
const {
  getPreset,
  normalizeServices,
  normalizeIssueOptions,
} = require('./demo-industry-presets');
const { insertJlDemoConfig, isJlDemoSlugFreeOrOwnedByLead } = require('./demo-config-supabase');
const {
  STORE_NAME,
  DEFAULT_DEMO_SUBTEXT,
  BLOB_UNAVAILABLE_DETAILS,
  isSlugAvailableOrOwnedByLead,
  sanitizeCtaService,
  RESERVED_SLUGS,
  STATIC_BUNDLED_DEMO_SLUGS,
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

function deployRuntimeLabel() {
  if (String(process.env.NETLIFY || '').toLowerCase() === 'true') return 'netlify';
  if (process.env.NETLIFY_DEV === 'true') return 'netlify-dev';
  return 'other';
}

function blobsEnvHint() {
  const hasContext = !!(process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext);
  const hasSite = !!(process.env.NETLIFY_SITE_ID || process.env.SITE_ID);
  const hasToken = !!(process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN);
  return { hasBlobsContext: hasContext, hasNetlifySiteId: hasSite, hasNetlifyToken: hasToken };
}

/**
 * @param {import('@netlify/blobs').Store | null} store
 * @param {*} supabase
 * @param {string} slug
 * @param {string} leadId
 */
async function assertDemoSlugAvailable(store, supabase, slug, leadId) {
  if (RESERVED_SLUGS.has(slug) || STATIC_BUNDLED_DEMO_SLUGS.has(slug)) {
    return {
      ok: false,
      statusCode: 409,
      code: 'SLUG_RESERVED',
      error: 'Demo slug is reserved for static routes or bundled demos',
    };
  }
  if (store) {
    const allowed = await isSlugAvailableOrOwnedByLead(store, slug, leadId);
    if (!allowed) {
      return {
        ok: false,
        statusCode: 409,
        code: 'SLUG_CONFLICT',
        error: 'Demo slug is in use by another record',
      };
    }
    return { ok: true };
  }
  const db = await isJlDemoSlugFreeOrOwnedByLead(slug, leadId);
  if (!db.ok) {
    return {
      ok: false,
      statusCode: 500,
      code: 'SLUG_CHECK_FAILED',
      error: 'Failed to verify demo slug availability',
      details: db.error ? String(db.error).slice(0, 500) : undefined,
    };
  }
  if (!db.available) {
    return {
      ok: false,
      statusCode: 409,
      code: 'SLUG_CONFLICT',
      error: 'Demo slug is in use by another record',
    };
  }
  return { ok: true };
}

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
 * @returns {Promise<{ ok: boolean, statusCode?: number, error?: string, code?: string, details?: string, value?: object }>}
 */
async function runLeadEngineDemoGenerate({ supabase, leadId, event, actor }) {
  const blobOpen = openNamedBlobStoreOrNull(STORE_NAME);
  const store = blobOpen.store;
  const blobInitError = blobOpen.error;

  const { data: lead, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select(LEAD_SELECT_DEMO)
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr) {
    console.error('[lead-engine-demo-generate] lead load', leadErr.message);
    return { ok: false, statusCode: 500, code: 'LEAD_LOAD_FAILED', error: 'Failed to load lead' };
  }
  if (!lead) {
    return { ok: false, statusCode: 404, code: 'LEAD_NOT_FOUND', error: 'Lead not found' };
  }

  let auditSignals = null;
  const { data: anRows } = await supabase
    .from('lead_engine_analysis')
    .select('signals, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(8);
  if (anRows && anRows.length) {
    const okRow = anRows.find((r) => r.signals && r.signals.success === true);
    if (okRow) auditSignals = okRow.signals;
  }

  const { data: scoreRows } = await supabase
    .from('lead_engine_ai_scores')
    .select('recommended_offer')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1);

  const recommendedOffer = scoreRows && scoreRows[0] ? scoreRows[0].recommended_offer : null;

  const industryKey = resolveDemoIndustryForLead(lead, auditSignals);
  const { services: templateServices, issues: templateIssues } =
    getServicesAndIssuesForDemoIndustry(industryKey);

  const businessName = normalizeLeadBusinessName(lead);
  const ctaService = mapRecommendedOfferToCtaService(recommendedOffer);

  const services = normalizeServices(templateServices, industryKey, 12);
  const issueOptions = normalizeIssueOptions(templateIssues, industryKey, 12);

  const slug = leadEngineDemoSlug(lead.id);
  const slugGate = await assertDemoSlugAvailable(store, supabase, slug, lead.id);
  if (!slugGate.ok) {
    return slugGate;
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

  let blobSaved = false;
  if (store) {
    try {
      await store.setJSON(slug, config);
      blobSaved = true;
    } catch (e) {
      console.error('[lead-engine-demo-generate] setJSON', e && e.message ? e.message : e);
    }
  }

  let dbOut = { ok: false, skipped: true };
  if (blobSaved) {
    dbOut = await insertJlDemoConfig({ config, notes: config.notes });
    if (!dbOut.ok && !dbOut.skipped) {
      console.warn('[lead-engine-demo-generate] jl_demo_configs upsert failed (blob saved)');
    }
  } else {
    dbOut = await insertJlDemoConfig({ config, notes: config.notes });
    if (!dbOut.ok || dbOut.skipped) {
      const deploy = deployRuntimeLabel();
      const logFn = process.env.DEMO_GEN_SCENARIOS_QUIET === '1' ? () => {} : console.error;
      logFn(
        '[lead-engine-demo-generate] storage_unavailable',
        JSON.stringify({
          deploy,
          blobStore: store ? 'open_but_write_failed_or_skipped' : 'unavailable',
          blobErrorName: blobInitError ? blobInitError.name : null,
          blobErrorSnippet: blobInitError
            ? String(blobInitError.message || '').slice(0, 200)
            : null,
          supabaseUpsert: dbOut.skipped ? 'skipped' : dbOut.ok ? 'ok' : 'failed',
          ...blobsEnvHint(),
        })
      );
      const isNetlifyDeploy = deploy === 'netlify' || deploy === 'netlify-dev';
      const details = isNetlifyDeploy
        ? [
            'Could not write to Netlify Blobs and could not persist to Supabase.',
            'Fix: ensure Blob storage works for this site, or configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and table public.jl_demo_configs.',
          ].join('\n\n')
        : BLOB_UNAVAILABLE_DETAILS;
      return {
        ok: false,
        statusCode: 503,
        code: 'STORAGE_UNAVAILABLE',
        error: 'Demo storage is not available; Supabase fallback failed or is not configured.',
        details,
      };
    }
  }

  const pathUrl = `/demo/${slug}`;
  const origin = originFromEvent(event);
  const publicBase = getLeadEnginePublicSiteUrl();
  const absoluteUrl = origin ? `${origin}${pathUrl}` : publicBase ? `${publicBase}${pathUrl}` : pathUrl;

  const { error: slugUpErr } = await supabase
    .from('lead_engine_leads')
    .update({ demo_slug: slug, updated_at: nowIso })
    .eq('id', leadId);

  let demoSlugColumnOk = true;
  if (slugUpErr) {
    demoSlugColumnOk = false;
    console.warn(
      '[lead-engine-demo-generate] demo_slug update failed (run supabase migration?):',
      slugUpErr.message
    );
  }

  await appendDemoLinkToLatestDraft(supabase, leadId, pathUrl, absoluteUrl);

  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    event_type: EVENT_TYPES.DEMO_GENERATED,
    actor: actor || null,
    message: 'Smart intake demo generated',
    metadata_json: { slug, path: pathUrl, industry: industryKey, blobSaved, supabaseMirror: !!(dbOut && dbOut.ok && !dbOut.skipped) },
  });

  const supabaseMirror = !!(dbOut && dbOut.ok && !dbOut.skipped);
  let persistencePath = 'unknown';
  if (blobSaved && supabaseMirror) persistencePath = 'blobs+supabase';
  else if (blobSaved) persistencePath = 'blobs';
  else persistencePath = 'supabase';

  return {
    ok: true,
    statusCode: 200,
    value: {
      ok: true,
      success: true,
      leadId,
      slug,
      path: pathUrl,
      url: absoluteUrl,
      industry: industryKey,
      industry_label: getPreset(industryKey).label,
      businessName,
      persistedSupabase: supabaseMirror,
      persistedBlobs: blobSaved,
      persistencePath,
      fallbackUsed: !blobSaved,
      readiness: {
        deploy: deployRuntimeLabel(),
        operatorSession: 'authenticated',
        netlifyBlobs: store
          ? blobSaved
            ? 'available'
            : 'available_write_failed'
          : 'unavailable',
        supabase: 'available',
        jl_demo_configs_mirror: supabaseMirror,
        persistenceChosen: persistencePath,
        demo_slug_column_ok: demoSlugColumnOk,
        blob_init_error_name: blobInitError ? blobInitError.name : null,
      },
    },
  };
}

module.exports = {
  runLeadEngineDemoGenerate,
};
