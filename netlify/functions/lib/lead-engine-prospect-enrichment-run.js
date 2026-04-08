'use strict';

const { loadAutomationPolicy } = require('./lead-engine-automation-policy');
const {
  googlePlaceDetails,
  getApiKey,
  classifyWebPresence,
  normalizeCompanyName,
  SOURCE_KEY,
} = require('./lead-engine-scout-google-places');

function enrichmentBudget(policy) {
  const g = policy && policy.budgets && policy.budgets.enrichment_max_prospects_per_tick;
  const n = g != null ? parseInt(String(g), 10) : 15;
  return Math.min(40, Math.max(1, Number.isFinite(n) ? n : 15));
}

function enrichmentCooldownHours(policy) {
  const g = policy && policy.budgets && policy.budgets.enrichment_cooldown_hours;
  const n = g != null ? parseFloat(String(g)) : 6;
  return Math.min(168, Math.max(0.25, Number.isFinite(n) ? n : 6));
}

async function insertEnrichmentEvent(supabase, { prospectId, branch, outcome, detail, runId, correlationId }) {
  const { error } = await supabase.from('lead_engine_prospect_enrichment_events').insert({
    prospect_id: prospectId,
    branch,
    outcome,
    detail: detail || null,
    worker_run_id: runId || null,
    correlation_id: correlationId || null,
  });
  if (error) console.error('[prospect-enrichment] event insert', error.message);
}

async function patchProspectEnrichmentMeta(supabase, id, outcome) {
  await supabase
    .from('lead_engine_prospects')
    .update({
      enrichment_last_at: new Date().toISOString(),
      enrichment_last_outcome: outcome,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/**
 * Re-fetch Place Details for branch prospects; promote to raw when a usable website appears.
 * weak_web_presence: re-classify; may promote to raw if Google now returns a strong domain.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ correlationId: string, runId: string }} ctx
 */
async function runProspectBranchEnrichmentPass({ supabase, correlationId, runId }) {
  const policy = loadAutomationPolicy();
  const budget = enrichmentBudget(policy);
  const coolH = enrichmentCooldownHours(policy);
  const coolIso = new Date(Date.now() - coolH * 3600000).toISOString();

  const { data: rows, error } = await supabase
    .from('lead_engine_prospects')
    .select('id, status, company_name, website_url, raw_payload')
    .eq('source_key', SOURCE_KEY)
    .in('status', ['no_website', 'weak_web_presence', 'alternate_enrichment_needed'])
    .or(`enrichment_last_at.is.null,enrichment_last_at.lt.${coolIso}`)
    .order('created_at', { ascending: true })
    .limit(budget);

  if (error) throw new Error(error.message);

  const key = getApiKey();
  if (!key) {
    return { skipped: true, reason: 'no_google_places_api_key', attempted: 0 };
  }

  let attempted = 0;
  let promoted_to_raw = 0;
  let still_branch = 0;
  const by_branch = { no_website: 0, weak_web_presence: 0, alternate_enrichment_needed: 0 };

  const arr = rows || [];
  for (let idx = 0; idx < arr.length; idx++) {
    const p = arr[idx];
    const rp = p.raw_payload && typeof p.raw_payload === 'object' ? p.raw_payload : {};
    const sn = rp.scout_normalized || {};
    const placeId = sn.place_id && String(sn.place_id).trim();
    const branchBefore = p.status;

    if (!placeId) {
      await insertEnrichmentEvent(supabase, {
        prospectId: p.id,
        branch: branchBefore,
        outcome: 'skipped_no_place_id',
        detail: { reason: 'missing_place_id' },
        runId,
        correlationId,
      });
      await patchProspectEnrichmentMeta(supabase, p.id, 'skipped_no_place_id');
      continue;
    }

    attempted += 1;
    if (by_branch[branchBefore] != null) by_branch[branchBefore] += 1;

    let detailsJson;
    try {
      detailsJson = await googlePlaceDetails({ placeId, key, language: 'en' });
    } catch (e) {
      await insertEnrichmentEvent(supabase, {
        prospectId: p.id,
        branch: branchBefore,
        outcome: 'details_fetch_error',
        detail: { error: e.message || String(e) },
        runId,
        correlationId,
      });
      await patchProspectEnrichmentMeta(supabase, p.id, 'details_fetch_error');
      continue;
    }

    if (!detailsJson || detailsJson.status !== 'OK' || !detailsJson.result) {
      await insertEnrichmentEvent(supabase, {
        prospectId: p.id,
        branch: branchBefore,
        outcome: 'details_not_ok',
        detail: { status: detailsJson && detailsJson.status },
        runId,
        correlationId,
      });
      await patchProspectEnrichmentMeta(supabase, p.id, 'details_not_ok');
      continue;
    }

    const r = detailsJson.result;
    const companyName = normalizeCompanyName(r.name);
    const webClass = classifyWebPresence(r.website, r.url);

    let newStatus = p.status;
    let outcome = 'no_change';

    if (branchBefore === 'weak_web_presence') {
      if (webClass.status === 'raw') {
        newStatus = 'raw';
        outcome = 'promoted_weak_to_raw';
        promoted_to_raw += 1;
      } else if (webClass.status === 'weak_web_presence') {
        outcome = 'still_weak';
        still_branch += 1;
      } else if (webClass.status === 'no_website') {
        newStatus = 'no_website';
        outcome = 'weak_now_no_website';
        still_branch += 1;
      } else {
        newStatus = 'alternate_enrichment_needed';
        outcome = 'weak_reclassified_alternate';
        still_branch += 1;
      }
    } else if (branchBefore === 'no_website' || branchBefore === 'alternate_enrichment_needed') {
      if (webClass.status === 'raw') {
        newStatus = 'raw';
        outcome = 'promoted_to_raw';
        promoted_to_raw += 1;
      } else if (webClass.status === 'weak_web_presence') {
        newStatus = 'weak_web_presence';
        outcome = 'now_weak_web';
        still_branch += 1;
      } else if (webClass.status === 'no_website') {
        newStatus = 'no_website';
        outcome = 'still_no_website';
        still_branch += 1;
      } else {
        newStatus = 'alternate_enrichment_needed';
        outcome = 'still_alternate';
        still_branch += 1;
      }
    }

    const scoutNormalized = {
      ...sn,
      web_presence: webClass.status,
      web_presence_detail: webClass.detail,
      website_raw: webClass.website_raw,
      maps_url: r.url || sn.maps_url || null,
    };
    const payload = {
      ...rp,
      scout_normalized: scoutNormalized,
      enrichment_last_correlation: correlationId,
    };

    const websiteUrlForRow = webClass.website_url;

    await supabase
      .from('lead_engine_prospects')
      .update({
        company_name: companyName,
        website_url: websiteUrlForRow,
        raw_payload: payload,
        status: newStatus,
        enrichment_last_at: new Date().toISOString(),
        enrichment_last_outcome: outcome,
        automation_correlation_id: correlationId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id);

    await insertEnrichmentEvent(supabase, {
      prospectId: p.id,
      branch: branchBefore,
      outcome,
      detail: { new_status: newStatus, web_presence: webClass.status },
      runId,
      correlationId,
    });

    if (idx < arr.length - 1) {
      await new Promise((res) => setTimeout(res, 150));
    }
  }

  return { attempted, promoted_to_raw, still_branch, by_branch };
}

module.exports = { runProspectBranchEnrichmentPass };
