/**
 * Slice G: compact summary stats for lead list (pure + small Supabase helpers).
 */

const VALID_STATUS = ['new', 'analyzed', 'review', 'archived'];

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
  const { buildSearchOrFilter } = require('./lead-engine-list-filters');
  const { fetchSuppressionLookupForLeads, isLeadGloballySuppressed } = require('./lead-engine-global-suppression');

  function applyLeadFilters(q) {
    let x = q;
    if (status) x = x.eq('status', status);
    if (search) x = x.or(buildSearchOrFilter(search));
    if (optedOut === true) x = x.eq('email_opted_out', true);
    if (optedOut === false) x = x.eq('email_opted_out', false);
    return x;
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
  };
}

module.exports = {
  summarizeLeadRowsCore,
  buildPipelineCountsForLeads,
  countFailedAnalysisRowsForLeads,
  buildSummaryStandardPath,
  VALID_STATUS,
};
