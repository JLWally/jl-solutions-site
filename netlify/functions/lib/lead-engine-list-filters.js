/**
 * Slice G: optional list filters (outreach status, recommended offer) + in-memory row matching.
 */
const { normalizeEmailForSuppression } = require('./lead-engine-email-normalize');
const {
  summarizeOutreachRowsForReview,
  doesLeadMatchReviewQueue,
} = require('./lead-engine-review-queue');

/** Max unique lead IDs pulled for outreach/offer pre-filter (guardrail). */
const MAX_FILTER_LEAD_IDS = 2500;

/** Batch size for Supabase .in('id', ...) fetches. */
const IN_CHUNK = 120;

/** PostgREST `or` filter with quoted ilike patterns. */
function buildSearchOrFilter(search) {
  const esc = search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const pat = `%${esc}%`.replace(/"/g, '""');
  return `company_name.ilike."${pat}",website_url.ilike."${pat}"`;
}

function matchesLeadSearchRow(row, searchNorm) {
  if (!searchNorm) return true;
  const c = String(row.company_name || '').toLowerCase();
  const u = String(row.website_url || '').toLowerCase();
  return c.includes(searchNorm) || u.includes(searchNorm);
}

/**
 * @param {object} row lead_engine_leads row
 * @param {{ status: string|null, search: string|null, optedOut: boolean|null }} f
 */
function matchesSliceGRowFilters(row, f) {
  if (f.status && row.status !== f.status) return false;
  if (f.optedOut === true && row.email_opted_out !== true) return false;
  if (f.optedOut === false && row.email_opted_out === true) return false;
  if (f.search) {
    const sn = String(f.search).toLowerCase();
    if (!matchesLeadSearchRow(row, sn)) return false;
  }
  return true;
}

/**
 * Leads with at least one email outreach row: approved and send_started_at set (in-flight, stuck, or unfinalized).
 */
async function fetchLeadIdsNeedingSendRecovery(supabase) {
  const { data, error } = await supabase
    .from('lead_engine_outreach')
    .select('lead_id')
    .eq('channel', 'email')
    .eq('status', 'approved')
    .not('send_started_at', 'is', null)
    .limit(12000);

  if (error) {
    console.error('[lead-engine-list-filters] send recovery ids', error);
    return { ok: false, error: 'Failed to apply needsAttention filter' };
  }
  const set = new Set((data || []).map((r) => r.lead_id));
  if (set.size > MAX_FILTER_LEAD_IDS) {
    return {
      ok: false,
      error: `This filter matches more than ${MAX_FILTER_LEAD_IDS} leads. Narrow with search or lead status, or split the cohort.`,
    };
  }
  return { ok: true, ids: set };
}

async function fetchLeadIdsByReviewQueue(supabase, reviewQueue) {
  const { data, error } = await supabase
    .from('lead_engine_outreach')
    .select('lead_id, id, status, created_at')
    .eq('channel', 'email')
    .limit(12000);
  if (error) {
    console.error('[lead-engine-list-filters] review queue ids', error);
    return { ok: false, error: 'Failed to apply reviewQueue filter' };
  }
  const grouped = new Map();
  for (const row of data || []) {
    if (!grouped.has(row.lead_id)) grouped.set(row.lead_id, []);
    grouped.get(row.lead_id).push(row);
  }
  const out = new Set();
  for (const [leadId, rows] of grouped) {
    const s = summarizeOutreachRowsForReview(rows);
    if (doesLeadMatchReviewQueue(s, reviewQueue)) out.add(leadId);
  }
  if (out.size > MAX_FILTER_LEAD_IDS) {
    return {
      ok: false,
      error: `This filter matches more than ${MAX_FILTER_LEAD_IDS} leads. Narrow with search or lead status, or split the cohort.`,
    };
  }
  return { ok: true, ids: out };
}

async function fetchLeadIdsByGlobalSuppression(supabase, suppressed) {
  const { data: leads, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select('id, contact_email')
    .limit(12000);
  if (leadErr) {
    console.error('[lead-engine-list-filters] suppression leads', leadErr);
    return { ok: false, error: 'Failed to apply suppression filter' };
  }

  const emails = [];
  const emailSeen = new Set();
  for (const l of leads || []) {
    const n = normalizeEmailForSuppression(l.contact_email);
    if (!n || emailSeen.has(n)) continue;
    emailSeen.add(n);
    emails.push(n);
  }

  let suppressedSet = new Set();
  if (emails.length) {
    const { data: supRows, error: supErr } = await supabase
      .from('lead_engine_email_suppressions')
      .select('email_normalized')
      .in('email_normalized', emails)
      .limit(12000);
    if (supErr) {
      console.error('[lead-engine-list-filters] suppression rows', supErr);
      return { ok: false, error: 'Failed to apply suppression filter' };
    }
    suppressedSet = new Set((supRows || []).map((r) => normalizeEmailForSuppression(r.email_normalized)));
  }

  const out = new Set();
  for (const l of leads || []) {
    const n = normalizeEmailForSuppression(l.contact_email);
    const isSuppressed = !!(n && suppressedSet.has(n));
    if ((suppressed === true && isSuppressed) || (suppressed === false && !isSuppressed)) {
      out.add(l.id);
    }
  }

  if (out.size > MAX_FILTER_LEAD_IDS) {
    return {
      ok: false,
      error: `This filter matches more than ${MAX_FILTER_LEAD_IDS} leads. Narrow with search or lead status, or split the cohort.`,
    };
  }
  return { ok: true, ids: out };
}

/**
 * @returns {Promise<{ ok: true, ids: Set<string> } | { ok: false, error: string }>}
 */
async function resolvePreFilteredLeadIds(
  supabase,
  { outreachStatus, recommendedOffer, needsAttentionSend, suppressed, reviewQueue }
) {
  if (!outreachStatus && !recommendedOffer && !needsAttentionSend && suppressed == null && !reviewQueue) {
    return { ok: true, ids: null };
  }

  let set = null;

  if (needsAttentionSend) {
    const rec = await fetchLeadIdsNeedingSendRecovery(supabase);
    if (!rec.ok) return rec;
    set = rec.ids;
  }

  if (suppressed != null) {
    const sup = await fetchLeadIdsByGlobalSuppression(supabase, suppressed);
    if (!sup.ok) return sup;
    set = set == null ? sup.ids : new Set([...set].filter((id) => sup.ids.has(id)));
  }

  if (reviewQueue) {
    const rq = await fetchLeadIdsByReviewQueue(supabase, reviewQueue);
    if (!rq.ok) return rq;
    set = set == null ? rq.ids : new Set([...set].filter((id) => rq.ids.has(id)));
  }

  if (outreachStatus) {
    const { data, error } = await supabase
      .from('lead_engine_outreach')
      .select('lead_id')
      .eq('channel', 'email')
      .eq('status', outreachStatus)
      .limit(12000);
    if (error) {
      console.error('[lead-engine-list-filters] outreach ids', error);
      return { ok: false, error: 'Failed to apply outreach filter' };
    }
    const oSet = new Set((data || []).map((r) => r.lead_id));
    set = set == null ? oSet : new Set([...set].filter((id) => oSet.has(id)));
  }

  if (recommendedOffer) {
    const { data, error } = await supabase
      .from('lead_engine_ai_scores')
      .select('lead_id')
      .eq('recommended_offer', recommendedOffer)
      .limit(12000);
    if (error) {
      console.error('[lead-engine-list-filters] offer ids', error);
      return { ok: false, error: 'Failed to apply recommended offer filter' };
    }
    const oSet = new Set((data || []).map((r) => r.lead_id));
    set = set == null ? oSet : new Set([...set].filter((id) => oSet.has(id)));
  }

  if (set.size > MAX_FILTER_LEAD_IDS) {
    return {
      ok: false,
      error: `This filter matches more than ${MAX_FILTER_LEAD_IDS} leads. Narrow with search or lead status, or split the cohort.`,
    };
  }

  return { ok: true, ids: set };
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * @param {string} compactSelect
 * @returns {Promise<{ data: object[], error: object|null }>}
 */
async function fetchLeadsByIdsChained(supabase, ids, compactSelect) {
  if (ids.length === 0) return { data: [], error: null };
  const chunks = chunkArray(ids, IN_CHUNK);
  const all = [];
  for (const part of chunks) {
    const { data, error } = await supabase.from('lead_engine_leads').select(compactSelect).in('id', part);
    if (error) return { data: null, error };
    for (const r of data || []) all.push(r);
  }
  return { data: all, error: null };
}

module.exports = {
  buildSearchOrFilter,
  matchesSliceGRowFilters,
  matchesLeadSearchRow,
  resolvePreFilteredLeadIds,
  fetchLeadIdsNeedingSendRecovery,
  fetchLeadIdsByReviewQueue,
  fetchLeadIdsByGlobalSuppression,
  fetchLeadsByIdsChained,
  chunkArray,
  MAX_FILTER_LEAD_IDS,
  IN_CHUNK,
};
