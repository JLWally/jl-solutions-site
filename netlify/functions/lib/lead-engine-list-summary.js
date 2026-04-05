/**
 * Slice G: compact summary stats for lead list (pure + small Supabase helpers).
 */

const { buildSearchOrFilter, utcStartOfDayOffsetFromTodayIso } = require('./lead-engine-list-filters');

const VALID_STATUS = ['new', 'analyzed', 'review', 'archived'];

/**
 * Demo follow-up / outcome counts from an in-memory cohort (prefiltered list path).
 * @param {object[]} rows — lead rows with demo_followup_due_at, demo_outreach_status
 */
function summarizeDemoOutreachQueueFromRows(rows) {
  const startToday = utcStartOfDayOffsetFromTodayIso(0);
  const startTomorrow = utcStartOfDayOffsetFromTodayIso(1);
  let demoFollowupDueToday = 0;
  let demoFollowupOverdue = 0;
  let demoOutreachSendFailed = 0;
  let demoOutreachReplied = 0;
  let demoOutreachInterested = 0;
  for (const r of rows || []) {
    const st = r.demo_outreach_status;
    if (st === 'send_failed') demoOutreachSendFailed += 1;
    if (st === 'replied') demoOutreachReplied += 1;
    if (st === 'interested') demoOutreachInterested += 1;
    const due = r.demo_followup_due_at;
    if (due == null) continue;
    const d = String(due);
    if (d < startToday) demoFollowupOverdue += 1;
    else if (d >= startToday && d < startTomorrow) demoFollowupDueToday += 1;
  }
  return {
    demoFollowupDueToday,
    demoFollowupOverdue,
    demoOutreachSendFailed,
    demoOutreachReplied,
    demoOutreachInterested,
  };
}

function applyLeadFiltersToQuery(q, { status, search, optedOut }) {
  let x = q;
  if (status) x = x.eq('status', status);
  if (search) x = x.or(buildSearchOrFilter(search));
  if (optedOut === true) x = x.eq('email_opted_out', true);
  if (optedOut === false) x = x.eq('email_opted_out', false);
  return x;
}

/**
 * Global counts for demo queue strip (same Slice G filters as list).
 */
async function fetchDemoOutreachQueueCounts(supabase, filterParams) {
  const startToday = utcStartOfDayOffsetFromTodayIso(0);
  const startTomorrow = utcStartOfDayOffsetFromTodayIso(1);

  function base() {
    return applyLeadFiltersToQuery(
      supabase.from('lead_engine_leads').select('id', { count: 'exact', head: true }),
      filterParams
    );
  }

  const [dueTodayR, overdueR, sendFailedR, repliedR, interestedR] = await Promise.all([
    base()
      .not('demo_followup_due_at', 'is', null)
      .gte('demo_followup_due_at', startToday)
      .lt('demo_followup_due_at', startTomorrow),
    base().not('demo_followup_due_at', 'is', null).lt('demo_followup_due_at', startToday),
    base().eq('demo_outreach_status', 'send_failed'),
    base().eq('demo_outreach_status', 'replied'),
    base().eq('demo_outreach_status', 'interested'),
  ]);

  const errs = [
    dueTodayR.error,
    overdueR.error,
    sendFailedR.error,
    repliedR.error,
    interestedR.error,
  ].filter(Boolean);
  if (errs.length) {
    console.error('[lead-engine-list-summary] demo queue counts', errs[0]);
    return {
      demoFollowupDueToday: 0,
      demoFollowupOverdue: 0,
      demoOutreachSendFailed: 0,
      demoOutreachReplied: 0,
      demoOutreachInterested: 0,
    };
  }

  return {
    demoFollowupDueToday: dueTodayR.count ?? 0,
    demoFollowupOverdue: overdueR.count ?? 0,
    demoOutreachSendFailed: sendFailedR.count ?? 0,
    demoOutreachReplied: repliedR.count ?? 0,
    demoOutreachInterested: interestedR.count ?? 0,
  };
}

/**
 * @param {object[]} rows — lead rows with status, email_opted_out, contact_email
 */
function summarizeLeadRowsCore(rows) {
  const byLeadStatus = { new: 0, analyzed: 0, review: 0, archived: 0 };
  let optedOut = 0;
  let missingContactEmail = 0;
  for (const r of rows) {
    const st = r.status;
    if (st && byLeadStatus[st] != null) byLeadStatus[st] += 1;
    if (r.email_opted_out === true) optedOut += 1;
    const ce = r.contact_email != null ? String(r.contact_email).trim() : '';
    if (!ce) missingContactEmail += 1;
  }
  return { byLeadStatus, optedOut, missingContactEmail };
}

/**
 * Distinct lead_ids in chunks.
 * @param {string[]} leadIds
 */
async function countDistinctLeadIdsInTable(supabase, table, leadIds, extraEq = {}) {
  if (leadIds.length === 0) return new Set();
  const { chunkArray } = require('./lead-engine-list-filters');
  const seen = new Set();
  for (const chunk of chunkArray(leadIds, 120)) {
    let q = supabase.from(table).select('lead_id').in('lead_id', chunk);
    for (const [k, v] of Object.entries(extraEq)) {
      q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) throw error;
    for (const r of data || []) seen.add(r.lead_id);
  }
  return seen;
}

/**
 * Count analysis rows with signals.success === false for given leads.
 * @param {string[]} leadIds
 */
async function countFailedAnalysisRowsForLeads(supabase, leadIds) {
  if (leadIds.length === 0) return 0;
  const { chunkArray } = require('./lead-engine-list-filters');
  let n = 0;
  for (const chunk of chunkArray(leadIds, 80)) {
    const { data, error } = await supabase
      .from('lead_engine_analysis')
      .select('id, signals')
      .in('lead_id', chunk);
    if (error) throw error;
    for (const r of data || []) {
      const sig = r.signals;
      if (sig && sig.success === false) n += 1;
    }
  }
  return n;
}

/**
 * @param {string[]} leadIds
 */
async function countDistinctLeadsApprovedSendLocked(supabase, leadIds) {
  if (leadIds.length === 0) return 0;
  const { chunkArray } = require('./lead-engine-list-filters');
  const seen = new Set();
  for (const chunk of chunkArray(leadIds, 120)) {
    const { data, error } = await supabase
      .from('lead_engine_outreach')
      .select('lead_id')
      .in('lead_id', chunk)
      .eq('channel', 'email')
      .eq('status', 'approved')
      .not('send_started_at', 'is', null);
    if (error) throw error;
    for (const r of data || []) seen.add(r.lead_id);
  }
  return seen.size;
}

async function buildPipelineCountsForLeads(supabase, leadIds) {
  const scored = await countDistinctLeadIdsInTable(supabase, 'lead_engine_ai_scores', leadIds);
  const draftLeads = await countDistinctLeadIdsInTable(
    supabase,
    'lead_engine_outreach',
    leadIds,
    { channel: 'email', status: 'draft' }
  );
  const approvedLeads = await countDistinctLeadIdsInTable(
    supabase,
    'lead_engine_outreach',
    leadIds,
    { channel: 'email', status: 'approved' }
  );
  const sentLeads = await countDistinctLeadIdsInTable(
    supabase,
    'lead_engine_outreach',
    leadIds,
    { channel: 'email', status: 'sent' }
  );
  const failedAnalysisRuns = await countFailedAnalysisRowsForLeads(supabase, leadIds);
  const needsSendRecovery = await countDistinctLeadsApprovedSendLocked(supabase, leadIds);
  return {
    scoredLeads: scored.size,
    withDraft: draftLeads.size,
    withApproved: approvedLeads.size,
    withSent: sentLeads.size,
    failedAnalysisRuns,
    needsSendRecovery,
  };
}

/**
 * Summary when list uses normal PostgREST pagination (no outreach/offer id prefilter).
 */
async function buildSummaryStandardPath(supabase, { status, search, optedOut, total }) {
  const { fetchSuppressionLookupForLeads, isLeadGloballySuppressed } = require('./lead-engine-global-suppression');

  const filterParams = { status, search, optedOut };

  function applyLeadFilters(q) {
    return applyLeadFiltersToQuery(q, filterParams);
  }

  const byLeadStatus = { new: 0, analyzed: 0, review: 0, archived: 0 };
  if (status) {
    byLeadStatus[status] = total;
  } else {
    const statuses = ['new', 'analyzed', 'review', 'archived'];
    const results = await Promise.all(
      statuses.map((st) =>
        applyLeadFilters(
          supabase.from('lead_engine_leads').select('id', { count: 'exact', head: true }).eq('status', st)
        )
      )
    );
    statuses.forEach((st, i) => {
      byLeadStatus[st] = results[i].count ?? 0;
    });
  }

  const [{ count: optedOutCount }, { count: missingEmailCount }] = await Promise.all([
    applyLeadFilters(
      supabase.from('lead_engine_leads').select('id', { count: 'exact', head: true }).eq('email_opted_out', true)
    ),
    applyLeadFilters(
      supabase
        .from('lead_engine_leads')
        .select('id', { count: 'exact', head: true })
        .is('contact_email', null)
    ),
  ]);

  let pipeline = null;
  let pipelineNote = null;
  let globallySuppressedCount = 0;
  const cap = 500;
  if (total > 0 && total <= cap) {
    let qi = applyLeadFilters(supabase.from('lead_engine_leads').select('id')).order('created_at', {
      ascending: false,
    });
    const { data: idRows, error } = await qi.limit(cap);
    if (!error && idRows) {
      const leadIds = idRows.map((r) => r.id);
      pipeline = await buildPipelineCountsForLeads(supabase, leadIds);
      const { data: rows, error: rErr } = await applyLeadFilters(
        supabase.from('lead_engine_leads').select('id, contact_email').in('id', leadIds)
      );
      if (!rErr && rows) {
        const lookup = await fetchSuppressionLookupForLeads(supabase, rows);
        globallySuppressedCount = rows.reduce(
          (n, l) => n + (isLeadGloballySuppressed(l, lookup) ? 1 : 0),
          0
        );
      }
    }
  } else if (total > cap) {
    pipelineNote = `Pipeline counts omitted when more than ${cap} leads match; add filters or use per-lead history.`;
  }

  let demoQueue = {
    demoFollowupDueToday: 0,
    demoFollowupOverdue: 0,
    demoOutreachSendFailed: 0,
    demoOutreachReplied: 0,
    demoOutreachInterested: 0,
  };
  try {
    demoQueue = await fetchDemoOutreachQueueCounts(supabase, filterParams);
  } catch (e) {
    console.error('[lead-engine-list-summary] demoQueue', e);
  }

  return {
    totalMatching: total,
    byLeadStatus,
    flags: {
      optedOut: optedOutCount ?? 0,
      globallySuppressed: globallySuppressedCount,
      missingContactEmail: missingEmailCount ?? 0,
    },
    pipeline,
    pipelineNote,
    demoQueue,
  };
}

module.exports = {
  summarizeLeadRowsCore,
  buildPipelineCountsForLeads,
  countFailedAnalysisRowsForLeads,
  buildSummaryStandardPath,
  summarizeDemoOutreachQueueFromRows,
  fetchDemoOutreachQueueCounts,
  VALID_STATUS,
};
