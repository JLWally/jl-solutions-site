'use strict';

const {
  isLeadEngineEnabled,
  getLeadEngineAutomationSecret,
} = require('./lead-engine-config');
const {
  beginIdempotentRun,
  markRunRunning,
  appendWorkerEvent,
  finishRunSuccess,
  finishRunFailure,
  newCorrelationId,
  utcHourBucketIso,
  utcMinuteBucketIso,
} = require('./lead-engine-worker-runtime');
const {
  runConfiguredScoutIngest,
  isScoutGooglePlacesConfigured,
  pickGoogleScoutQueryForTick,
} = require('./lead-engine-scout-router');
const { runQualifierIcpPass } = require('./lead-engine-qualifier-run');
const { processPendingAutomationLeads } = require('./lead-engine-automation-pipeline');
const { runProspectBranchEnrichmentPass } = require('./lead-engine-prospect-enrichment-run');
const {
  applyFeedbackDrivenGuardrails,
  getSourceGuardrailState,
} = require('./lead-engine-feedback-guardrails');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function isNetlifyScheduledInvocation(event) {
  if (!event) return false;
  const h = event.headers || {};
  const x = String(h['x-netlify-event'] || h['x-scheduled-function'] || '').toLowerCase();
  if (x.includes('schedule')) return true;
  try {
    const b = event.body ? JSON.parse(event.body) : null;
    if (b && typeof b.next_run === 'string') return true;
  } catch (_) {
    /* ignore */
  }
  return false;
}

function authorizeAutomationRequest(event) {
  if (isNetlifyScheduledInvocation(event)) return { ok: true, trigger: 'schedule' };
  const secret = getLeadEngineAutomationSecret();
  if (!secret) return { ok: false, error: 'LEAD_ENGINE_AUTOMATION_SECRET is not set' };
  const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const bearer = String(auth).startsWith('Bearer ') ? String(auth).slice(7).trim() : '';
  const headerSecret =
    (event.headers && (event.headers['x-automation-secret'] || event.headers['X-Automation-Secret'])) || '';
  const provided = bearer || String(headerSecret).trim();
  if (provided !== secret) return { ok: false, error: 'Unauthorized' };
  return { ok: true, trigger: 'http' };
}

function parsePhasesFromBody(event) {
  try {
    const b = JSON.parse(event.body || '{}');
    if (Array.isArray(b.phases) && b.phases.length) {
      return b.phases.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    }
  } catch (_) {
    /* ignore */
  }
  return null;
}

function resolvePhases(event, forced) {
  if (forced && Array.isArray(forced) && forced.length) {
    return forced.map((x) => String(x).trim().toLowerCase());
  }
  const fromBody = parsePhasesFromBody(event);
  if (fromBody) return fromBody;
  const envPh = process.env.AUTOMATION_TICK_PHASES && String(process.env.AUTOMATION_TICK_PHASES).trim();
  if (envPh) {
    return envPh
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  if (isNetlifyScheduledInvocation(event)) {
    return ['scout', 'enrichment', 'qualifier', 'pipeline'];
  }
  return ['scout', 'enrichment', 'qualifier', 'pipeline'];
}

/**
 * @param {*} event — Netlify event
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ phases?: string[] }} [options]
 */
async function runAutomationTickPhases(event, supabase, options) {
  const phases = resolvePhases(event, options && options.phases);
  const trigger = (options && options.trigger) || 'schedule';
  const tickProfile =
    (options && options.automation_tick_profile) ||
    (phases.includes('scout') && !phases.includes('qualifier')
      ? 'scout_only'
      : phases.includes('qualifier') && !phases.includes('scout')
        ? 'downstream'
        : 'full');

  const correlationId = newCorrelationId();
  const hour = utcHourBucketIso();
  const minuteBucket = utcMinuteBucketIso();
  const out = {
    correlation_id: correlationId,
    trigger,
    phases,
    automation_tick_profile: tickProfile,
    scout: null,
    enrichment: null,
    qualifier: null,
    pipeline: null,
    budgets_note:
      'Scout detail budget: strategy global + automation-policy budgets.scout_max_detail_calls_per_tick. Qualifier/pipeline caps in policy.pipeline + budgets.*',
  };

  if (phases.includes('scout')) {
    let sourceGuardrailState = null;
    try {
      await applyFeedbackDrivenGuardrails(supabase, 'automation_tick');
      sourceGuardrailState = await getSourceGuardrailState(supabase, 'scout_google_places');
    } catch (e) {
      console.error('[automation-tick] guardrails apply failed', e);
    }

    if (sourceGuardrailState && sourceGuardrailState.health_status === 'paused') {
      out.scout = {
        skipped: true,
        reason: 'source_paused_by_guardrail',
        source: 'scout_google_places',
        health_status: sourceGuardrailState.health_status,
        health_reason: sourceGuardrailState.reason_summary || null,
        paused_until: sourceGuardrailState.paused_until || null,
      };
    } else {
    let googlePick = null;
    let scoutIdem = `scout:scout_mvp_json:${minuteBucket}`;
    let scoutWorkerName = 'scout_mvp_json';
    let scoutIdleNoQuery = false;

    if (isScoutGooglePlacesConfigured().ok) {
      scoutWorkerName = 'scout_google_places';
      googlePick = await pickGoogleScoutQueryForTick(supabase);
      if (googlePick && googlePick.eligible) {
        scoutIdem = `scout:scout_google_places:${minuteBucket}:${googlePick.eligible.id}`;
        if (sourceGuardrailState && sourceGuardrailState.health_status === 'throttled') {
          const factor = Number(sourceGuardrailState.throttle_factor) || 0.5;
          if (googlePick.budgets && Number.isFinite(Number(googlePick.budgets.max_detail_calls_per_tick))) {
            googlePick.budgets.max_detail_calls_per_tick = Math.max(
              4,
              Math.floor(Number(googlePick.budgets.max_detail_calls_per_tick) * factor)
            );
          }
        }
      } else {
        scoutIdleNoQuery = true;
      }
    }

    if (scoutIdleNoQuery) {
      out.scout = {
        skipped: true,
        reason: 'no_eligible_scout_query',
        worker: scoutWorkerName,
        automation_tick_profile: tickProfile,
      };
    } else {
      const scoutBegin = await beginIdempotentRun(supabase, {
        workerName: scoutWorkerName,
        idempotencyKey: scoutIdem,
        trigger,
        correlationId,
        inputSummary: {
          automation_tick_profile: tickProfile,
          minute_bucket: minuteBucket,
          scout: scoutWorkerName,
          query_id: googlePick && googlePick.eligible && googlePick.eligible.id,
        },
      });

      if (scoutBegin.replay && scoutBegin.run && scoutBegin.run.status === 'succeeded') {
        out.scout = { skipped: true, reason: 'idempotent_replay', run_id: scoutBegin.runId };
      } else {
        const scoutRunId = scoutBegin.runId;
        await markRunRunning(supabase, scoutRunId);
        await appendWorkerEvent(supabase, {
          runId: scoutRunId,
          correlationId,
          level: 'info',
          eventType: 'scout_started',
          message: 'Scout ingest starting',
          payload: {
            automation_tick_profile: tickProfile,
            worker: scoutWorkerName,
            query_id: googlePick && googlePick.eligible && googlePick.eligible.id,
          },
        });
        try {
          const { workerName, result: scoutResult, selected_query_id } = await runConfiguredScoutIngest(
            {
              supabase,
              correlationId,
              runId: scoutRunId,
            },
            googlePick && googlePick.eligible ? googlePick : null
          );
          const scoutPayload = { ...scoutResult, automation_tick_profile: tickProfile, phases };
          await finishRunSuccess(supabase, scoutRunId, scoutPayload);
          await appendWorkerEvent(supabase, {
            runId: scoutRunId,
            correlationId,
            level: 'info',
            eventType: 'scout_finished',
            message: 'Scout ingest finished',
            payload: scoutPayload,
          });
          out.scout = {
            ok: true,
            run_id: scoutRunId,
            worker: workerName,
            selected_query_id,
            automation_tick_profile: tickProfile,
            ...scoutResult,
          };
        } catch (e) {
          await finishRunFailure(supabase, scoutRunId, e, { retryCount: 0, maxRetries: 3 });
          await appendWorkerEvent(supabase, {
            runId: scoutRunId,
            correlationId,
            level: 'error',
            eventType: 'scout_failed',
            message: e.message || String(e),
            payload: {},
          });
          out.scout = { ok: false, run_id: scoutRunId, error: e.message || String(e) };
        }
      }
    }}
  }

  if (phases.includes('enrichment')) {
    const enrIdem = `enrichment:branch_reconcile:${minuteBucket}`;
    const enrBegin = await beginIdempotentRun(supabase, {
      workerName: 'prospect_branch_enrichment',
      idempotencyKey: enrIdem,
      trigger,
      correlationId,
      inputSummary: { automation_tick_profile: tickProfile, minute_bucket: minuteBucket },
    });

    if (enrBegin.replay && enrBegin.run && enrBegin.run.status === 'succeeded') {
      out.enrichment = { skipped: true, reason: 'idempotent_replay', run_id: enrBegin.runId };
    } else {
      const enrRunId = enrBegin.runId;
      await markRunRunning(supabase, enrRunId);
      await appendWorkerEvent(supabase, {
        runId: enrRunId,
        correlationId,
        level: 'info',
        eventType: 'enrichment_started',
        message: 'Prospect branch enrichment starting',
        payload: { automation_tick_profile: tickProfile },
      });
      try {
        const enrResult = await runProspectBranchEnrichmentPass({
          supabase,
          correlationId,
          runId: enrRunId,
        });
        const enrPayload = { ...enrResult, automation_tick_profile: tickProfile, phases };
        await finishRunSuccess(supabase, enrRunId, enrPayload);
        out.enrichment = { ok: true, run_id: enrRunId, automation_tick_profile: tickProfile, ...enrResult };
      } catch (e) {
        await finishRunFailure(supabase, enrRunId, e, { retryCount: 0, maxRetries: 3 });
        await appendWorkerEvent(supabase, {
          runId: enrRunId,
          correlationId,
          level: 'error',
          eventType: 'enrichment_failed',
          message: e.message || String(e),
          payload: {},
        });
        out.enrichment = { ok: false, run_id: enrRunId, error: e.message || String(e) };
      }
    }
  }

  if (phases.includes('qualifier')) {
    const qualIdem = `qualifier_icp:${hour}`;
    const qualBegin = await beginIdempotentRun(supabase, {
      workerName: 'qualifier_icp',
      idempotencyKey: qualIdem,
      trigger,
      correlationId,
      inputSummary: { hour_bucket: hour, automation_tick_profile: tickProfile },
    });

    if (qualBegin.replay && qualBegin.run && qualBegin.run.status === 'succeeded') {
      out.qualifier = { skipped: true, reason: 'idempotent_replay', run_id: qualBegin.runId };
    } else {
      const qualRunId = qualBegin.runId;
      await markRunRunning(supabase, qualRunId);
      await appendWorkerEvent(supabase, {
        runId: qualRunId,
        correlationId,
        level: 'info',
        eventType: 'qualifier_started',
        message: 'ICP qualifier starting',
        payload: { automation_tick_profile: tickProfile },
      });
      try {
        const qResult = await runQualifierIcpPass({
          supabase,
          correlationId,
          runId: qualRunId,
        });
        const qualPayload = { ...qResult, automation_tick_profile: tickProfile, phases };
        await finishRunSuccess(supabase, qualRunId, qualPayload);
        out.qualifier = { ok: true, run_id: qualRunId, automation_tick_profile: tickProfile, ...qResult };
      } catch (e) {
        await finishRunFailure(supabase, qualRunId, e, { retryCount: 0, maxRetries: 3 });
        await appendWorkerEvent(supabase, {
          runId: qualRunId,
          correlationId,
          level: 'error',
          eventType: 'qualifier_failed',
          message: e.message || String(e),
          payload: {},
        });
        out.qualifier = { ok: false, run_id: qualRunId, error: e.message || String(e) };
      }
    }
  }

  if (phases.includes('pipeline')) {
    const pipe = await processPendingAutomationLeads(supabase, event, correlationId);
    out.pipeline = pipe;
  }

  return json(200, { ok: true, ...out });
}

async function automationTickHandler(event, options) {
  if (!isLeadEngineEnabled()) {
    return json(403, { error: 'Lead engine is disabled' });
  }

  const authz = authorizeAutomationRequest(event);
  if (!authz.ok) {
    return json(401, { error: authz.error || 'Unauthorized' });
  }

  const { getLeadEngineSupabase } = require('./lead-engine-supabase');
  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return json(503, { error: 'Database not configured' });
  }

  try {
    return await runAutomationTickPhases(event, supabase, {
      ...(options || {}),
      trigger: authz.trigger,
    });
  } catch (e) {
    console.error('[lead-engine-automation-tick-shared]', e);
    return json(500, {
      ok: false,
      error: e.message || String(e),
    });
  }
}

module.exports = {
  runAutomationTickPhases,
  automationTickHandler,
  resolvePhases,
  authorizeAutomationRequest,
  isNetlifyScheduledInvocation,
};
