'use strict';

const path = require('path');
const fs = require('fs');
const { loadAutomationPolicy } = require('./lead-engine-automation-policy');

const DEFAULT_STRATEGY_PATH = path.join(__dirname, 'scout-query-strategy-v1.json');

function readJsonPath(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function loadScoutQueryStrategy() {
  const envP = process.env.SCOUT_QUERY_STRATEGY_PATH && String(process.env.SCOUT_QUERY_STRATEGY_PATH).trim();
  const candidates = [];
  if (envP) {
    candidates.push(path.isAbsolute(envP) ? envP : path.join(process.cwd(), envP));
  }
  candidates.push(DEFAULT_STRATEGY_PATH);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return readJsonPath(c);
    } catch {
      /* continue */
    }
  }
  return {
    version: 'scout-query-strategy-v1',
    global_budgets: {},
    queries: [],
  };
}

function intOr(v, def) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : def;
}

function buildLegacyEnvQuery() {
  const q = process.env.SCOUT_GOOGLE_TEXT_QUERY && String(process.env.SCOUT_GOOGLE_TEXT_QUERY).trim();
  if (!q) return null;
  return {
    id: 'legacy_env',
    source: 'scout_google_places',
    label: 'Legacy SCOUT_GOOGLE_TEXT_QUERY',
    enabled: true,
    text_query: q,
    region: process.env.SCOUT_GOOGLE_REGION ? String(process.env.SCOUT_GOOGLE_REGION).trim() : 'us',
    language: process.env.SCOUT_GOOGLE_LANGUAGE ? String(process.env.SCOUT_GOOGLE_LANGUAGE).trim() : 'en',
    max_details_per_run: intOr(process.env.SCOUT_GOOGLE_MAX_DETAILS_PER_RUN, 18),
    cooldown_seconds: intOr(process.env.SCOUT_GOOGLE_COOLDOWN_SECONDS, 3600),
    priority: intOr(process.env.SCOUT_GOOGLE_PRIORITY, 5),
  };
}

function effectiveQueryEnabled(q, op) {
  if (op && op.enabled_override === false) return false;
  if (op && op.enabled_override === true) return true;
  return q.enabled !== false;
}

function effectivePriority(q, op) {
  if (op && op.priority_override != null && Number.isFinite(Number(op.priority_override))) {
    return Number(op.priority_override);
  }
  return intOr(q.priority, 0);
}

function effectiveCooldownSeconds(q, op) {
  if (op && op.cooldown_seconds_override != null && Number.isFinite(Number(op.cooldown_seconds_override))) {
    const n = Number(op.cooldown_seconds_override);
    return Math.min(86400 * 7, Math.max(60, n));
  }
  return intOr(q.cooldown_seconds, 3600);
}

function maxPausedIso(stateRow, opRow) {
  const a = stateRow && stateRow.paused_until ? String(stateRow.paused_until) : '';
  const b = opRow && opRow.paused_until ? String(opRow.paused_until) : '';
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

/**
 * Google Places queries from strategy file (file semantics only). Used for config checks without DB.
 */
function getActiveGooglePlaceQueries() {
  const strat = loadScoutQueryStrategy();
  const list = Array.isArray(strat.queries) ? strat.queries : [];
  const enabled = list.filter(
    (q) =>
      q &&
      q.enabled !== false &&
      String(q.source || '').toLowerCase() === 'scout_google_places' &&
      q.text_query &&
      String(q.text_query).trim()
  );
  if (enabled.length) return { strategy: strat, queries: enabled };
  const legacy = buildLegacyEnvQuery();
  if (legacy) return { strategy: strat, queries: [legacy] };
  return { strategy: strat, queries: [] };
}

function collectPlacesQueryCandidates(strat) {
  const list = Array.isArray(strat.queries) ? strat.queries : [];
  const placesQueries = list.filter(
    (q) =>
      q &&
      String(q.source || '').toLowerCase() === 'scout_google_places' &&
      q.text_query &&
      String(q.text_query).trim()
  );
  if (placesQueries.length) return placesQueries;
  const legacy = buildLegacyEnvQuery();
  return legacy ? [legacy] : [];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} ids
 */
async function fetchOperationalByQueryIds(supabase, ids) {
  if (!ids.length) return {};
  const { data: ops } = await supabase.from('lead_engine_scout_query_operational').select('*').in('query_id', ids);
  const byId = {};
  for (const o of ops || []) byId[o.query_id] = o;
  return byId;
}

/**
 * Active queries after merging file config + Supabase operational overrides.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function getMergedActiveGooglePlaceQueries(supabase) {
  const strat = loadScoutQueryStrategy();
  const candidates = collectPlacesQueryCandidates(strat);
  const ids = candidates.map((q) => String(q.id));
  const operationalById = await fetchOperationalByQueryIds(supabase, ids);

  const queries = [];
  for (const q of candidates) {
    const op = operationalById[String(q.id)] || null;
    if (!effectiveQueryEnabled(q, op)) continue;
    queries.push({
      ...q,
      priority: effectivePriority(q, op),
      cooldown_seconds: effectiveCooldownSeconds(q, op),
    });
  }

  return { strategy: strat, queries, operationalById };
}

function globalBudgets(strategy) {
  const g = (strategy && strategy.global_budgets) || {};
  return {
    max_detail_calls_per_tick: Math.min(60, Math.max(4, intOr(g.max_detail_calls_per_tick, 32))),
    max_text_search_pages_per_tick: Math.min(3, Math.max(1, intOr(g.max_text_search_pages_per_tick, 1))),
    duplicate_ratio_abort_pagination_threshold: (() => {
      const x = Number(g.duplicate_ratio_abort_pagination_threshold);
      if (Number.isFinite(x) && x > 0 && x <= 1) return x;
      return 0.82;
    })(),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} queries — merged active queries
 * @param {object} strategy
 * @param {Record<string, object>} [operationalById]
 */
async function selectNextEligibleQuery(supabase, queries, strategy, operationalById) {
  const policy = loadAutomationPolicy();
  const gr = policy.scout_query_guardrails || {};
  const maxDay =
    gr.max_detail_calls_per_query_per_day != null && Number.isFinite(Number(gr.max_detail_calls_per_query_per_day))
      ? Number(gr.max_detail_calls_per_query_per_day)
      : 500;

  const budgets = globalBudgets(strategy);
  if (!queries.length) return { eligible: null, statesById: {}, operationalById: operationalById || {}, budgets };

  const ids = queries.map((q) => String(q.id));
  const { data: states } = await supabase.from('lead_engine_scout_query_state').select('*').in('query_id', ids);

  const byId = {};
  for (const s of states || []) byId[s.query_id] = s;

  let opById = operationalById;
  if (!opById) {
    opById = await fetchOperationalByQueryIds(supabase, ids);
  }

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  function pausedUntilMs(id) {
    const st = byId[id];
    const op = opById[id];
    const iso = maxPausedIso(st, op);
    return iso ? new Date(iso).getTime() : 0;
  }

  const eligibleList = queries.filter((q) => {
    const id = String(q.id);
    if (pausedUntilMs(id) > now) return false;

    const st = byId[id];
    if (st && st.detail_calls_day_utc === today && (st.detail_calls_count_day || 0) >= maxDay) return false;

    const cool = intOr(q.cooldown_seconds, 3600);
    if (!st || !st.last_run_at) return true;
    const last = new Date(st.last_run_at).getTime();
    return now - last >= cool * 1000;
  });

  eligibleList.sort((a, b) => {
    const pa = intOr(a.priority, 0);
    const pb = intOr(b.priority, 0);
    if (pb !== pa) return pb - pa;
    const ta = byId[String(a.id)] && byId[String(a.id)].last_run_at
      ? new Date(byId[String(a.id)].last_run_at).getTime()
      : 0;
    const tb = byId[String(b.id)] && byId[String(b.id)].last_run_at
      ? new Date(byId[String(b.id)].last_run_at).getTime()
      : 0;
    return ta - tb;
  });

  return {
    eligible: eligibleList[0] || null,
    statesById: byId,
    operationalById: opById,
    budgets,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function persistQueryState(supabase, queryId, patch) {
  const row = {
    query_id: String(queryId),
    updated_at: new Date().toISOString(),
    ...patch,
  };
  const { error } = await supabase.from('lead_engine_scout_query_state').upsert(row, { onConflict: 'query_id' });
  if (error) console.error('[scout-query-strategy] persistQueryState', error.message);
}

/**
 * Dashboard / ops API: every file-defined Places query with effective flags and DB state.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function listScoutQueriesForOperations(supabase) {
  const strat = loadScoutQueryStrategy();
  const candidates = collectPlacesQueryCandidates(strat);
  if (!candidates.length) return { strategy_version: strat.version, queries: [] };

  const ids = candidates.map((q) => String(q.id));
  const [statesRes, opById] = await Promise.all([
    supabase.from('lead_engine_scout_query_state').select('*').in('query_id', ids),
    fetchOperationalByQueryIds(supabase, ids),
  ]);
  const byId = {};
  for (const s of statesRes.data || []) byId[s.query_id] = s;

  const today = new Date().toISOString().slice(0, 10);
  const policy = loadAutomationPolicy();
  const gr = policy.scout_query_guardrails || {};
  const maxDay =
    gr.max_detail_calls_per_query_per_day != null && Number.isFinite(Number(gr.max_detail_calls_per_query_per_day))
      ? Number(gr.max_detail_calls_per_query_per_day)
      : 500;

  const queries = candidates.map((q) => {
    const id = String(q.id);
    const st = byId[id] || null;
    const op = opById[id] || null;
    const ssum = st && st.last_result_summary;
    const dup = ssum && ssum.duplicate_ratio != null ? ssum.duplicate_ratio : null;
    const dayCount =
      st && st.detail_calls_day_utc === today ? st.detail_calls_count_day || 0 : 0;
    return {
      query_id: id,
      label: q.label || id,
      text_query: q.text_query,
      file_enabled: q.enabled !== false,
      effective_enabled: effectiveQueryEnabled(q, op),
      priority: effectivePriority(q, op),
      cooldown_seconds: effectiveCooldownSeconds(q, op),
      region: q.region,
      language: q.language,
      max_details_per_run: q.max_details_per_run,
      operational: op,
      last_run_at: st && st.last_run_at,
      last_result_summary: ssum || null,
      duplicate_ratio_last: dup,
      paused_until_effective: maxPausedIso(st, op),
      detail_calls_today: dayCount,
      detail_calls_daily_cap: maxDay,
      consecutive_zero_yield_runs: st ? st.consecutive_zero_yield_runs || 0 : 0,
    };
  });

  return { strategy_version: strat.version, queries };
}

module.exports = {
  loadScoutQueryStrategy,
  getActiveGooglePlaceQueries,
  getMergedActiveGooglePlaceQueries,
  selectNextEligibleQuery,
  persistQueryState,
  globalBudgets,
  listScoutQueriesForOperations,
  fetchOperationalByQueryIds,
  effectiveQueryEnabled,
  effectivePriority,
  effectiveCooldownSeconds,
  maxPausedIso,
  DEFAULT_STRATEGY_PATH,
};
