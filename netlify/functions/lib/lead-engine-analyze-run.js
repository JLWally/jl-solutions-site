'use strict';

const { fetchHtmlPage } = require('./lead-engine-audit-fetch');
const {
  extractPageSignals,
  discoverSecondaryPageUrls,
  pickContactAndServiceUrlsFromHomepage,
  deriveFormQuality,
  buildSuccessSignalBundle,
  buildFailureSignalBundle,
  buildCompactSummary,
} = require('./lead-engine-audit-signals');
const { attachVerticalIntelligenceToSignalBundle } = require('./lead-engine-vertical-intelligence');
const { runPageSpeedForUrls, buildPsiSignalBundle } = require('./lead-engine-psi');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lead-engine-audit-log');
const { isLeadEnginePsiExtended } = require('./lead-engine-config');

const LEAD_SELECT = 'id, company_name, business_name, website_url, status, niche, source';

async function runAnalyzeForLead(supabase, leadId, actor) {
  const { data: lead, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select(LEAD_SELECT)
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr) return { ok: false, statusCode: 500, code: 'LEAD_LOAD_FAILED', error: 'Failed to load lead' };
  if (!lead) return { ok: false, statusCode: 404, code: 'LEAD_NOT_FOUND', error: 'Lead not found' };
  if (!lead.website_url || !String(lead.website_url).trim()) {
    return {
      ok: false,
      statusCode: 409,
      code: 'MISSING_WEBSITE_URL',
      error: 'Lead has no website_url to analyze',
    };
  }

  const homeUrl = String(lead.website_url).trim();
  const homeFetch = await fetchHtmlPage(homeUrl);

  if (!homeFetch.ok || !homeFetch.html) {
    const failureSignals = buildFailureSignalBundle({
      error: homeFetch.error,
      message: homeFetch.message,
      statusCode: homeFetch.statusCode,
      finalUrl: homeFetch.finalUrl,
    });

    const { data: analysisRow, error: insFail } = await supabase
      .from('lead_engine_analysis')
      .insert({
        lead_id: leadId,
        fetched_at: failureSignals.fetched_at,
        signals: failureSignals,
        scores: null,
        recommended_offer: null,
        model_version: null,
      })
      .select('id')
      .single();

    if (insFail) {
      return { ok: false, statusCode: 500, code: 'ANALYSIS_SAVE_FAILED', error: 'Failed to save analysis' };
    }

    const value = {
      ok: true,
      statusCode: 200,
      value: {
        success: false,
        leadId,
        analysisId: analysisRow.id,
        summary: buildCompactSummary(failureSignals),
      },
    };
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      analysis_id: analysisRow.id,
      event_type: EVENT_TYPES.ANALYZE_FAILURE,
      actor: actor || null,
      message: 'Analyze completed with failure signals',
    });
    return value;
  }

  const pageResults = [
    {
      url: homeFetch.finalUrl,
      role: 'home',
      signals: extractPageSignals(homeFetch.html, homeFetch.finalUrl),
    },
  ];

  const secondaryUrls = discoverSecondaryPageUrls(homeFetch.html, homeFetch.finalUrl, 1);
  for (const extraUrl of secondaryUrls) {
    if (extraUrl.replace(/\/$/, '') === homeFetch.finalUrl.replace(/\/$/, '')) continue;
    const extra = await fetchHtmlPage(extraUrl);
    if (!extra.ok || !extra.html) continue;
    const pathLower = new URL(extra.finalUrl).pathname.toLowerCase();
    let role = 'key_page';
    if (/\/contact\b/i.test(pathLower)) role = 'contact';
    else if (/\/(book|booking|schedule|appointment)\b/i.test(pathLower)) role = 'booking';
    else if (/\/services?\b/i.test(pathLower)) role = 'services';

    pageResults.push({
      url: extra.finalUrl,
      role,
      signals: extractPageSignals(extra.html, extra.finalUrl),
    });
  }

  const signalBundle = buildSuccessSignalBundle(homeFetch.finalUrl, pageResults);

  const psiKey = process.env.GOOGLE_PAGESPEED_API_KEY || '';
  const psiExtended = isLeadEnginePsiExtended();
  let psiTargets = [homeFetch.finalUrl];
  if (psiExtended) {
    const { contactUrl, serviceUrl } = pickContactAndServiceUrlsFromHomepage(
      homeFetch.html,
      homeFetch.finalUrl
    );
    psiTargets = [homeFetch.finalUrl, contactUrl, serviceUrl].filter(Boolean);
  }
  if (psiKey && psiTargets.length) {
    const psiResults = await runPageSpeedForUrls(psiTargets, {
      apiKey: psiKey,
      strategy: 'mobile',
      timeoutMs: 15000,
    });
    signalBundle.psi = {
      ...buildPsiSignalBundle(psiResults),
      psi_mode: psiExtended ? 'extended' : 'home_only',
    };
  } else {
    signalBundle.psi = {
      psi_version: 1,
      skipped: true,
      reason: 'missing_GOOGLE_PAGESPEED_API_KEY',
    };
  }

  attachVerticalIntelligenceToSignalBundle(signalBundle, lead);

  const { data: analysisRow, error: insErr } = await supabase
    .from('lead_engine_analysis')
    .insert({
      lead_id: leadId,
      fetched_at: signalBundle.fetched_at,
      signals: signalBundle,
      scores: null,
      recommended_offer: null,
      model_version: null,
    })
    .select('id')
    .single();

  if (insErr) return { ok: false, statusCode: 500, code: 'ANALYSIS_SAVE_FAILED', error: 'Failed to save analysis' };

  const nowIso = new Date().toISOString();
  const agg = signalBundle.aggregate || {};
  const uxh = signalBundle.ux_hints || [];
  const formQuality = deriveFormQuality(agg, uxh);
  const trustSignals = {
    markers: agg.trust_markers || [],
    chat_hints: agg.chat_widget_hints || [],
    social_links: agg.social_links || [],
  };

  const psiPrimary = signalBundle.psi && signalBundle.psi.primary_scores ? signalBundle.psi.primary_scores : null;

  const leadPatch = {
    status: lead.status === 'new' ? 'analyzed' : lead.status,
    updated_at: nowIso,
    audited_at: nowIso,
    business_name: lead.company_name,
    website: lead.website_url,
    booking_present: !!agg.booking_detected,
    chat_present: (agg.chat_widget_hints || []).length > 0,
    form_present: (agg.forms_count_total || 0) > 0,
    form_quality: formQuality,
    trust_signals: trustSignals,
  };

  if (psiPrimary) {
    leadPatch.page_speed_score = psiPrimary.page_speed_score;
    leadPatch.performance_score = psiPrimary.performance_score;
    leadPatch.accessibility_score = psiPrimary.accessibility_score;
    leadPatch.best_practices_score = psiPrimary.best_practices_score;
    leadPatch.seo_score = psiPrimary.seo_score;
    leadPatch.accessibility_flags = psiPrimary.accessibility_flags || [];
  }

  await supabase.from('lead_engine_leads').update(leadPatch).eq('id', leadId);

  const value = {
    ok: true,
    statusCode: 200,
    value: {
      success: true,
      leadId,
      analysisId: analysisRow.id,
      summary: buildCompactSummary(signalBundle),
    },
  };
  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    analysis_id: analysisRow.id,
    event_type: EVENT_TYPES.ANALYZE_SUCCESS,
    actor: actor || null,
    message: 'Analyze completed successfully',
  });
  return value;
}

module.exports = { runAnalyzeForLead };

