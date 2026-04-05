/**
 * Slice G: optional list filters (outreach status, recommended offer) + in-memory row matching.
 */
const { isMissingLeadEngineDemoColumnError } = require('./lead-engine-supabase-error');
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
 * Custom-demo outreach status (Phase 6), column on lead_engine_leads.
 * @param {string} statusKey drafted|copied|sent_manual|followup_due|unset
 */
async function fetchLeadIdsByDemoOutreachStatus(supabase, statusKey) {
  let q = supabase.from('lead_engine_leads').select('id').limit(12000);
  if (statusKey === 'unset') {
    q = q.is('demo_outreach_status', null);
  } else {
    q = q.eq('demo_outreach_status', statusKey);
  }
  const { data, error } = await q;
  if (error) {
    if (isMissingLeadEngineDemoColumnError(error)) {
      console.warn(
        '[lead-engine-list-filters] demo_outreach_* columns missing; skipping demo outreach status filter. Apply 20260402160000_lead_engine_demo_outreach_status.sql.'
      );
      return { ok: true, ids: new Set(), skipFilter: true };
    }
    console.error('[lead-engine-list-filters] demo outreach status ids', error);
    return { ok: false, error: 'Failed to apply demo outreach status filter' };
  }
  const out = new Set((data || []).map((r) => r.id));
  if (out.size > MAX_FILTER_LEAD_IDS) {
    return {
      ok: false,
      error: `This filter matches more than ${MAX_FILTER_LEAD_IDS} leads. Narrow with search or lead status, or split the cohort.`,
    };
  }
  return { ok: true, ids: out };
}

/** UTC midnight for (today + offsetDays) in the calendar sense. */
function utcStartOfDayOffsetFromTodayIso(offsetDays) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays, 0, 0, 0, 0)
  ).toISOString();
}

function utcStartOfTodayIso() {
  return utcStartOfDayOffsetFromTodayIso(0);
}

function utcStartOfTomorrowIso() {
  return utcStartOfDayOffsetFromTodayIso(1);
}

/**
 * demo_followup_due_at queue (UTC calendar day boundaries).
 * @param {string} key unset | overdue | today | next_2_days | upcoming | set
 */
async function fetchLeadIdsByDemoFollowupDue(supabase, key) {
  let q = supabase.from('lead_engine_leads').select('id').limit(12000);
  const startToday = utcStartOfTodayIso();
  const startTomorrow = utcStartOfTomorrowIso();
  const startPlus3 = utcStartOfDayOffsetFromTodayIso(3);

  if (key === 'unset') {
    q = q.is('demo_followup_due_at', null);
  } else if (key === 'set') {
    q = q.not('demo_followup_due_at', 'is', null);
  } else if (key === 'overdue') {
    q = q.not('demo_followup_due_at', 'is', null).lt('demo_followup_due_at', startToday);
  } else if (key === 'today') {
    q = q
      .not('demo_followup_due_at', 'is', null)
      .gte('demo_followup_due_at', startToday)
      .lt('demo_followup_due_at', startTomorrow);
  } else if (key === 'next_2_days') {
    /* Tomorrow and the next calendar day (UTC), exclusive end at start of day+3 */
    q = q
      .not('demo_followup_due_at', 'is', null)
      .gte('demo_followup_due_at', startTomorrow)
      .lt('demo_followup_due_at', startPlus3);
  } else if (key === 'upcoming') {
    q = q.gte('demo_followup_due_at', startTomorrow);
  } else {
    return { ok: false, error: 'Invalid demo follow-up due filter' };
  }

  const { data, error } = await q;
  if (error) {
    if (isMissingLeadEngineDemoColumnError(error)) {
      console.warn(
        '[lead-engine-list-filters] demo_followup_due_at missing; skipping demo follow-up due filter. Apply 20260403100000_lead_engine_demo_followup_due.sql.'
      );
      return { ok: true, ids: new Set(), skipFilter: true };
    }
    console.error('[lead-engine-list-filters] demo follow-up due ids', error);
    return { ok: false, error: 'Failed to apply demo follow-up due filter' };
  }
  const out = new Set((data || []).map((r) => r.id));
  if (out.size > MAX_FILTER_LEAD_IDS) {
    return {
      ok: false,
      error: `This filter matches more than ${MAX_FILTER_LEAD_IDS} leads. Narrow with search or lead status, or split the cohort.`,
    };
  }
  return { ok: true, ids: out };
}

/**
 * Custom demo composer: sent_manual with demo_outreach_status_at within the last `days` (rolling window).
 */
async function fetchLeadIdsByDemoRecentSent(supabase, days) {
  const d = Math.max(1, Math.min(30, Number(days) || 0));
  const cutoffMs = Date.now() - d * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const { data, error } = await supabase
    .from('lead_engine_leads')
    .select('id')
    .eq('demo_outreach_status', 'sent_manual')
    .not('demo_outreach_status_at', 'is', null)
    .gte('demo_outreach_status_at', cutoffIso)
    .limit(12000);

  if (error) {
    if (isMissingLeadEngineDemoColumnError(error)) {
      console.warn(
        '[lead-engine-list-filters] demo outreach timestamp columns missing; skipping demo recent sent filter.'
      );
      return { ok: true, ids: new Set(), skipFilter: true };
    }
    console.error('[lead-engine-list-filters] demo recent sent ids', error);
    return { ok: false, error: 'Failed to apply demo recent sent filter' };
  }
  const out = new Set((data || []).map((r) => r.id));
  if (out.size > MAX_FILTER_LEAD_IDS) {
    return {
      ok: false,
      error: `This filter matches more than ${MAX_FILTER_LEAD_IDS} leads. Narrow with search or lead status, or split the cohort.`,
    };
  }
  return { ok: true, ids: out };
}

/**
 * Demo “daily action” queue: union of F/U overdue, F/U due today (UTC), and demo send_failed.
 */
async function fetchLeadIdsForDailyActionQueue(supabase) {
  const [ov, td, sf] = await Promise.all([
    fetchLeadIdsByDemoFollowupDue(supabase, 'overdue'),
    fetchLeadIdsByDemoFollowupDue(supabase, 'today'),
    fetchLeadIdsByDemoOutreachStatus(supabase, 'send_failed'),
  ]);
  if (!ov.ok) return ov;
  if (!td.ok) return td;
  if (!sf.ok) return sf;
  const union = new Set();
  if (!ov.skipFilter) for (const id of ov.ids) union.add(id);
  if (!td.skipFilter) for (const id of td.ids) union.add(id);
  if (!sf.skipFilter) for (const id of sf.ids) union.add(id);
  if (union.size > MAX_FILTER_LEAD_IDS) {
    return {
      ok: false,
      error: `This filter matches more than ${MAX_FILTER_LEAD_IDS} leads. Narrow with search or lead status, or split the cohort.`,
    };
  }
  return { ok: true, ids: union };
}

/**
 * @returns {Promise<{ ok: true, ids: Set<string> } | { ok: false, error: string }>}
 */
async function resolvePreFilteredLeadIds(
  supabase,
  {
    outreachStatus,
    recommendedOffer,
    needsAttentionSend,
    suppressed,
    reviewQueue,
    demoOutreachStatus,
    demoFollowupDue,
    demoRecentSentDays,
    demoQueuePreset,
  }
) {
  if (
    !outreachStatus &&
    !recommendedOffer &&
    !needsAttentionSend &&
    suppressed == null &&
    !reviewQueue &&
    !demoOutreachStatus &&
    !demoFollowupDue &&
    !demoRecentSentDays &&
    !demoQueuePreset
  ) {
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

  if (demoQueuePreset === 'daily_action') {
    const daily = await fetchLeadIdsForDailyActionQueue(supabase);
    if (!daily.ok) return daily;
    set = set == null ? daily.ids : new Set([...set].filter((id) => daily.ids.has(id)));
  } else {
    if (demoOutreachStatus) {
      const dem = await fetchLeadIdsByDemoOutreachStatus(supabase, demoOutreachStatus);
      if (!dem.ok) return dem;
      if (dem.skipFilter) {
        if (set == null) set = new Set();
      } else {
        set = set == null ? dem.ids : new Set([...set].filter((id) => dem.ids.has(id)));
      }
    }

    if (demoFollowupDue) {
      const fd = await fetchLeadIdsByDemoFollowupDue(supabase, demoFollowupDue);
      if (!fd.ok) return fd;
      if (fd.skipFilter) {
        if (set == null) set = new Set();
      } else {
        set = set == null ? fd.ids : new Set([...set].filter((id) => fd.ids.has(id)));
      }
    }
  }

  if (demoRecentSentDays) {
    const rs = await fetchLeadIdsByDemoRecentSent(supabase, demoRecentSentDays);
    if (!rs.ok) return rs;
    if (rs.skipFilter) {
      if (set == null) set = new Set();
    } else {
      set = set == null ? rs.ids : new Set([...set].filter((id) => rs.ids.has(id)));
    }
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
  fetchLeadIdsByDemoOutreachStatus,
  fetchLeadIdsByDemoFollowupDue,
  fetchLeadIdsByDemoRecentSent,
  fetchLeadIdsForDailyActionQueue,
  fetchLeadsByIdsChained,
  chunkArray,
  MAX_FILTER_LEAD_IDS,
  IN_CHUNK,
  utcStartOfDayOffsetFromTodayIso,
  utcStartOfTodayIso,
  utcStartOfTomorrowIso,
};
