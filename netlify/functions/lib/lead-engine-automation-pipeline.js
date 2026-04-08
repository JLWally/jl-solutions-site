'use strict';

const { isLeadEngineOpenAiAllowed } = require('./lead-engine-config');
const { envVarFromB64 } = require('./runtime-process-env');
const { runAnalyzeForLead } = require('./lead-engine-analyze-run');
const { runScoreForLead } = require('./lead-engine-score-run');
const { runDraftForLead } = require('./lead-engine-draft-run');
const { runLeadEngineDemoGenerate } = require('./lead-engine-demo-generate');
const { loadAutomationPolicy } = require('./lead-engine-automation-policy');
const {
  appendWorkerEvent,
  finishRunSuccess,
  finishRunFailure,
  markRunRunning,
} = require('./lead-engine-worker-runtime');

const ACTOR = 'automation';

function hasOpenAiKey() {
  return !!envVarFromB64('T1BFTkFJX0FQSV9LRVk=');
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} leadId
 * @param {object} netlifyEvent
 * @param {string} correlationId
 */
async function runQualifiedLeadPipeline({ supabase, leadId, netlifyEvent, correlationId }) {
  const policy = loadAutomationPolicy();
  const allowSend = !!(policy && policy.allow_auto_send);
  if (allowSend) {
    console.warn('[automation-pipeline] allow_auto_send is true in policy — still no auto-send in code (MVP).');
  }

  const steps = [];

  const analyzeOut = await runAnalyzeForLead(supabase, leadId, ACTOR);
  steps.push({ step: 'analyze', ok: analyzeOut.ok, code: analyzeOut.code || null });
  if (!analyzeOut.ok) {
    return { ok: false, steps, error: analyzeOut.error, code: analyzeOut.code };
  }

  const openAiAllowed = isLeadEngineOpenAiAllowed() && hasOpenAiKey();
  if (!openAiAllowed) {
    return {
      ok: true,
      steps,
      skipped: 'openai_disabled',
      message: 'Analyze done; score/draft/demo skipped (OpenAI disabled or key missing).',
    };
  }

  const scoreOut = await runScoreForLead(supabase, leadId, ACTOR);
  steps.push({ step: 'score', ok: scoreOut.ok, code: scoreOut.code || null });
  if (!scoreOut.ok) {
    return { ok: false, steps, error: scoreOut.error, code: scoreOut.code };
  }

  const fitScore =
    scoreOut.value && scoreOut.value.scores && scoreOut.value.scores.fit_score != null
      ? Number(scoreOut.value.scores.fit_score)
      : null;

  const demoMin =
    policy &&
    policy.pipeline &&
    policy.pipeline.demo_when_lead_score_at_least != null
      ? Number(policy.pipeline.demo_when_lead_score_at_least)
      : 55;

  let demoOut = { skipped: true };
  if (fitScore != null && !Number.isNaN(fitScore) && fitScore >= demoMin) {
    const { data: leadPeek } = await supabase
      .from('lead_engine_leads')
      .select('demo_slug')
      .eq('id', leadId)
      .maybeSingle();
    if (!leadPeek || !leadPeek.demo_slug) {
      demoOut = await runLeadEngineDemoGenerate({
        supabase,
        leadId,
        event: netlifyEvent,
        actor: ACTOR,
      });
      steps.push({
        step: 'demo',
        ok: demoOut.ok,
        code: demoOut.code || null,
      });
      if (!demoOut.ok) {
        return { ok: false, steps, error: demoOut.error, code: demoOut.code };
      }
    } else {
      steps.push({ step: 'demo', ok: true, skipped: 'already_has_demo_slug' });
    }
  } else {
    steps.push({
      step: 'demo',
      skipped: true,
      reason: 'below_threshold',
      fit_score: fitScore,
      threshold: demoMin,
    });
  }

  const draftOut = await runDraftForLead(supabase, leadId, 'email', ACTOR);
  steps.push({ step: 'draft', ok: draftOut.ok, code: draftOut.code || null });
  if (!draftOut.ok) {
    return { ok: false, steps, error: draftOut.error, code: draftOut.code };
  }

  return { ok: true, steps, fit_score: fitScore };
}

/**
 * Run pipeline for leads with automation_pipeline_status = pending (bounded).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} netlifyEvent
 * @param {string} correlationId
 */
function pipelineBatchLimit(policy) {
  const p = policy && policy.pipeline && policy.pipeline.max_leads_per_tick;
  const b = policy && policy.budgets && policy.budgets.pipeline_max_leads_per_tick;
  const fromP = p != null && Number.isFinite(Number(p)) ? Number(p) : 5;
  const fromB = b != null && Number.isFinite(Number(b)) ? Number(b) : 20;
  return Math.min(20, Math.max(1, Math.min(fromP, fromB)));
}

async function processPendingAutomationLeads(supabase, netlifyEvent, correlationId) {
  const policy = loadAutomationPolicy();
  const limit = pipelineBatchLimit(policy);

  const { data: pending, error } = await supabase
    .from('lead_engine_leads')
    .select('id, automation_correlation_id')
    .eq('automation_pipeline_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const results = [];
  for (const row of pending || []) {
    const leadId = row.id;
    const { data: runInsert, error: runInsErr } = await supabase
      .from('lead_engine_worker_runs')
      .insert({
        worker_name: 'pipeline_analyze_score_draft',
        trigger: 'automation_tick',
        correlation_id: correlationId,
        lead_id: leadId,
        status: 'queued',
        input_summary: { phase: 'pipeline' },
      })
      .select('id')
      .single();
    if (runInsErr) throw new Error(runInsErr.message);
    const runId = runInsert.id;

    await markRunRunning(supabase, runId);
    await appendWorkerEvent(supabase, {
      runId,
      correlationId,
      level: 'info',
      eventType: 'pipeline_started',
      message: 'Pipeline started for lead',
      payload: { lead_id: leadId },
    });

    await supabase
      .from('lead_engine_leads')
      .update({
        automation_pipeline_status: 'running',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .eq('automation_pipeline_status', 'pending');

    try {
      const out = await runQualifiedLeadPipeline({
        supabase,
        leadId,
        netlifyEvent,
        correlationId,
      });

      let finalStatus = 'completed';
      if (out.skipped === 'openai_disabled') {
        finalStatus = 'skipped_openai';
      }

      await supabase
        .from('lead_engine_leads')
        .update({
          automation_pipeline_status: out.ok ? finalStatus : 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (out.ok) {
        await finishRunSuccess(supabase, runId, { lead_id: leadId, steps: out.steps, skipped: out.skipped || null });
        await appendWorkerEvent(supabase, {
          runId,
          correlationId,
          level: 'info',
          eventType: 'pipeline_finished',
          message: out.skipped ? String(out.skipped) : 'Pipeline completed',
          payload: { lead_id: leadId, steps: out.steps },
        });
        results.push({ leadId, ok: true, steps: out.steps, skipped: out.skipped });
      } else {
        await finishRunFailure(supabase, runId, new Error(out.error || 'pipeline_failed'), {
          retryCount: 0,
          maxRetries: 3,
        });
        await appendWorkerEvent(supabase, {
          runId,
          correlationId,
          level: 'error',
          eventType: 'pipeline_failed',
          message: out.error || 'failed',
          payload: { lead_id: leadId, code: out.code, steps: out.steps },
        });
        results.push({ leadId, ok: false, error: out.error, code: out.code });
      }
    } catch (e) {
      await supabase
        .from('lead_engine_leads')
        .update({
          automation_pipeline_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
      await finishRunFailure(supabase, runId, e, { retryCount: 0, maxRetries: 3 });
      await appendWorkerEvent(supabase, {
        runId,
        correlationId,
        level: 'error',
        eventType: 'pipeline_exception',
        message: e.message || String(e),
        payload: { lead_id: leadId },
      });
      results.push({ leadId, ok: false, error: e.message || String(e) });
    }
  }

  return { processed: (pending || []).length, results };
}

module.exports = {
  runQualifiedLeadPipeline,
  processPendingAutomationLeads,
};
