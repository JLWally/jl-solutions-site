'use strict';

const { LEAD_QUALITY_FEEDBACK_EVENT } = require('./lead-engine-lead-quality-feedback');
const { LEAD_OUTCOME_EVENT, isPositiveOutcome, isNativePipelineOutcomeMeta } = require('./lead-engine-outcome-events');
const { EVENT_TYPES } = require('./lead-engine-audit-log');
const { computeGuardrailScorecards } = require('./lead-engine-feedback-guardrails');

function sinceIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function inWindow(rowCreatedAt, sinceIsoStr) {
  return rowCreatedAt && String(rowCreatedAt) >= sinceIsoStr;
}

function aggregateOutcomes(rows, sinceIsoStr) {
  const native = { total: 0, by_code: {}, positive: 0 };
  const manual = { total: 0, by_code: {}, positive: 0 };
  const byQuery = {};
  const bySource = {};

  for (const row of rows || []) {
    if (!inWindow(row.created_at, sinceIsoStr)) continue;
    const m = row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {};
    const code = m.outcome_code ? String(m.outcome_code) : '_unknown';
    const pos = isPositiveOutcome(code);
    const qid = m.scout_query_id ? String(m.scout_query_id) : null;
    const src = m.lead_source ? String(m.lead_source) : null;

    const bag = isNativePipelineOutcomeMeta(m) ? native : manual;
    bag.total += 1;
    bag.by_code[code] = (bag.by_code[code] || 0) + 1;
    if (pos) bag.positive += 1;

    if (qid) {
      if (!byQuery[qid]) byQuery[qid] = { total: 0, positive: 0 };
      byQuery[qid].total += 1;
      if (pos) byQuery[qid].positive += 1;
    }
    if (src) {
      if (!bySource[src]) bySource[src] = { total: 0, positive: 0 };
      bySource[src].total += 1;
      if (pos) bySource[src].positive += 1;
    }
  }

  function finalizeQueryMap(m) {
    const out = [];
    for (const [k, v] of Object.entries(m)) {
      const rate = v.total ? v.positive / v.total : 0;
      out.push({ query_id: k, outcomes: v.total, positive: v.positive, positive_rate: Math.round(rate * 1000) / 1000 });
    }
    return out.sort((a, b) => b.outcomes - a.outcomes);
  }

  function finalizeSourceMap(m) {
    const out = [];
    for (const [k, v] of Object.entries(m)) {
      const rate = v.total ? v.positive / v.total : 0;
      out.push({ source_key: k, outcomes: v.total, positive: v.positive, positive_rate: Math.round(rate * 1000) / 1000 });
    }
    return out.sort((a, b) => b.outcomes - a.outcomes);
  }

  const queriesRanked = finalizeQueryMap(byQuery);
  const minN = 3;
  const withSample = queriesRanked.filter((q) => q.outcomes >= minN);
  const top_queries = [...withSample].sort((a, b) => b.positive_rate - a.positive_rate).slice(0, 15);
  const worst_queries = [...withSample].sort((a, b) => a.positive_rate - b.positive_rate).slice(0, 15);

  return {
    native,
    manual,
    positive_rate_by_query: finalizeQueryMap(byQuery),
    positive_rate_by_source: finalizeSourceMap(bySource),
    top_queries_by_positive_rate: top_queries,
    worst_queries_by_positive_rate: worst_queries,
    note_query_attribution: 'Rates use lead_outcome rows with scout_query_id / lead_source in metadata (native + manual).',
  };
}

function aggregateHotUsefulness(rows, sinceIsoStr) {
  let good = 0;
  let bad = 0;
  let other = 0;
  for (const row of rows || []) {
    if (!inWindow(row.created_at, sinceIsoStr)) continue;
    const m = row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {};
    if (m.context !== 'hot_leads_panel') continue;
    const code = m.feedback_code ? String(m.feedback_code) : '';
    if (code === 'good_lead') good += 1;
    else if (code === 'bad_lead') bad += 1;
    else other += 1;
  }
  const denom = good + bad;
  return {
    good_lead: good,
    bad_lead: bad,
    other,
    usefulness_ratio: denom ? Math.round((good / denom) * 1000) / 1000 : null,
    note: 'Usefulness ratio = good_lead / (good_lead + bad_lead) from hot panel only.',
  };
}

function aggregateGuardrailTransitions(rows, sinceIsoStr) {
  const list = [];
  let count = 0;
  for (const row of rows || []) {
    if (!inWindow(row.created_at, sinceIsoStr)) continue;
    const m = row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {};
    count += 1;
    if (list.length < 40) {
      list.push({
        created_at: row.created_at,
        message: row.message || null,
        scope: m.scope || null,
        scope_key: m.scope_key != null ? String(m.scope_key) : null,
        from: m.from || null,
        to: m.to || null,
      });
    }
  }
  return { count, recent: list };
}

function recoveryPlaybookStats(scorecards) {
  const q = scorecards.query_scorecard || [];
  const s = scorecards.source_scorecard || [];
  let active = 0;
  let actionTally = {};
  for (const row of [...q, ...s]) {
    const st = row.latest_health_status || 'healthy';
    if (st !== 'healthy') active += 1;
    const pb = row.recovery_playbook;
    const actions = pb && Array.isArray(pb.actions) ? pb.actions : [];
    for (const a of actions) {
      const t = a && a.type ? String(a.type) : 'unknown';
      actionTally[t] = (actionTally[t] || 0) + 1;
    }
  }
  return {
    non_healthy_scopes: active,
    suggested_action_types_tally: actionTally,
    note: 'Tallies recovery_playbook actions on current scorecard rows (snapshot when report runs).',
  };
}

function guardrailDrift(scorecards, queryStateRows, sourceStateRows) {
  const qById = {};
  for (const r of queryStateRows || []) qById[r.query_id] = r;
  const sByKey = {};
  for (const r of sourceStateRows || []) sByKey[r.source_key] = r;

  const drift = [];
  for (const row of scorecards.query_scorecard || []) {
    const persisted = (qById[row.query_id] && qById[row.query_id].health_status) || null;
    const latest = row.latest_health_status || null;
    if (persisted != null && latest != null && persisted !== latest) {
      drift.push({
        scope: 'query',
        key: row.query_id,
        persisted_health_status: persisted,
        computed_health_status: latest,
      });
    }
  }
  for (const row of scorecards.source_scorecard || []) {
    const persisted = (sByKey[row.source_key] && sByKey[row.source_key].health_status) || null;
    const latest = row.latest_health_status || null;
    if (persisted != null && latest != null && persisted !== latest) {
      drift.push({
        scope: 'source',
        key: row.source_key,
        persisted_health_status: persisted,
        computed_health_status: latest,
      });
    }
  }
  return {
    rows: drift.slice(0, 80),
    count: drift.length,
    note: 'Persisted DB state vs freshly computed scorecard (until next guardrail tick applies updates).',
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function buildValidationModeReport(supabase) {
  const since7 = sinceIso(24 * 7);
  const since30 = sinceIso(24 * 30);

  const [
    outcomesRes,
    feedbackRes,
    guardrailRes,
    queryStateRes,
    sourceStateRes,
  ] = await Promise.all([
    supabase
      .from('lead_engine_events')
      .select('metadata_json, lead_id, created_at')
      .eq('event_type', LEAD_OUTCOME_EVENT)
      .gte('created_at', since30)
      .order('created_at', { ascending: false })
      .limit(12000),
    supabase
      .from('lead_engine_events')
      .select('metadata_json, created_at')
      .eq('event_type', LEAD_QUALITY_FEEDBACK_EVENT)
      .gte('created_at', since30)
      .limit(8000),
    supabase
      .from('lead_engine_events')
      .select('metadata_json, message, created_at')
      .eq('event_type', EVENT_TYPES.GUARDRAIL_STATUS_CHANGED)
      .gte('created_at', since30)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase.from('lead_engine_scout_query_state').select('query_id, health_status').limit(500),
    supabase.from('lead_engine_source_guardrail_state').select('source_key, health_status').limit(100),
  ]);

  const outcomes = outcomesRes.data || [];
  const feedback = feedbackRes.data || [];
  const guardrailEvents = guardrailRes.data || [];

  let scorecards = { query_scorecard: [], source_scorecard: [], global_learning_summary: {} };
  try {
    scorecards = await computeGuardrailScorecards(supabase);
  } catch (e) {
    console.error('[validation-mode-report] scorecards', e);
  }

  const out7 = aggregateOutcomes(outcomes, since7);
  const out30 = aggregateOutcomes(outcomes, since30);

  return {
    generated_at: new Date().toISOString(),
    validation_mode: true,
    windows: { utc_hours_7d: 168, utc_hours_30d: 720 },
    outcomes: {
      hours_168: out7,
      hours_720: out30,
    },
    hot_lead_usefulness: {
      hours_168: aggregateHotUsefulness(feedback, since7),
      hours_720: aggregateHotUsefulness(feedback, since30),
    },
    guardrail_transitions: {
      hours_168: aggregateGuardrailTransitions(guardrailEvents, since7),
      hours_720: aggregateGuardrailTransitions(guardrailEvents, since30),
    },
    recovery_playbook: recoveryPlaybookStats(scorecards),
    guardrail_drift: guardrailDrift(scorecards, queryStateRes.data || [], sourceStateRes.data || []),
    scorecard_learning_snapshot: scorecards.global_learning_summary || {},
  };
}

module.exports = { buildValidationModeReport, sinceIso };
