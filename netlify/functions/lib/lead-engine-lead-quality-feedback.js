'use strict';

/** Stored in lead_engine_events.event_type */
const LEAD_QUALITY_FEEDBACK_EVENT = 'lead_quality_feedback';

/** metadata_json.feedback_code — stable enum for analytics */
const FEEDBACK_CODES = [
  'good_lead',
  'bad_lead',
  'wrong_vertical',
  'wrong_offer',
  'not_enough_data',
  'duplicate_junk',
];

const FEEDBACK_LABELS = {
  good_lead: 'Good lead',
  bad_lead: 'Bad lead',
  wrong_vertical: 'Wrong vertical',
  wrong_offer: 'Wrong offer',
  not_enough_data: 'Not enough data',
  duplicate_junk: 'Duplicate / junk',
};

function isValidFeedbackCode(code) {
  return FEEDBACK_CODES.includes(code);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} leadId
 */
async function resolveSourceContextForLead(supabase, leadId) {
  const { data: rows } = await supabase
    .from('lead_engine_prospects')
    .select('source_key, raw_payload')
    .eq('promoted_lead_id', leadId)
    .order('updated_at', { ascending: false })
    .limit(3);

  const pr = (rows && rows[0]) || null;
  if (!pr) {
    const { data: leadRow } = await supabase
      .from('lead_engine_leads')
      .select('source, source_place_id')
      .eq('id', leadId)
      .maybeSingle();
    return {
      lead_source: leadRow && leadRow.source ? String(leadRow.source) : null,
      scout_query_id: null,
      source_place_id: leadRow && leadRow.source_place_id ? String(leadRow.source_place_id) : null,
    };
  }

  const rp = pr.raw_payload && typeof pr.raw_payload === 'object' ? pr.raw_payload : {};
  const qid = rp.query_id != null ? String(rp.query_id).trim() : null;
  const sn = rp.scout_normalized && typeof rp.scout_normalized === 'object' ? rp.scout_normalized : {};
  const pid = sn.place_id != null ? String(sn.place_id).trim() : null;
  return {
    lead_source: pr.source_key ? String(pr.source_key) : null,
    scout_query_id: qid || null,
    source_place_id: pid || null,
  };
}

function buildFeedbackMetadata({
  feedback_code,
  context,
  scout_query_id,
  lead_source,
  source_place_id,
  hot_rank,
  hot_score,
  company_name,
}) {
  const meta = {
    feedback_code,
    version: 1,
  };
  if (context) meta.context = String(context);
  if (scout_query_id) meta.scout_query_id = scout_query_id;
  if (lead_source) meta.lead_source = lead_source;
  if (source_place_id) meta.source_place_id = source_place_id;
  if (hot_rank != null && Number.isFinite(Number(hot_rank))) meta.hot_rank = Number(hot_rank);
  if (hot_score != null && Number.isFinite(Number(hot_score))) meta.hot_score = Number(hot_score);
  if (company_name) meta.company_name_snapshot = String(company_name).slice(0, 200);
  return meta;
}

/**
 * Latest feedback per lead (most recent row wins). Max `limit` events scanned.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} leadIds
 */
async function fetchLatestFeedbackByLeadIds(supabase, leadIds) {
  if (!leadIds.length) return {};
  const { data, error } = await supabase
    .from('lead_engine_events')
    .select('lead_id, metadata_json, created_at, actor')
    .eq('event_type', LEAD_QUALITY_FEEDBACK_EVENT)
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })
    .limit(600);

  if (error) {
    console.error('[lead-quality-feedback] fetchLatest', error.message);
    return {};
  }

  const out = {};
  for (const row of data || []) {
    if (!row.lead_id || out[row.lead_id]) continue;
    const m = row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {};
    out[row.lead_id] = {
      feedback_code: m.feedback_code || null,
      context: m.context || null,
      created_at: row.created_at,
      actor: row.actor || null,
    };
  }
  return out;
}

module.exports = {
  LEAD_QUALITY_FEEDBACK_EVENT,
  FEEDBACK_CODES,
  FEEDBACK_LABELS,
  isValidFeedbackCode,
  resolveSourceContextForLead,
  buildFeedbackMetadata,
  fetchLatestFeedbackByLeadIds,
};
