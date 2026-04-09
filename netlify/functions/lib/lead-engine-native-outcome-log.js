'use strict';

const { logLeadEngineEvent } = require('./lead-engine-audit-log');
const {
  LEAD_OUTCOME_EVENT,
  isValidOutcomeCode,
} = require('./lead-engine-outcome-events');
const { resolveSourceContextForLead } = require('./lead-engine-lead-quality-feedback');

const NATIVE_SOURCES = {
  UNSUBSCRIBE_LINK: 'unsubscribe_link',
  RESEND_SEND_OK: 'resend_send',
  RESEND_SEND_ERROR: 'resend_send_error',
  OPERATOR_RECONCILE_MARK_SENT: 'operator_reconcile_mark_sent',
  HUBSPOT_CRM_SYNC: 'hubspot_crm_sync',
  PIPELINE_WEBHOOK: 'pipeline_webhook',
  DEMO_OUTREACH_COMPOSER: 'demo_outreach_composer',
  RESEND_WEBHOOK: 'resend_webhook',
  HUBSPOT_PIPELINE: 'hubspot_pipeline',
  CALENDLY_PIPELINE: 'calendly_pipeline',
};

const DELIVERY_IDEM_MAX = 128;

function normalizeDeliveryIdempotencyKey(raw) {
  const s = raw != null ? String(raw).trim() : '';
  if (!s) return null;
  const safe = s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, DELIVERY_IDEM_MAX);
  return safe || null;
}

/**
 * Same Resend message id is returned from the send API as `id` and in webhooks as `email_id`.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function hasExistingEmailDeliveredIdempotency(supabase, leadId, idemKey) {
  const k = normalizeDeliveryIdempotencyKey(idemKey);
  if (!k) return false;
  const { data, error } = await supabase
    .from('lead_engine_events')
    .select('id')
    .eq('lead_id', leadId)
    .eq('event_type', LEAD_OUTCOME_EVENT)
    .contains('metadata_json', { delivery_idempotency_key: k })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[native-outcome-log] idempotency lookup failed', error.message || error);
    return false;
  }
  return Boolean(data && data.id);
}

/**
 * Structured lead_outcome row for non-manual pipeline capture (bounce, reply, CRM, etc.).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function logNativeLeadOutcome(supabase, opts) {
  const leadId = opts && opts.leadId ? String(opts.leadId).trim() : '';
  const outcome_code = opts && opts.outcome_code ? String(opts.outcome_code).trim() : '';
  const native_source = opts && opts.native_source ? String(opts.native_source).trim().slice(0, 64) : '';
  if (!leadId || !outcome_code || !native_source) {
    return { ok: false, error: new Error('leadId, outcome_code, and native_source required') };
  }
  if (!isValidOutcomeCode(outcome_code)) {
    return { ok: false, error: new Error('invalid outcome_code') };
  }

  const { data: leadRow, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select('id, company_name, source, source_place_id')
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr) return { ok: false, error: leadErr };
  if (!leadRow) return { ok: false, error: new Error('lead not found') };

  const src = await resolveSourceContextForLead(supabase, leadId);
  const actor = opts.actor != null ? String(opts.actor).slice(0, 120) : 'native_pipeline';

  const evidence = sanitizeEvidence(opts.evidence);
  const metadata = {
    outcome_code,
    version: 2,
    capture_kind: 'native_pipeline',
    native_source,
    context: (opts.context != null ? String(opts.context) : native_source).slice(0, 64),
    lead_source: src.lead_source || (leadRow.source ? String(leadRow.source) : null),
    scout_query_id: src.scout_query_id || null,
    source_place_id: src.source_place_id || (leadRow.source_place_id ? String(leadRow.source_place_id) : null),
    note: opts.note != null ? String(opts.note).slice(0, 250) : null,
    company_name_snapshot: leadRow.company_name ? String(leadRow.company_name).slice(0, 200) : null,
  };
  if (evidence) metadata.evidence = evidence;

  if (outcome_code === 'email_delivered') {
    const idem =
      normalizeDeliveryIdempotencyKey(opts.delivery_idempotency_key) ||
      (evidence && evidence.email_id != null
        ? normalizeDeliveryIdempotencyKey(evidence.email_id)
        : null) ||
      (evidence && evidence.resend_email_id != null
        ? normalizeDeliveryIdempotencyKey(evidence.resend_email_id)
        : null) ||
      (evidence && evidence.resendMessageId != null
        ? normalizeDeliveryIdempotencyKey(evidence.resendMessageId)
        : null);
    if (idem) {
      const exists = await hasExistingEmailDeliveredIdempotency(supabase, leadId, idem);
      if (exists) {
        return { ok: true, idempotentReplay: true, delivery_idempotency_key: idem };
      }
      metadata.delivery_idempotency_key = idem;
    }
  }

  return logLeadEngineEvent(supabase, {
    lead_id: leadId,
    outreach_id: opts.outreachId != null ? String(opts.outreachId).trim() : null,
    event_type: LEAD_OUTCOME_EVENT,
    actor,
    message: outcome_code,
    metadata_json: metadata,
  });
}

function sanitizeEvidence(ev) {
  if (!ev || typeof ev !== 'object' || Array.isArray(ev)) return null;
  const out = {};
  for (const [k, v] of Object.entries(ev)) {
    const key = String(k).slice(0, 64);
    if (v == null) {
      out[key] = null;
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[key] = typeof v === 'string' ? v.slice(0, 500) : v;
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      const inner = sanitizeEvidence(v);
      if (inner && Object.keys(inner).length) out[key] = inner;
    }
  }
  return Object.keys(out).length ? out : null;
}

/** Heuristic: Resend/provider errors that usually indicate hard bounces or invalid recipients. */
function looksLikeEmailHardFailure(message) {
  const m = String(message || '').toLowerCase();
  return /bounce|invalid\s*(email|recipient|address)|mailbox|undeliverable|user\s+unknown|no\s+mx|suppressed|blocked\s+recipient/.test(
    m
  );
}

module.exports = {
  NATIVE_SOURCES,
  logNativeLeadOutcome,
  looksLikeEmailHardFailure,
  normalizeDeliveryIdempotencyKey,
  hasExistingEmailDeliveredIdempotency,
};
