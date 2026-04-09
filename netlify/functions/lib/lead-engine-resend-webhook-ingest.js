'use strict';

const { Webhook } = require('svix');
const { logNativeLeadOutcome, NATIVE_SOURCES } = require('./lead-engine-native-outcome-log');
const {
  parseEmailFromResendAddress,
  leadIdsFromResendTagObject,
  findLeadIdByContactEmail,
} = require('./lead-engine-pipeline-resolve-lead');

function headerGet(headers, name) {
  const want = String(name).toLowerCase();
  const h = headers && typeof headers === 'object' ? headers : {};
  for (const k of Object.keys(h)) {
    if (String(k).toLowerCase() === want) return h[k];
  }
  return '';
}

/**
 * @param {string} rawBody
 * @param {Record<string, string>} headers
 */
function verifyResendSvixPayload(rawBody, headers) {
  const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    return { ok: false, error: new Error('RESEND_WEBHOOK_SECRET is not set') };
  }
  const id = headerGet(headers, 'svix-id');
  const timestamp = headerGet(headers, 'svix-timestamp');
  const signature = headerGet(headers, 'svix-signature');
  if (!id || !timestamp || !signature) {
    return { ok: false, error: new Error('Missing Svix webhook headers') };
  }
  try {
    const wh = new Webhook(secret);
    const json = wh.verify(rawBody, {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    });
    return { ok: true, event: json };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} event verified Resend webhook JSON
 */
async function ingestVerifiedResendEvent(supabase, event) {
  const type = event && event.type ? String(event.type) : '';
  const data = event && event.data && typeof event.data === 'object' ? event.data : {};
  const tags = leadIdsFromResendTagObject(data.tags);
  let leadId = tags.leadId;
  const outreachId = tags.outreachId;
  const toList = Array.isArray(data.to) ? data.to : [];
  const primaryTo = toList[0] ? String(toList[0]).trim() : null;

  if (!leadId && primaryTo) {
    leadId = await findLeadIdByContactEmail(supabase, primaryTo);
  }
  if (!leadId && type === 'email.received') {
    const replyFrom = parseEmailFromResendAddress(data.from);
    if (replyFrom) leadId = await findLeadIdByContactEmail(supabase, replyFrom);
  }

  if (!leadId) {
    return {
      ok: false,
      skip: true,
      reason: 'no_lead_match',
      hint: 'Add Resend tags lead_engine_lead_id (and optional lead_engine_outreach_id) on send, or ensure contact_email matches recipient.',
      type,
    };
  }

  const evidence = {
    resend_event_type: type,
    email_id: data.email_id != null ? String(data.email_id).slice(0, 80) : null,
    bounce_type: data.bounce_type != null ? String(data.bounce_type).slice(0, 32) : null,
  };

  let outcome_code = null;
  let context = 'resend_webhook';

  switch (type) {
    case 'email.delivered':
      outcome_code = 'email_delivered';
      break;
    case 'email.bounced':
    case 'email.failed':
      outcome_code = 'bounced';
      break;
    case 'email.complained':
      outcome_code = 'spam_complaint';
      break;
    case 'email.suppressed':
      outcome_code = 'unsubscribed';
      context = 'resend_suppressed';
      break;
    case 'email.received':
      outcome_code = 'replied';
      context = 'inbound_reply_metadata';
      break;
    default:
      return { ok: true, skip: true, reason: 'event_type_ignored', type };
  }

  const deliveryKey =
    outcome_code === 'email_delivered' && data.email_id != null ? String(data.email_id).trim() : null;

  const logged = await logNativeLeadOutcome(supabase, {
    leadId,
    outreachId,
    outcome_code,
    native_source: NATIVE_SOURCES.RESEND_WEBHOOK,
    context,
    evidence,
    delivery_idempotency_key: deliveryKey,
    actor: 'resend_webhook',
  });

  if (!logged.ok) {
    return { ok: false, error: logged.error, type, leadId };
  }
  return {
    ok: true,
    leadId,
    outcome_code,
    type,
    idempotentReplay: Boolean(logged.idempotentReplay),
    delivery_idempotency_key: logged.delivery_idempotency_key || null,
  };
}

module.exports = {
  verifyResendSvixPayload,
  ingestVerifiedResendEvent,
  headerGet,
};
