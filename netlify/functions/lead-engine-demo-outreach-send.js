/**
 * One-click send from /internal/outreach: Resend + CAN-SPAM footer + lead_engine_events + demo columns.
 * POST JSON: { leadId, subject, bodyPlain, to?, templateVariant? }, recipient must match lead.contact_email (normalized).
 * templateVariant: initial | followup_1 | followup_2 | shorter | direct, sets demo_followup_due_at after success.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateAnalyzeBody } = require('./lib/lead-engine-analyze-validate');
const { normalizeOptionalEmail } = require('./lib/lead-engine-ingest-validate');
const { isLeadEmailSendBlocked, classifyEmailSendBlock } = require('./lib/lead-engine-opt-out');
const { isEmailGloballySuppressed } = require('./lib/lead-engine-global-suppression');
const {
  buildOutreachEmailHtml,
  DEFAULT_REPLY_TO,
} = require('./lib/lead-engine-outreach-email');
const { getLeadEnginePublicSiteUrl } = require('./lib/lead-engine-public-site-url');
const { sendLeadEngineOutreachEmail } = require('./lib/lead-engine-resend-outreach');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const { logNativeLeadOutcome, NATIVE_SOURCES, looksLikeEmailHardFailure } = require('./lib/lead-engine-native-outcome-log');
const { envVarFromB64 } = require('./lib/runtime-process-env');
const { computeDemoFollowupDueAfterSend } = require('./lib/lead-engine-demo-followup-schedule');

const LEAD_SELECT =
  'id, contact_email, email_opted_out, outreach_unsubscribe_token, company_name';

const MAX_SUBJECT = 200;
const MAX_BODY = 50000;

function validateBody(raw) {
  let o;
  try {
    o = JSON.parse(raw || '{}');
  } catch {
    return { ok: false, errors: ['Invalid JSON'] };
  }
  const leadCheck = validateAnalyzeBody(o);
  if (!leadCheck.ok) return { ok: false, errors: leadCheck.errors };

  const subject = o.subject != null ? String(o.subject).trim() : '';
  if (!subject || subject.length > MAX_SUBJECT) {
    return { ok: false, errors: [`subject is required (max ${MAX_SUBJECT} characters)`] };
  }
  const bodyPlain = o.bodyPlain != null ? String(o.bodyPlain) : '';
  if (!bodyPlain.trim() || bodyPlain.length > MAX_BODY) {
    return { ok: false, errors: [`bodyPlain is required (max ${MAX_BODY} characters)`] };
  }
  const toRaw = o.to != null ? String(o.to).trim() : '';
  const templateVariant =
    o.templateVariant != null ? String(o.templateVariant).trim().slice(0, 64) : '';

  return {
    ok: true,
    value: {
      leadId: leadCheck.value.leadId,
      subject,
      bodyPlain,
      toRaw,
      templateVariant,
    },
  };
}

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  if (!envVarFromB64('UkVTRU5EX0FQSV9LRVk=')) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Email sending is not configured. Set RESEND_API_KEY in Netlify environment variables.',
        code: 'NO_RESEND',
      }),
    };
  }

  const physicalAddress = (envVarFromB64('TEVBRF9FTkdJTkVfUEhZU0lDQUxfQUREUkVTUw==') || '').trim();
  if (!physicalAddress) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          'Production sending is disabled until LEAD_ENGINE_PHYSICAL_ADDRESS is set (CAN-SPAM).',
        code: 'MAILING_ADDRESS_REQUIRED',
      }),
    };
  }

  const baseUrl = getLeadEnginePublicSiteUrl();
  if (!baseUrl) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          'Public site URL is not configured; cannot attach a valid unsubscribe link. Set LEAD_ENGINE_PUBLIC_SITE_URL.',
        code: 'PUBLIC_SITE_URL_REQUIRED',
      }),
    };
  }

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      }),
    };
  }

  const validated = validateBody(event.body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const { leadId, subject, bodyPlain, toRaw, templateVariant } = validated.value;

  const { data: lead, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select(LEAD_SELECT)
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr) {
    console.error('[lead-engine-demo-outreach-send] lead', leadErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load lead' }),
    };
  }

  if (!lead) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Lead not found' }),
    };
  }

  if (isLeadEmailSendBlocked(lead)) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'This lead has opted out of outreach email.',
        code: 'LEAD_OPTED_OUT',
      }),
    };
  }

  const leadEmailNorm = normalizeOptionalEmail(lead.contact_email);
  if (!leadEmailNorm.ok || !leadEmailNorm.value) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'Lead has no valid contact_email. Add one on the lead before sending.',
        code: 'MISSING_CONTACT_EMAIL',
      }),
    };
  }

  const intendedTo = toRaw ? normalizeOptionalEmail(toRaw) : leadEmailNorm;
  if (!intendedTo.ok || !intendedTo.value) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: intendedTo.error || 'Invalid to address' }),
    };
  }

  if (intendedTo.value !== leadEmailNorm.value) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error:
          'Recipient must match the lead contact email. Update the lead row first if the address changed.',
        code: 'RECIPIENT_MISMATCH',
      }),
    };
  }

  const recipient = leadEmailNorm.value;

  const globalBefore = await isEmailGloballySuppressed(supabase, recipient);
  if (globalBefore.error) {
    console.error('[lead-engine-demo-outreach-send] suppression', globalBefore.error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to verify global email suppression' }),
    };
  }
  const blockBefore = classifyEmailSendBlock({
    leadOptedOut: isLeadEmailSendBlocked(lead),
    globallySuppressed: globalBefore.suppressed,
  });
  if (blockBefore.blocked && blockBefore.code === 'GLOBAL_EMAIL_SUPPRESSED') {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'This email address is globally suppressed from outreach.',
        code: 'GLOBAL_EMAIL_SUPPRESSED',
      }),
    };
  }

  let unsubscribeUrl;
  if (lead.outreach_unsubscribe_token) {
    unsubscribeUrl = `${baseUrl}/.netlify/functions/lead-engine-unsubscribe?token=${encodeURIComponent(
      lead.outreach_unsubscribe_token
    )}`;
  }

  const { subject: htmlSubject, html } = buildOutreachEmailHtml({
    subject,
    bodyPlain,
    unsubscribeUrl,
    physicalAddress,
  });

  let resendData;
  try {
    resendData = await sendLeadEngineOutreachEmail({
      to: recipient,
      subject: htmlSubject,
      html,
      replyTo: DEFAULT_REPLY_TO,
      tags: [
        {
          name: 'lead_engine_lead_id',
          value: String(leadId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 256) || 'x',
        },
      ],
    });
  } catch (e) {
    console.error('[lead-engine-demo-outreach-send] Resend', e);
    const failIso = new Date().toISOString();
    const { error: failUpErr } = await supabase
      .from('lead_engine_leads')
      .update({
        demo_outreach_status: 'send_failed',
        demo_outreach_status_at: failIso,
        updated_at: failIso,
      })
      .eq('id', leadId);
    if (failUpErr) {
      console.error('[lead-engine-demo-outreach-send] send_failed status', failUpErr);
    }
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      event_type: EVENT_TYPES.DEMO_OUTREACH_SEND_FAILED,
      actor: g.session.username || null,
      message: e.message || 'Resend send failed',
      metadata_json: {
        recipient,
        code: e.code || 'RESEND_ERROR',
        templateVariant: templateVariant || null,
      },
    });
    const failMsg = e.message || 'Send failed';
    if (looksLikeEmailHardFailure(failMsg)) {
      await logNativeLeadOutcome(supabase, {
        leadId,
        outcome_code: 'bounced',
        native_source: NATIVE_SOURCES.DEMO_OUTREACH_COMPOSER,
        context: 'demo_send_hard_fail',
        note: failMsg.slice(0, 240),
        evidence: { provider: 'resend', templateVariant: templateVariant || null },
        actor: g.session.username ? `operator:${g.session.username}` : 'operator:demo_send',
      });
    }
    const msg =
      e.code === 'NO_RESEND'
        ? 'Email provider not configured'
        : e.message || 'Send failed';
    return {
      statusCode: e.code === 'NO_RESEND' ? 503 : 502,
      headers,
      body: JSON.stringify({
        error: 'Failed to send email',
        details: msg,
        code: 'RESEND_FAILED',
        demo_outreach_status: 'send_failed',
        demo_outreach_status_at: failIso,
      }),
    };
  }

  const resendMessageId = resendData && (resendData.id || resendData.message_id || null);

  const nowIso = new Date().toISOString();
  const nowDate = new Date(nowIso);
  const { dueAt, clearDue } = computeDemoFollowupDueAfterSend(templateVariant, nowDate);
  const followPatch = {};
  if (clearDue) {
    followPatch.demo_followup_due_at = null;
  } else if (dueAt) {
    followPatch.demo_followup_due_at = dueAt;
  }

  const { error: upErr } = await supabase
    .from('lead_engine_leads')
    .update({
      demo_outreach_status: 'sent_manual',
      demo_outreach_status_at: nowIso,
      demo_last_contacted_at: nowIso,
      updated_at: nowIso,
      ...followPatch,
    })
    .eq('id', leadId);

  if (upErr) {
    console.error('[lead-engine-demo-outreach-send] status update', upErr);
  }

  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    event_type: EVENT_TYPES.DEMO_OUTREACH_SENT,
    actor: g.session.username || null,
    message: 'Custom demo outreach sent (composer)',
    metadata_json: {
      recipient,
      resendMessageId: resendMessageId || null,
      subject: subject.slice(0, 160),
      templateVariant: templateVariant || null,
      demo_followup_due_at: clearDue ? null : dueAt || null,
    },
  });
  await logNativeLeadOutcome(supabase, {
    leadId,
    outcome_code: 'email_delivered',
    native_source: NATIVE_SOURCES.DEMO_OUTREACH_COMPOSER,
    context: 'demo_composer_send_ok',
    delivery_idempotency_key: resendMessageId || null,
    evidence: { resendMessageId: resendMessageId || null, templateVariant: templateVariant || null },
    actor: g.session.username ? `operator:${g.session.username}` : 'operator:demo_send',
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      leadId,
      recipient,
      resendMessageId: resendMessageId || null,
      demo_outreach_status: 'sent_manual',
      demo_outreach_status_at: nowIso,
      demo_last_contacted_at: nowIso,
      demo_followup_due_at: clearDue ? null : dueAt || null,
    }),
  };
};
