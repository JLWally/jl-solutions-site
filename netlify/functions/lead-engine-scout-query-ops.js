/**
 * Operator API: list scout queries (strategy + state + overrides), PATCH operational overrides,
 * POST run one query (manual trigger, respects daily guardrails).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const {
  listScoutQueriesForOperations,
  fetchOperationalByQueryIds,
  getMergedActiveGooglePlaceQueries,
  maxPausedIso,
} = require('./lib/lead-engine-scout-query-strategy');
const { loadAutomationPolicy } = require('./lib/lead-engine-automation-policy');
const { runConfiguredScoutIngest, isScoutGooglePlacesConfigured } = require('./lib/lead-engine-scout-router');
const {
  newCorrelationId,
  utcMinuteBucketIso,
  beginIdempotentRun,
  markRunRunning,
  finishRunSuccess,
  finishRunFailure,
} = require('./lib/lead-engine-worker-runtime');

exports.handler = async (event) => {
  const headers = withCors('GET, PATCH, POST, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Database not configured' }) };
  }

  if (event.httpMethod === 'GET') {
    const list = await listScoutQueriesForOperations(supabase);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...list }) };
  }

  if (event.httpMethod === 'PATCH') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const queryId = body.query_id && String(body.query_id).trim();
    if (!queryId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'query_id required' }) };
    }
    const row = {
      query_id: queryId,
      updated_at: new Date().toISOString(),
    };
    if ('enabled_override' in body) {
      if (body.enabled_override === null) row.enabled_override = null;
      else row.enabled_override = !!body.enabled_override;
    }
    if ('priority_override' in body) {
      if (body.priority_override === null) row.priority_override = null;
      else {
        const n = parseInt(String(body.priority_override), 10);
        if (!Number.isFinite(n)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'priority_override invalid' }) };
        }
        row.priority_override = Math.min(1000, Math.max(-100, n));
      }
    }
    if ('cooldown_seconds_override' in body) {
      if (body.cooldown_seconds_override === null) row.cooldown_seconds_override = null;
      else {
        const n = parseInt(String(body.cooldown_seconds_override), 10);
        if (!Number.isFinite(n) || n < 60) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'cooldown_seconds_override must be >= 60 or null' }),
          };
        }
        row.cooldown_seconds_override = Math.min(86400 * 7, n);
      }
    }
    if ('paused_until' in body) {
      if (body.paused_until === null || body.paused_until === '') row.paused_until = null;
      else {
        const t = new Date(String(body.paused_until));
        if (Number.isNaN(t.getTime())) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'paused_until invalid' }) };
        }
        row.paused_until = t.toISOString();
      }
    }

    const { error } = await supabase.from('lead_engine_scout_query_operational').upsert(row, {
      onConflict: 'query_id',
    });
    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
    const list = await listScoutQueriesForOperations(supabase);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, updated_query_id: queryId, ...list }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const queryId = body.query_id && String(body.query_id).trim();
    if (!queryId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'query_id required' }) };
    }

    const cfg = isScoutGooglePlacesConfigured();
    if (!cfg.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Google Places scout not configured', details: cfg }),
      };
    }

    const merged = await getMergedActiveGooglePlaceQueries(supabase);
    const q = merged.queries.find((x) => String(x.id) === queryId);
    if (!q) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Query not found or not active after merge (check file + overrides)' }),
      };
    }

    const { data: stateRows } = await supabase
      .from('lead_engine_scout_query_state')
      .select('*')
      .eq('query_id', queryId)
      .limit(1);
    const stateRow = (stateRows && stateRows[0]) || null;
    const policy = loadAutomationPolicy();
    const gr = policy.scout_query_guardrails || {};
    const maxDay =
      gr.max_detail_calls_per_query_per_day != null && Number.isFinite(Number(gr.max_detail_calls_per_query_per_day))
        ? Number(gr.max_detail_calls_per_query_per_day)
        : 500;
    const today = new Date().toISOString().slice(0, 10);
    if (
      stateRow &&
      stateRow.detail_calls_day_utc === today &&
      (stateRow.detail_calls_count_day || 0) >= maxDay
    ) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Daily detail budget reached for this query',
          detail_calls_today: stateRow.detail_calls_count_day,
          cap: maxDay,
        }),
      };
    }

    const opById = await fetchOperationalByQueryIds(supabase, [queryId]);
    const opRow = opById[queryId] || null;
    const pauseIso = maxPausedIso(stateRow, opRow);
    if (pauseIso && new Date(pauseIso) > new Date()) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Query is paused (auto-guardrail or operator pause)',
          paused_until_effective: pauseIso,
        }),
      };
    }

    const correlationId = newCorrelationId();
    const minuteBucket = utcMinuteBucketIso();
    const scoutIdem = `scout:manual_scout:${queryId}:${minuteBucket}`;
    const scoutBegin = await beginIdempotentRun(supabase, {
      workerName: 'scout_google_places',
      idempotencyKey: scoutIdem,
      trigger: 'http',
      correlationId,
      inputSummary: { manual_query: queryId, minute_bucket: minuteBucket },
    });

    if (scoutBegin.replay && scoutBegin.run && scoutBegin.run.status === 'succeeded') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'idempotent_replay',
          run_id: scoutBegin.runId,
        }),
      };
    }

    const scoutRunId = scoutBegin.runId;
    await markRunRunning(supabase, scoutRunId);
    const statesById = {};
    if (stateRow) statesById[queryId] = stateRow;

    const pick = {
      eligible: q,
      statesById,
      operationalById: { ...merged.operationalById, ...opById },
    };

    try {
      const { workerName, result: scoutResult, selected_query_id } = await runConfiguredScoutIngest(
        { supabase, correlationId, runId: scoutRunId },
        pick
      );
      const scoutPayload = { ...scoutResult, manual_trigger: true, query_id: selected_query_id };
      await finishRunSuccess(supabase, scoutRunId, scoutPayload);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, run_id: scoutRunId, ...scoutPayload }) };
    } catch (e) {
      await finishRunFailure(supabase, scoutRunId, e, { retryCount: 0, maxRetries: 3 });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, run_id: scoutRunId, error: e.message || String(e) }),
      };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
