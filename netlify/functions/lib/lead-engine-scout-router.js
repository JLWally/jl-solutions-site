'use strict';

const { runScoutMvpIngest, SOURCE_KEY: MVP_SOURCE } = require('./lead-engine-scout-mvp');
const {
  isScoutGooglePlacesConfigured,
  runGooglePlacesScoutIngest,
  SOURCE_KEY: GOOGLE_SOURCE,
} = require('./lead-engine-scout-google-places');
const {
  getMergedActiveGooglePlaceQueries,
  selectNextEligibleQuery,
  persistQueryState,
  globalBudgets,
} = require('./lead-engine-scout-query-strategy');
const { loadAutomationPolicy } = require('./lead-engine-automation-policy');

function mergeScoutBudgets(strategy, policy) {
  const gb = globalBudgets(strategy);
  const pb = policy && policy.budgets;
  if (pb && pb.scout_max_detail_calls_per_tick != null) {
    const cap = parseInt(String(pb.scout_max_detail_calls_per_tick), 10);
    if (Number.isFinite(cap) && cap > 0) {
      gb.max_detail_calls_per_tick = Math.min(gb.max_detail_calls_per_tick, cap);
    }
  }
  return gb;
}

function buildGuardrailPatchAfterScoutRun(result, prevState, policy) {
  const today = new Date().toISOString().slice(0, 10);
  let dayCount = (prevState && prevState.detail_calls_count_day) || 0;
  if (!prevState || (prevState.detail_calls_day_utc || '') !== today) dayCount = 0;
  dayCount += result.details_attempted || 0;

  let consec = (prevState && prevState.consecutive_zero_yield_runs) || 0;
  const anyIns = (result.inserted_raw || 0) + (result.inserted_branch || 0) > 0;
  const attempted = (result.details_attempted || 0) > 0;
  if (anyIns) consec = 0;
  else if (attempted) consec += 1;

  const gr = policy.scout_query_guardrails || {};
  const maxDay =
    gr.max_detail_calls_per_query_per_day != null && Number.isFinite(Number(gr.max_detail_calls_per_query_per_day))
      ? Number(gr.max_detail_calls_per_query_per_day)
      : 500;
  const pauseAfter =
    gr.pause_after_consecutive_zero_yield_runs != null &&
    Number.isFinite(Number(gr.pause_after_consecutive_zero_yield_runs))
      ? Number(gr.pause_after_consecutive_zero_yield_runs)
      : 12;
  const pauseHours =
    gr.pause_duration_hours != null && Number.isFinite(Number(gr.pause_duration_hours))
      ? Number(gr.pause_duration_hours)
      : 2;
  const dupPause =
    gr.max_duplicate_ratio_for_auto_pause != null && Number.isFinite(Number(gr.max_duplicate_ratio_for_auto_pause))
      ? Number(gr.max_duplicate_ratio_for_auto_pause)
      : 0.97;

  let pauseEnd = null;
  const bumpPause = () => {
    const end = Date.now() + pauseHours * 3600000;
    const iso = new Date(end).toISOString();
    if (!pauseEnd || new Date(iso) > new Date(pauseEnd)) pauseEnd = iso;
  };

  if (dayCount >= maxDay) bumpPause();
  if (consec >= pauseAfter) bumpPause();
  if (
    result.duplicate_ratio != null &&
    result.duplicate_ratio >= dupPause &&
    (result.details_attempted || 0) >= 5
  ) {
    bumpPause();
  }

  const existingPause =
    prevState && prevState.paused_until && new Date(prevState.paused_until) > new Date()
      ? prevState.paused_until
      : null;
  let pausedUntil = pauseEnd;
  if (existingPause && (!pausedUntil || new Date(existingPause) > new Date(pausedUntil))) {
    pausedUntil = existingPause;
  }

  const patch = {
    consecutive_zero_yield_runs: consec,
    detail_calls_day_utc: today,
    detail_calls_count_day: dayCount,
  };
  if (pausedUntil) patch.paused_until = pausedUntil;
  return patch;
}

/**
 * @param {object} ctx — supabase, correlationId, runId
 * @param {object|null} googleScoutPick — from tick: { eligible, statesById, budgets, operationalById? } or null
 */
async function runConfiguredScoutIngest(ctx, googleScoutPick) {
  const g = isScoutGooglePlacesConfigured();
  if (g.ok) {
    const policy = loadAutomationPolicy();
    const merged = await getMergedActiveGooglePlaceQueries(ctx.supabase);
    const { strategy, queries, operationalById } = merged;

    let pick = googleScoutPick;
    if (!pick || !pick.eligible) {
      const sel = await selectNextEligibleQuery(ctx.supabase, queries, strategy, operationalById);
      if (!sel.eligible) {
        return {
          workerName: 'scout_google_places',
          result: {
            skipped: true,
            reason: 'no_eligible_query',
            queries_configured: queries.length,
          },
        };
      }
      pick = {
        eligible: sel.eligible,
        statesById: sel.statesById || {},
        operationalById: sel.operationalById || {},
        budgets: mergeScoutBudgets(strategy, policy),
      };
    } else {
      pick = {
        ...pick,
        budgets: mergeScoutBudgets(strategy, policy),
      };
    }

    const stateRow = pick.statesById[String(pick.eligible.id)] || null;
    const result = await runGooglePlacesScoutIngest({
      ...ctx,
      googleQuery: pick.eligible,
      googleQueryStateRow: stateRow,
      globalBudgets: pick.budgets,
    });

    const guardPatch = buildGuardrailPatchAfterScoutRun(result, stateRow, policy);
    await persistQueryState(ctx.supabase, pick.eligible.id, {
      last_run_at: new Date().toISOString(),
      last_next_page_token: result.next_page_token_saved || null,
      last_result_summary: {
        inserted_raw: result.inserted_raw,
        inserted_branch: result.inserted_branch,
        details_attempted: result.details_attempted,
        duplicate_ratio: result.duplicate_ratio,
        query_id: result.query_id,
        query_label: result.query_label,
        text_search_status: result.text_search_status,
        skipped_duplicate_heavy_abort: result.skipped_duplicate_heavy_abort,
      },
      ...guardPatch,
    });

    return { workerName: 'scout_google_places', result, selected_query_id: pick.eligible.id };
  }
  const result = await runScoutMvpIngest(ctx);
  return { workerName: 'scout_mvp_json', result };
}

/**
 * Pick the next Google query for idempotency keys (no ingest). Returns null if none eligible.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function pickGoogleScoutQueryForTick(supabase) {
  const g = isScoutGooglePlacesConfigured();
  if (!g.ok) return null;
  const policy = loadAutomationPolicy();
  const { strategy, queries, operationalById } = await getMergedActiveGooglePlaceQueries(supabase);
  const sel = await selectNextEligibleQuery(supabase, queries, strategy, operationalById);
  if (!sel.eligible) return null;
  return {
    eligible: sel.eligible,
    statesById: sel.statesById || {},
    operationalById: sel.operationalById || {},
    budgets: mergeScoutBudgets(strategy, policy),
  };
}

module.exports = {
  runConfiguredScoutIngest,
  isScoutGooglePlacesConfigured,
  pickGoogleScoutQueryForTick,
  buildGuardrailPatchAfterScoutRun,
  MVP_SOURCE,
  GOOGLE_SOURCE,
};
