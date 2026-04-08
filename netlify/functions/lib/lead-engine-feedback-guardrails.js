'use strict';

const { loadAutomationPolicy } = require('./lead-engine-automation-policy');
const { LEAD_QUALITY_FEEDBACK_EVENT } = require('./lead-engine-lead-quality-feedback');
const {
  LEAD_OUTCOME_EVENT,
  isPositiveOutcome,
  isNativePipelineOutcomeMeta,
} = require('./lead-engine-outcome-events');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lead-engine-audit-log');

function num(x, d) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

function rate(count, total) {
  if (!total) return 0;
  return count / total;
}

function initCounters() {
  return {
    total_feedback: 0,
    good_lead: 0,
    bad_lead: 0,
    wrong_vertical: 0,
    wrong_offer: 0,
    duplicate_junk: 0,
    not_enough_data: 0,
  };
}

function finalizeCounters(c) {
  const t = c.total_feedback || 0;
  return {
    ...c,
    rates: {
      good_lead: rate(c.good_lead, t),
      bad_lead: rate(c.bad_lead, t),
      wrong_vertical: rate(c.wrong_vertical, t),
      wrong_offer: rate(c.wrong_offer, t),
      duplicate_junk: rate(c.duplicate_junk, t),
      not_enough_data: rate(c.not_enough_data, t),
      bad_or_duplicate: rate((c.bad_lead || 0) + (c.duplicate_junk || 0), t),
      wrong_vertical_or_offer: rate((c.wrong_vertical || 0) + (c.wrong_offer || 0), t),
    },
  };
}

function zeroYieldMeetsSample(extras, minZeroRuns) {
  const z = extras && extras.zero_yield_runs_7d != null ? num(extras.zero_yield_runs_7d, 0) : 0;
  return z >= minZeroRuns;
}

function decideStatus(metrics, policy, extras) {
  const p = (policy && policy.trust_policy_v1) || {};
  const cal = (policy && policy.calibration_v1) || {};
  const minN = num(p.minimum_feedback_events_for_enforcement, 8);
  const minZeroYieldRuns = num(cal.minimum_zero_yield_runs_for_escalation, 3);
  const warnBadDup = num(p.warning_bad_or_duplicate_rate, 0.3);
  const throttleBadDup = num(p.throttle_bad_or_duplicate_rate, 0.45);
  const pauseBadDup = num(p.pause_bad_or_duplicate_rate, 0.6);
  const warnNoData = num(p.warning_not_enough_data_rate, 0.4);
  const throttleWrong = num(p.throttle_wrong_vertical_or_offer_rate, 0.35);
  const warnZero = num(p.warning_zero_yield_runs_7d, 4);
  const throttleZero = num(p.throttle_zero_yield_runs_7d, 8);
  const pauseZero = num(p.pause_zero_yield_runs_7d, 12);

  const r = metrics.rates || {};
  const zRuns = extras && extras.zero_yield_runs_7d != null ? num(extras.zero_yield_runs_7d, 0) : 0;
  const zOk = zeroYieldMeetsSample(extras, minZeroYieldRuns);

  const ratePause =
    metrics.total_feedback >= minN && r.bad_or_duplicate >= pauseBadDup;
  const rateThrottle =
    metrics.total_feedback >= minN && (r.bad_or_duplicate >= throttleBadDup || r.wrong_vertical_or_offer >= throttleWrong);
  const rateWarn =
    metrics.total_feedback >= minN && (r.bad_or_duplicate >= warnBadDup || r.not_enough_data >= warnNoData);

  const zeroPause = zOk && zRuns >= pauseZero;
  const zeroThrottle = zOk && zRuns >= throttleZero;
  const zeroWarn = zOk && zRuns >= warnZero;

  let status = 'healthy';
  if (zeroPause || ratePause) status = 'paused';
  else if (zeroThrottle || rateThrottle) status = 'throttled';
  else if (zeroWarn || rateWarn) status = 'warning';

  const insufficient_data = metrics.total_feedback < minN;
  const reason_codes = [];
  const reasons = [];

  if (insufficient_data) {
    reason_codes.push('insufficient_feedback_sample');
    reasons.push(`feedback n=${metrics.total_feedback} (min ${minN} for rate-based enforcement)`);
  }
  if (zRuns > 0 && !zOk) {
    reason_codes.push('sparse_zero_yield_sample');
    reasons.push(`zero-yield runs ${zRuns}/7d below min ${minZeroYieldRuns} (not escalating on scout yield alone)`);
  }
  if (metrics.total_feedback >= minN && r.bad_or_duplicate >= warnBadDup) {
    reason_codes.push('bad_or_duplicate_rate');
    reasons.push(`bad+dup rate ${(r.bad_or_duplicate * 100).toFixed(1)}%`);
  }
  if (metrics.total_feedback >= minN && r.wrong_vertical_or_offer >= throttleWrong && status !== 'healthy') {
    reason_codes.push('wrong_vertical_or_offer_rate');
    reasons.push(`wrong vertical/offer ${(r.wrong_vertical_or_offer * 100).toFixed(1)}%`);
  }
  if (metrics.total_feedback >= minN && r.not_enough_data >= warnNoData) {
    reason_codes.push('not_enough_data_rate');
    reasons.push(`not-enough-data ${(r.not_enough_data * 100).toFixed(1)}%`);
  }
  if (zeroWarn) {
    reason_codes.push('zero_yield_runs');
    reasons.push(`zero-yield runs ${zRuns}/7d`);
  }
  if (!reasons.length) reasons.push('within trust policy thresholds');

  const status_explanation = {
    insufficient_feedback_for_rates: insufficient_data,
    min_feedback_events_for_enforcement: minN,
    feedback_events_observed: metrics.total_feedback,
    zero_yield_runs_7d: zRuns,
    min_zero_yield_runs_for_escalation: minZeroYieldRuns,
    zero_yield_escalation_active: zOk,
    applied_status: status,
    rate_gates_evaluated: {
      pause_bad_or_duplicate: ratePause,
      throttle_quality_mix: rateThrottle,
      warning_quality_mix: rateWarn,
    },
    zero_yield_gates_evaluated: {
      pause: zeroPause,
      throttle: zeroThrottle,
      warning: zeroWarn,
    },
  };

  return {
    status,
    reason_summary: reasons.join(' · '),
    reason_codes,
    insufficient_data,
    status_explanation,
  };
}

function buildRecoveryPlaybook({ scope_type, scope_key, status, status_explanation }) {
  if (!status || status === 'healthy') {
    return { actions: [], note: 'No recovery actions while healthy.' };
  }
  const sk = scope_key ? String(scope_key) : '';
  const actions = [
    {
      type: 'suggest_alternate_queries',
      detail:
        'Review scout strategy JSON for backup / lower-priority queries in the same vertical; rotate volume away from this key via lead-engine-scout-query-ops.',
      scope_type,
      scope_key: sk,
    },
    {
      type: 'rotate_backup_queries',
      detail: 'Pause or demote this query_id; enable a backup query with broader or adjacent intent to recover yield.',
      scope_type,
      scope_key: sk,
    },
    {
      type: 'lower_spend_budgets',
      detail:
        'Temporarily reduce scout detail calls and per-tick caps (automation-policy budgets + source throttle_factor already applied on throttle).',
      scout_detail_calls_suggested_factor: status === 'paused' ? 0.35 : status === 'throttled' ? 0.65 : 0.85,
    },
    {
      type: 'route_enrichment_emphasis',
      detail:
        'Prefer prospects in alternate_enrichment_needed / weak_web_presence / no_website branches for enrichment ticks to improve downstream quality.',
    },
    {
      type: 'mark_operator_review',
      detail:
        'Spot-check recent leads tied to this query/source in hot leads and validation report; add feedback to tighten ICP before re-expanding send.',
      scope_type,
      scope_key: sk,
    },
  ];
  if (status_explanation && status_explanation.insufficient_feedback_for_rates) {
    actions.push({
      type: 'collect_more_feedback',
      detail:
        'Rate-based signals are suppressed until minimum feedback sample is met; prioritize labeled review on a small cohort from this slice.',
    });
  }
  return { actions, generated_at: new Date().toISOString() };
}

function hoursAgoIso(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

async function fetchActiveOverrides(supabase) {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('lead_engine_guardrail_overrides')
    .select('*')
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  const byKey = {};
  for (const r of data || []) byKey[`${r.scope_type}:${r.scope_key}`] = r;
  return byKey;
}

function applyOverride(statusObj, override) {
  if (!override || !override.forced_status) return statusObj;
  return {
    ...statusObj,
    status: String(override.forced_status),
    reason_summary: `operator override: ${override.reason || 'forced status'}`,
    reason_codes: ['operator_override'],
    status_explanation: {
      ...(statusObj.status_explanation || {}),
      operator_override: true,
    },
    override: {
      forced_status: override.forced_status,
      reason: override.reason || null,
      expires_at: override.expires_at || null,
      actor: override.actor || null,
    },
  };
}

async function computeGuardrailScorecards(supabase) {
  const policy = loadAutomationPolicy();
  const windowHours = num(policy.trust_policy_v1 && policy.trust_policy_v1.rolling_feedback_window_hours, 168);
  const sinceIso = hoursAgoIso(windowHours);
  const since7d = hoursAgoIso(168);
  const overridesByKey = await fetchActiveOverrides(supabase);

  const [feedbackRes, scoutRunsRes, queryStateRes, srcStateRes, prospectRes, outcomesRes, draftsRes] = await Promise.all([
    supabase
      .from('lead_engine_events')
      .select('lead_id, metadata_json, created_at')
      .eq('event_type', LEAD_QUALITY_FEEDBACK_EVENT)
      .gte('created_at', sinceIso)
      .limit(8000),
    supabase
      .from('lead_engine_worker_runs')
      .select('worker_name, status, result_summary, created_at, finished_at')
      .in('worker_name', ['scout_google_places', 'scout_mvp_json'])
      .gte('created_at', since7d)
      .limit(2000),
    supabase.from('lead_engine_scout_query_state').select('*').limit(500),
    supabase.from('lead_engine_source_guardrail_state').select('*').limit(100),
    supabase
      .from('lead_engine_prospects')
      .select('source_key, status, raw_payload, created_at, updated_at')
      .gte('created_at', since7d)
      .limit(10000),
    supabase
      .from('lead_engine_events')
      .select('metadata_json, created_at')
      .eq('event_type', LEAD_OUTCOME_EVENT)
      .gte('created_at', since7d)
      .limit(5000),
    supabase
      .from('lead_engine_events')
      .select('metadata_json, created_at')
      .eq('event_type', 'draft_generated')
      .gte('created_at', since7d)
      .limit(5000),
  ]);

  const feedbackRows = feedbackRes.data || [];
  const scoutRuns = scoutRunsRes.data || [];
  const queryStateRows = queryStateRes.data || [];
  const sourceStateRows = srcStateRes.data || [];
  const prospects = prospectRes.data || [];
  const outcomes = outcomesRes.data || [];
  const drafts = draftsRes.data || [];

  const queryMetrics = {};
  const sourceMetrics = {};
  const ensureQuery = (id) => {
    if (!queryMetrics[id]) queryMetrics[id] = initCounters();
    return queryMetrics[id];
  };
  const ensureSource = (k) => {
    if (!sourceMetrics[k]) sourceMetrics[k] = initCounters();
    return sourceMetrics[k];
  };

  for (const ev of feedbackRows) {
    const m = ev.metadata_json && typeof ev.metadata_json === 'object' ? ev.metadata_json : {};
    const code = m.feedback_code ? String(m.feedback_code) : '';
    const src = m.lead_source ? String(m.lead_source) : 'unknown';
    const qid = m.scout_query_id ? String(m.scout_query_id) : null;
    const s = ensureSource(src);
    s.total_feedback += 1;
    if (typeof s[code] === 'number') s[code] += 1;
    if (qid) {
      const q = ensureQuery(qid);
      q.total_feedback += 1;
      if (typeof q[code] === 'number') q[code] += 1;
    }
  }

  const zeroYieldByQuery = {};
  const dupByQuery = {};
  const dupNByQuery = {};
  for (const r of scoutRuns) {
    const rs = typeof r.result_summary === 'string' ? tryJson(r.result_summary) : r.result_summary;
    if (!rs || typeof rs !== 'object') continue;
    const qid = rs.query_id ? String(rs.query_id) : null;
    const source = rs.source || (r.worker_name === 'scout_google_places' ? 'scout_google_places' : 'scout_mvp_json');
    ensureSource(source);
    if (qid) ensureQuery(qid);

    const attempted = num(rs.details_attempted, 0);
    const ins = num(rs.inserted_raw, 0) + num(rs.inserted_branch, 0);
    if (qid && attempted > 0 && ins === 0) zeroYieldByQuery[qid] = (zeroYieldByQuery[qid] || 0) + 1;
    if (qid && rs.duplicate_ratio != null && Number.isFinite(Number(rs.duplicate_ratio))) {
      dupByQuery[qid] = (dupByQuery[qid] || 0) + Number(rs.duplicate_ratio);
      dupNByQuery[qid] = (dupNByQuery[qid] || 0) + 1;
    }
  }

  const prospectsBySource = {};
  const promotedBySource = {};
  const blockedBySource = {};
  const byQueryProspects = {};
  const byQueryPromoted = {};
  const byQueryBlocked = {};
  for (const p of prospects) {
    const sk = p.source_key || 'unknown';
    prospectsBySource[sk] = (prospectsBySource[sk] || 0) + 1;
    if (p.status === 'promoted') promotedBySource[sk] = (promotedBySource[sk] || 0) + 1;
    if (p.status === 'blocked') blockedBySource[sk] = (blockedBySource[sk] || 0) + 1;
    const rp = p.raw_payload && typeof p.raw_payload === 'object' ? p.raw_payload : {};
    const qid = rp.query_id ? String(rp.query_id) : null;
    if (qid) {
      byQueryProspects[qid] = (byQueryProspects[qid] || 0) + 1;
      if (p.status === 'promoted') byQueryPromoted[qid] = (byQueryPromoted[qid] || 0) + 1;
      if (p.status === 'blocked') byQueryBlocked[qid] = (byQueryBlocked[qid] || 0) + 1;
    }
  }

  const outcomeBySource = {};
  const outcomeByQuery = {};
  const countOutcome = (bag, key, code) => {
    if (!bag[key]) bag[key] = {};
    bag[key][code] = (bag[key][code] || 0) + 1;
  };
  for (const o of outcomes) {
    const m = o.metadata_json && typeof o.metadata_json === 'object' ? o.metadata_json : {};
    const code = m.outcome_code ? String(m.outcome_code) : 'unknown';
    const src = m.lead_source ? String(m.lead_source) : 'unknown';
    const qid = m.scout_query_id ? String(m.scout_query_id) : null;
    countOutcome(outcomeBySource, src, code);
    if (qid) countOutcome(outcomeByQuery, qid, code);
  }

  const positiveOutcomes = outcomes.filter((o) => {
    const m = o.metadata_json && typeof o.metadata_json === 'object' ? o.metadata_json : {};
    return isPositiveOutcome(m.outcome_code ? String(m.outcome_code) : '');
  }).length;
  let outcomes_native_7d = 0;
  let outcomes_manual_7d = 0;
  const outcomes_native_by_code = {};
  const outcomes_manual_by_code = {};
  for (const o of outcomes) {
    const m = o.metadata_json && typeof o.metadata_json === 'object' ? o.metadata_json : {};
    const code = m.outcome_code ? String(m.outcome_code) : 'unknown';
    if (isNativePipelineOutcomeMeta(m)) {
      outcomes_native_7d += 1;
      outcomes_native_by_code[code] = (outcomes_native_by_code[code] || 0) + 1;
    } else {
      outcomes_manual_7d += 1;
      outcomes_manual_by_code[code] = (outcomes_manual_by_code[code] || 0) + 1;
    }
  }
  const draftsCount = drafts.length;

  const queryStateById = {};
  for (const q of queryStateRows) queryStateById[q.query_id] = q;
  const sourceStateByKey = {};
  for (const s of sourceStateRows) sourceStateByKey[s.source_key] = s;

  const queryKeys = new Set([...Object.keys(queryMetrics), ...Object.keys(byQueryProspects), ...Object.keys(queryStateById)]);
  const sourceKeys = new Set([...Object.keys(sourceMetrics), ...Object.keys(prospectsBySource), ...Object.keys(sourceStateByKey)]);

  const queryScorecard = [];
  for (const qid of queryKeys) {
    const m = finalizeCounters(queryMetrics[qid] || initCounters());
    const extras = { zero_yield_runs_7d: zeroYieldByQuery[qid] || 0 };
    let statusObj = decideStatus(m, policy, extras);
    statusObj = applyOverride(statusObj, overridesByKey[`query:${qid}`]);
    const recovery_playbook = buildRecoveryPlaybook({
      scope_type: 'query',
      scope_key: qid,
      status: statusObj.status,
      status_explanation: statusObj.status_explanation,
    });
    const st = queryStateById[qid] || {};
    queryScorecard.push({
      query_id: qid,
      prospects_found_7d: byQueryProspects[qid] || 0,
      promoted_7d: byQueryPromoted[qid] || 0,
      blocked_7d: byQueryBlocked[qid] || 0,
      duplicate_ratio_7d: dupNByQuery[qid] ? dupByQuery[qid] / dupNByQuery[qid] : null,
      zero_yield_runs_7d: extras.zero_yield_runs_7d,
      feedback: m,
      outcomes_7d: outcomeByQuery[qid] || {},
      latest_health_status: statusObj.status,
      latest_health_reason: statusObj.reason_summary,
      latest_health_reason_codes: statusObj.reason_codes || [],
      insufficient_data: statusObj.insufficient_data,
      status_explanation: statusObj.status_explanation || null,
      recovery_playbook,
      override: statusObj.override || null,
      persisted_health_status: st.health_status || null,
      paused_until: st.paused_until || null,
    });
  }

  const sourceScorecard = [];
  for (const sk of sourceKeys) {
    const m = finalizeCounters(sourceMetrics[sk] || initCounters());
    let zeroRuns = 0;
    for (const q of queryScorecard) {
      if (q.query_id && String(q.query_id).includes(sk.replace('scout_', ''))) zeroRuns += q.zero_yield_runs_7d || 0;
    }
    let statusObj = decideStatus(m, policy, { zero_yield_runs_7d: zeroRuns });
    statusObj = applyOverride(statusObj, overridesByKey[`source:${sk}`]);
    const recovery_playbook = buildRecoveryPlaybook({
      scope_type: 'source',
      scope_key: sk,
      status: statusObj.status,
      status_explanation: statusObj.status_explanation,
    });
    const st = sourceStateByKey[sk] || {};
    sourceScorecard.push({
      source_key: sk,
      prospects_found_7d: prospectsBySource[sk] || 0,
      promoted_7d: promotedBySource[sk] || 0,
      blocked_7d: blockedBySource[sk] || 0,
      feedback: m,
      outcomes_7d: outcomeBySource[sk] || {},
      latest_health_status: statusObj.status,
      latest_health_reason: statusObj.reason_summary,
      latest_health_reason_codes: statusObj.reason_codes || [],
      insufficient_data: statusObj.insufficient_data,
      status_explanation: statusObj.status_explanation || null,
      recovery_playbook,
      override: statusObj.override || null,
      paused_until: st.paused_until || null,
      throttle_factor: st.throttle_factor || null,
    });
  }

  const draftsWithoutPositiveRatio = draftsCount > 0 ? Math.max(0, (draftsCount - positiveOutcomes) / draftsCount) : 0;
  const p = policy.trust_policy_v1 || {};
  const draftsWarnThreshold = num(p.warn_drafts_without_positive_outcome_ratio, 0.85);

  return {
    generated_at: new Date().toISOString(),
    window_hours: windowHours,
    query_scorecard: queryScorecard.sort((a, b) => b.prospects_found_7d - a.prospects_found_7d).slice(0, 120),
    source_scorecard: sourceScorecard.sort((a, b) => b.prospects_found_7d - a.prospects_found_7d),
    global_learning_summary: {
      drafts_generated_7d: draftsCount,
      positive_outcomes_7d: positiveOutcomes,
      drafts_without_positive_outcome_ratio_7d: draftsWithoutPositiveRatio,
      drafts_warning: draftsWithoutPositiveRatio >= draftsWarnThreshold,
      outcomes_total_7d: outcomes.length,
      outcomes_native_7d,
      outcomes_manual_7d,
      outcomes_native_by_code_7d: outcomes_native_by_code,
      outcomes_manual_by_code_7d: outcomes_manual_by_code,
    },
  };
}

async function applyFeedbackDrivenGuardrails(supabase, actor) {
  const score = await computeGuardrailScorecards(supabase);
  const now = new Date();
  const policy = loadAutomationPolicy();
  const pauseHours = num(policy.trust_policy_v1 && policy.trust_policy_v1.pause_duration_hours, 6);
  const pauseUntil = new Date(now.getTime() + pauseHours * 3600000).toISOString();

  for (const q of score.query_scorecard) {
    const { data: prevQ } = await supabase
      .from('lead_engine_scout_query_state')
      .select('health_status')
      .eq('query_id', q.query_id)
      .maybeSingle();
    const patch = {
      query_id: q.query_id,
      health_status: q.latest_health_status,
      health_reason_summary: q.latest_health_reason,
      feedback_metrics: q.feedback,
      updated_at: new Date().toISOString(),
    };
    if (q.latest_health_status === 'paused') patch.paused_until = pauseUntil;
    if (q.override && q.override.forced_status === 'healthy') patch.paused_until = null;
    await supabase.from('lead_engine_scout_query_state').upsert(patch, { onConflict: 'query_id' });
    const prevStatus = prevQ && prevQ.health_status != null ? String(prevQ.health_status) : null;
    const nextStatus = String(q.latest_health_status || '');
    const shouldLog = prevStatus !== nextStatus && !(prevStatus === null && nextStatus === 'healthy');
    if (shouldLog) {
      await logLeadEngineEvent(supabase, {
        event_type: EVENT_TYPES.GUARDRAIL_STATUS_CHANGED,
        actor: actor || 'automation',
        message: `query ${q.query_id}: ${prevStatus || 'new'} → ${nextStatus}`,
        metadata_json: {
          scope: 'query',
          scope_key: q.query_id,
          from: prevStatus,
          to: nextStatus,
          reason_summary: q.latest_health_reason || null,
        },
      });
    }
  }

  for (const s of score.source_scorecard) {
    const { data: prevS } = await supabase
      .from('lead_engine_source_guardrail_state')
      .select('health_status')
      .eq('source_key', s.source_key)
      .maybeSingle();
    const patch = {
      source_key: s.source_key,
      health_status: s.latest_health_status,
      reason_summary: s.latest_health_reason,
      feedback_metrics: s.feedback,
      updated_at: new Date().toISOString(),
      throttle_factor: s.latest_health_status === 'throttled' ? 0.5 : 1,
    };
    if (s.latest_health_status === 'paused') patch.paused_until = pauseUntil;
    if (s.override && s.override.forced_status === 'healthy') patch.paused_until = null;
    await supabase.from('lead_engine_source_guardrail_state').upsert(patch, { onConflict: 'source_key' });
    const prevStatus = prevS && prevS.health_status != null ? String(prevS.health_status) : null;
    const nextStatus = String(s.latest_health_status || '');
    const shouldLogS = prevStatus !== nextStatus && !(prevStatus === null && nextStatus === 'healthy');
    if (shouldLogS) {
      await logLeadEngineEvent(supabase, {
        event_type: EVENT_TYPES.GUARDRAIL_STATUS_CHANGED,
        actor: actor || 'automation',
        message: `source ${s.source_key}: ${prevStatus || 'new'} → ${nextStatus}`,
        metadata_json: {
          scope: 'source',
          scope_key: s.source_key,
          from: prevStatus,
          to: nextStatus,
          reason_summary: s.latest_health_reason || null,
        },
      });
    }
  }

  return {
    ok: true,
    actor: actor || 'automation',
    applied_at: new Date().toISOString(),
    source_states: score.source_scorecard.length,
    query_states: score.query_scorecard.length,
    global_learning_summary: score.global_learning_summary,
  };
}

async function getSourceGuardrailState(supabase, sourceKey) {
  const { data } = await supabase
    .from('lead_engine_source_guardrail_state')
    .select('*')
    .eq('source_key', String(sourceKey))
    .maybeSingle();
  return data || null;
}

function tryJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

module.exports = {
  computeGuardrailScorecards,
  applyFeedbackDrivenGuardrails,
  getSourceGuardrailState,
  decideStatus,
  buildRecoveryPlaybook,
};
