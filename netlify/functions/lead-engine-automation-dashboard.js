/**
 * Operator command center data: worker runs, failures, funnel, source health, pipeline retries.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { listScoutQueriesForOperations } = require('./lib/lead-engine-scout-query-strategy');
const { computeGuardrailScorecards } = require('./lib/lead-engine-feedback-guardrails');
const { isLikelySchemaDriftError, readinessErrorPayload } = require('./lib/lead-engine-readiness');

const EVENT_DRAFT = 'draft_generated';

function startOfUtcDayIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)).toISOString();
}

exports.handler = async (event) => {
  const headers = withCors('GET, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Database not configured' }),
    };
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dayStart = startOfUtcDayIso();

  const [
    latestRuns,
    failedRuns,
    retryQueue,
    workerEvents,
    hotLeads,
    prospectRows,
    promotedToday,
    blockedToday,
    prospectsNewToday,
    draftEventsToday,
    failedPipelineLeads,
    scoutRunsRecent,
    scoutQueryState,
    enrichEvents,
    enrichBranchCounts,
  ] = await Promise.all([
    supabase
      .from('lead_engine_worker_runs')
      .select(
        'id, correlation_id, worker_name, status, trigger, created_at, started_at, finished_at, error_message, retry_count, max_retries, result_summary'
      )
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('lead_engine_worker_runs')
      .select(
        'id, correlation_id, worker_name, status, finished_at, error_message, retry_count, max_retries, result_summary'
      )
      .in('status', ['failed', 'dead_letter'])
      .order('finished_at', { ascending: false, nullsFirst: false })
      .limit(25),
    supabase
      .from('lead_engine_worker_runs')
      .select('id, worker_name, status, finished_at, error_message, retry_count, max_retries, created_at')
      .or('status.eq.failed,status.eq.retry_scheduled')
      .gte('created_at', since7d)
      .order('finished_at', { ascending: false, nullsFirst: false })
      .limit(30),
    supabase
      .from('lead_engine_worker_events')
      .select('id, run_id, correlation_id, level, event_type, message, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('lead_engine_leads')
      .select(
        'id, company_name, website_url, lead_score, source, status, automation_pipeline_status, updated_at, created_at'
      )
      .gte('lead_score', 70)
      .order('lead_score', { ascending: false })
      .limit(40),
    supabase.from('lead_engine_prospects').select('source_key, status, created_at, updated_at').limit(3000),
    supabase
      .from('lead_engine_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'promoted')
      .gte('updated_at', dayStart),
    supabase
      .from('lead_engine_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'blocked')
      .gte('updated_at', dayStart),
    supabase
      .from('lead_engine_prospects')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayStart),
    supabase
      .from('lead_engine_events')
      .select('lead_id')
      .eq('event_type', EVENT_DRAFT)
      .gte('created_at', dayStart)
      .limit(800),
    supabase
      .from('lead_engine_leads')
      .select(
        'id, company_name, website_url, source, automation_pipeline_status, automation_correlation_id, updated_at, created_at'
      )
      .eq('automation_pipeline_status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(25),
    supabase
      .from('lead_engine_worker_runs')
      .select('worker_name, status, finished_at, result_summary, error_message, created_at')
      .in('worker_name', ['scout_google_places', 'scout_mvp_json'])
      .order('created_at', { ascending: false })
      .limit(24),
    supabase.from('lead_engine_scout_query_state').select('*').order('updated_at', { ascending: false }).limit(40),
    supabase
      .from('lead_engine_prospect_enrichment_events')
      .select('id, prospect_id, branch, outcome, created_at, detail')
      .order('created_at', { ascending: false })
      .limit(25),
    Promise.all([
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'no_website'),
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'weak_web_presence'),
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'alternate_enrichment_needed'),
    ]),
  ]);

  function dataOrEmpty(r) {
    return r && !r.error && r.data ? r.data : [];
  }
  function countOrZero(r) {
    if (!r || r.error) return 0;
    return r.count || 0;
  }

  const labeledResults = [
    ['latestRuns', latestRuns],
    ['failedRuns', failedRuns],
    ['retryQueue', retryQueue],
    ['workerEvents', workerEvents],
    ['hotLeads', hotLeads],
    ['prospectRows', prospectRows],
    ['promotedToday', promotedToday],
    ['blockedToday', blockedToday],
    ['prospectsNewToday', prospectsNewToday],
    ['draftEventsToday', draftEventsToday],
    ['failedPipelineLeads', failedPipelineLeads],
    ['scoutRunsRecent', scoutRunsRecent],
    ['scoutQueryState', scoutQueryState],
    ['enrichEvents', enrichEvents],
  ];
  const queryErrors = [];
  for (const [name, r] of labeledResults) {
    if (r && r.error && r.error.message) {
      queryErrors.push({ section: name, message: r.error.message });
    }
  }
  const ecArr = enrichBranchCounts || [];
  const branchLabels = ['no_website', 'weak_web_presence', 'alternate_enrichment_needed'];
  for (let i = 0; i < branchLabels.length; i++) {
    const r = ecArr[i];
    if (r && r.error && r.error.message) {
      queryErrors.push({ section: 'enrichBranch.' + branchLabels[i], message: r.error.message });
    }
  }

  let readinessBlock = { ok: true, readiness: { ok: true } };
  if (queryErrors.length) {
    const schemaHit = queryErrors.find((e) => isLikelySchemaDriftError(e.message));
    readinessBlock = readinessErrorPayload((schemaHit || queryErrors[0]).message);
    readinessBlock.readiness.failed_sections = queryErrors.map((e) => e.section);
  }

  const prospects = dataOrEmpty(prospectRows);
  const bySource = {};
  for (const pr of prospects) {
    const sk = pr.source_key || 'unknown';
    if (!bySource[sk]) {
      bySource[sk] = {
        raw: 0,
        qualified: 0,
        blocked: 0,
        promoted: 0,
        duplicate: 0,
        no_website: 0,
        weak_web_presence: 0,
        alternate_enrichment_needed: 0,
      };
    }
    const st = pr.status;
    if (typeof bySource[sk][st] === 'number') bySource[sk][st] += 1;
  }

  const runs24 = dataOrEmpty(latestRuns).filter((r) => r.created_at >= since24h);
  const workerHealth = {};
  for (const r of runs24) {
    const w = r.worker_name || 'unknown';
    if (!workerHealth[w]) workerHealth[w] = { succeeded: 0, failed: 0, running: 0, other: 0 };
    if (r.status === 'succeeded') workerHealth[w].succeeded += 1;
    else if (r.status === 'failed' || r.status === 'dead_letter') workerHealth[w].failed += 1;
    else if (r.status === 'running') workerHealth[w].running += 1;
    else workerHealth[w].other += 1;
  }

  const hotRaw = dataOrEmpty(hotLeads);
  const hotLeadsToday = hotRaw.filter((l) => {
    const u = l.updated_at && String(l.updated_at) >= dayStart;
    const c = l.created_at && String(l.created_at) >= dayStart;
    return u || c;
  });

  const draftRows = dataOrEmpty(draftEventsToday);
  const draftedLeadIds = new Set();
  for (const row of draftRows) {
    if (row.lead_id) draftedLeadIds.add(row.lead_id);
  }

  const sourceHealth = {};
  for (const r of dataOrEmpty(scoutRunsRecent)) {
    const w = r.worker_name;
    if (!sourceHealth[w]) {
      sourceHealth[w] = {
        last_status: null,
        last_finished_at: null,
        last_error: null,
        last_result_summary: null,
        recent_runs: [],
      };
    }
    if (sourceHealth[w].recent_runs.length < 6) {
      sourceHealth[w].recent_runs.push({
        status: r.status,
        finished_at: r.finished_at,
        error_message: r.error_message,
        result_summary: r.result_summary,
        created_at: r.created_at,
      });
    }
  }
  for (const w of Object.keys(sourceHealth)) {
    const first = sourceHealth[w].recent_runs[0];
    if (first) {
      sourceHealth[w].last_status = first.status;
      sourceHealth[w].last_finished_at = first.finished_at;
      sourceHealth[w].last_error = first.error_message;
      sourceHealth[w].last_result_summary = first.result_summary;
    }
  }

  const promotedCount = countOrZero(promotedToday);

  let scoutQueriesList = { strategy_version: null, queries: [] };
  try {
    scoutQueriesList = await listScoutQueriesForOperations(supabase);
  } catch (e) {
    console.error('[automation-dashboard] scout queries list', e);
  }

  let guardrailScorecards = { query_scorecard: [], source_scorecard: [], global_learning_summary: {} };
  try {
    guardrailScorecards = await computeGuardrailScorecards(supabase);
  } catch (e) {
    console.error('[automation-dashboard] guardrail scorecards', e);
  }

  function safeCount(r) {
    if (!r || r.error) return 0;
    return r.count || 0;
  }
  const ec = enrichBranchCounts || [];
  const enrichment_branch_counts = {
    no_website: safeCount(ec[0]),
    weak_web_presence: safeCount(ec[1]),
    alternate_enrichment_needed: safeCount(ec[2]),
  };

  const body = {
    ...readinessBlock,
    generated_at: new Date().toISOString(),
    day_start_utc: dayStart,
    worker_health_last_24h: workerHealth,
    latest_runs: dataOrEmpty(latestRuns),
    failed_runs: dataOrEmpty(failedRuns),
    retry_queue: dataOrEmpty(retryQueue),
    worker_events: dataOrEmpty(workerEvents),
    hot_leads_today: hotLeadsToday.slice(0, 20),
    prospect_counts_by_source: bySource,
    source_health: sourceHealth,
    failed_pipeline_leads: dataOrEmpty(failedPipelineLeads),
    stats_today_utc: {
      prospects_created_any_status: countOrZero(prospectsNewToday),
      icp_promoted_to_leads: promotedCount,
      qualified_today_note:
        'In this pipeline, ICP pass immediately promotes to a lead; promoted count equals qualified-through.',
      icp_blocked_prospects: countOrZero(blockedToday),
      drafted_leads_distinct: draftedLeadIds.size,
    },
    passed_vs_blocked_today_utc: {
      promoted_prospects_touched_today: promotedCount,
      blocked_prospects_touched_today: countOrZero(blockedToday),
    },
    scout_query_state: dataOrEmpty(scoutQueryState),
    scout_queries: scoutQueriesList.queries || [],
    scout_query_strategy_version: scoutQueriesList.strategy_version || null,
    guardrail_query_scorecard: guardrailScorecards.query_scorecard || [],
    guardrail_source_scorecard: guardrailScorecards.source_scorecard || [],
    guardrail_learning_summary: guardrailScorecards.global_learning_summary || {},
    enrichment_recent_events: dataOrEmpty(enrichEvents),
    enrichment_branch_counts,
    scout_query_ops_endpoint: 'lead-engine-scout-query-ops',
    guardrail_ops_endpoint: 'lead-engine-guardrail-ops',
    lead_outcome_endpoint: 'lead-engine-lead-outcome',
    pipeline_native_signal_endpoint: 'lead-engine-pipeline-native-signal',
    validation_mode_endpoint: 'lead-engine-validation-mode',
    hot_leads_ranked_endpoint: 'lead-engine-hot-leads',
  };

  return { statusCode: 200, headers, body: JSON.stringify(body) };
};
