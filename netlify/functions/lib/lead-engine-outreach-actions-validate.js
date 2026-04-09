/**
 * POST body validation for lead-engine-approve and lead-engine-send (Slice F).
 */

const { UUID_RE } = require('./lead-engine-analyze-validate');

function validateApproveBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }
  const leadId = body.leadId != null ? String(body.leadId).trim() : '';
  if (!leadId) {
    return { ok: false, errors: ['leadId is required'] };
  }
  if (!UUID_RE.test(leadId)) {
    return { ok: false, errors: ['leadId must be a valid UUID'] };
  }
  let outreachId = null;
  if (body.outreachId != null && String(body.outreachId).trim() !== '') {
    const oid = String(body.outreachId).trim();
    if (!UUID_RE.test(oid)) {
      return { ok: false, errors: ['outreachId must be a valid UUID'] };
    }
    outreachId = oid;
  }
  return { ok: true, value: { leadId, outreachId } };
}

function validateSendBody(body) {
  return validateApproveBody(body);
}

const RECONCILE_ACTIONS = new Set(['mark_sent', 'release_send_lock', 'mark_failed']);

/**
 * Slice I+: operator recovery after RECONCILE_REQUIRED or stuck send lock (no CRM).
 * outreachId is required so the exact row is explicit.
 */
function validateReconcileBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }
  const leadId = body.leadId != null ? String(body.leadId).trim() : '';
  if (!leadId) {
    return { ok: false, errors: ['leadId is required'] };
  }
  if (!UUID_RE.test(leadId)) {
    return { ok: false, errors: ['leadId must be a valid UUID'] };
  }
  const outreachId = body.outreachId != null ? String(body.outreachId).trim() : '';
  if (!outreachId) {
    return { ok: false, errors: ['outreachId is required'] };
  }
  if (!UUID_RE.test(outreachId)) {
    return { ok: false, errors: ['outreachId must be a valid UUID'] };
  }
  const action = body.action != null ? String(body.action).trim() : '';
  if (!action || !RECONCILE_ACTIONS.has(action)) {
    return {
      ok: false,
      errors: ['action must be "mark_sent", "release_send_lock", or "mark_failed"'],
    };
  }
  if (action === 'mark_failed' && body.acknowledgeMarkFailed !== true) {
    return {
      ok: false,
      errors: ['mark_failed requires acknowledgeMarkFailed: true'],
    };
  }
  let sentAt = null;
  if (body.sentAt != null && String(body.sentAt).trim() !== '') {
    const raw = String(body.sentAt).trim();
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms)) {
      return { ok: false, errors: ['sentAt must be a valid ISO 8601 date-time string'] };
    }
    sentAt = new Date(ms).toISOString();
  }
  let resendMessageId = null;
  if (body.resendMessageId != null && String(body.resendMessageId).trim() !== '') {
    resendMessageId = String(body.resendMessageId).trim().slice(0, 120);
  }
  return { ok: true, value: { leadId, outreachId, action, sentAt, resendMessageId } };
}

module.exports = {
  validateApproveBody,
  validateSendBody,
  validateReconcileBody,
};
