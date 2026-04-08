'use strict';

const crypto = require('crypto');

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} params
 * @param {string} params.workerName
 * @param {string|null} params.idempotencyKey
 * @param {string} params.trigger
 * @param {string} params.correlationId
 * @param {string|null} [params.leadId]
 * @param {string|null} [params.prospectId]
 * @param {object|null} [params.inputSummary]
 */
async function beginIdempotentRun(supabase, params) {
  const {
    workerName,
    idempotencyKey,
    trigger,
    correlationId,
    leadId,
    prospectId,
    inputSummary,
  } = params;

  if (idempotencyKey) {
    const { data: won, error: exErr } = await supabase
      .from('lead_engine_worker_runs')
      .select(
        'id, correlation_id, worker_name, status, result_summary, error_message, finished_at, retry_count, max_retries'
      )
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'succeeded')
      .maybeSingle();
    if (exErr) throw new Error(exErr.message || 'idempotency lookup failed');
    if (won) {
      return { replay: true, run: won, runId: won.id };
    }
    const { data: running } = await supabase
      .from('lead_engine_worker_runs')
      .select('id, status, started_at')
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (running && running.started_at) {
      const ageMs = Date.now() - new Date(running.started_at).getTime();
      if (ageMs < 20 * 60 * 1000) {
        return { replay: true, run: running, runId: running.id, note: 'already_running' };
      }
    }
  }

  const insertRow = {
    worker_name: workerName,
    idempotency_key: idempotencyKey,
    trigger: trigger || 'schedule',
    correlation_id: correlationId,
    status: 'queued',
    lead_id: leadId || null,
    prospect_id: prospectId || null,
    input_summary: inputSummary || null,
  };

  const { data: inserted, error: insErr } = await supabase
    .from('lead_engine_worker_runs')
    .insert(insertRow)
    .select('id, correlation_id, worker_name, status')
    .single();

  if (insErr) {
    if (insErr.code === '23505' && idempotencyKey) {
      const { data: race } = await supabase
        .from('lead_engine_worker_runs')
        .select('id, status, result_summary, error_message')
        .eq('idempotency_key', idempotencyKey)
        .eq('status', 'succeeded')
        .maybeSingle();
      if (race) {
        return { replay: true, run: race, runId: race.id };
      }
    }
    throw new Error(insErr.message || 'worker run insert failed');
  }

  return { replay: false, run: inserted, runId: inserted.id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function markRunRunning(supabase, runId) {
  const now = new Date().toISOString();
  await supabase
    .from('lead_engine_worker_runs')
    .update({ status: 'running', started_at: now })
    .eq('id', runId);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function appendWorkerEvent(supabase, { runId, correlationId, level, eventType, message, payload }) {
  await supabase.from('lead_engine_worker_events').insert({
    run_id: runId,
    correlation_id: correlationId,
    level: level || 'info',
    event_type: eventType,
    message: message || null,
    payload: payload && typeof payload === 'object' ? payload : null,
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function finishRunSuccess(supabase, runId, resultSummary) {
  const now = new Date().toISOString();
  await supabase
    .from('lead_engine_worker_runs')
    .update({
      status: 'succeeded',
      finished_at: now,
      result_summary: resultSummary || null,
      error_message: null,
    })
    .eq('id', runId);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function finishRunFailure(supabase, runId, err, options) {
  const now = new Date().toISOString();
  const msg = err && err.message ? String(err.message) : String(err || 'error');
  const retryCount = (options && options.retryCount) || 0;
  const maxRetries = (options && options.maxRetries) || 3;
  let status = 'failed';
  let deadLetterAt = null;
  if (retryCount >= maxRetries) {
    status = 'dead_letter';
    deadLetterAt = now;
  } else if (options && options.scheduleRetry) {
    status = 'retry_scheduled';
  }

  await supabase
    .from('lead_engine_worker_runs')
    .update({
      status,
      finished_at: now,
      error_message: msg.slice(0, 8000),
      retry_count: retryCount,
      max_retries: maxRetries,
      dead_letter_at: deadLetterAt,
    })
    .eq('id', runId);
}

function newCorrelationId() {
  return crypto.randomUUID();
}

function utcHourBucketIso() {
  return new Date().toISOString().slice(0, 13);
}

/** Minute bucket (UTC) for scout idempotency when split schedules run more often than hourly. */
function utcMinuteBucketIso() {
  return new Date().toISOString().slice(0, 16);
}

module.exports = {
  beginIdempotentRun,
  markRunRunning,
  appendWorkerEvent,
  finishRunSuccess,
  finishRunFailure,
  newCorrelationId,
  utcHourBucketIso,
  utcMinuteBucketIso,
};
