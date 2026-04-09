/**
 * Send one approved outreach email via Resend (Slice F + H). Claim-before-send, idempotent replay.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateSendBody } = require('./lib/lead-engine-outreach-actions-validate');
const { normalizeOptionalEmail } = require('./lib/lead-engine-ingest-validate');
const { isLeadEmailSendBlocked, classifyEmailSendBlock } = require('./lib/lead-engine-opt-out');
const { isEmailGloballySuppressed } = require('./lib/lead-engine-global-suppression');
const {
  buildOutreachEmailHtml,
  DEFAULT_REPLY_TO,
} = require('./lib/lead-engine-outreach-email');
const { getLeadEnginePublicSiteUrl } = require('./lib/lead-engine-public-site-url');
const { sendLeadEngineOutreachEmail } = require('./lib/lead-engine-resend-outreach');
const {
  claimApprovedOutreachForSend,
  releaseSendClaim,
  finalizeOutreachSentWithRetries,
} = require('./lib/lead-engine-send-state');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const { logNativeLeadOutcome, NATIVE_SOURCES, looksLikeEmailHardFailure } = require('./lib/lead-engine-native-outcome-log');
const { envVarFromB64 } = require('./lib/runtime-process-env');

const LEAD_SEND_SELECT =
  'id, contact_email, email_opted_out, outreach_unsubscribe_token, company_name';

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
  if (!g.ok) {
    return g.response;
  }

  if (!envVarFromB64('UkVTRU5EX0FQSV9LRVk=')) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Email sending is not configured. Set RESEND_API_KEY in Netlify environment variables.',
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
          'Production outreach sending is disabled until a valid physical mailing address is set in LEAD_ENGINE_PHYSICAL_ADDRESS (CAN-SPAM). Drafts and review still work.',
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
          'Public site URL is not configured; cannot attach a valid unsubscribe link. Set LEAD_ENGINE_PUBLIC_SITE_URL to your production origin (e.g. https://www.jlsolutions.io), or rely on Netlify’s URL env in deploys.',
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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const validated = validateSendBody(body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const { leadId, outreachId } = validated.value;

  const { data: lead, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select(LEAD_SEND_SELECT)
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr) {
    console.error('[lead-engine-send] lead', leadErr);
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
        error:
          'This lead has opted out of outreach email. Do not send. (They may have used the unsubscribe link.)',
        code: 'LEAD_OPTED_OUT',
      }),
    };
  }

  const emailNorm = normalizeOptionalEmail(lead.contact_email);
  if (!emailNorm.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: emailNorm.error || 'Invalid contact_email on lead' }),
    };
  }
  if (!emailNorm.value) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error:
          'Lead has no contact_email. Add a valid email on the lead before sending.',
        code: 'MISSING_CONTACT_EMAIL',
      }),
    };
  }

  const recipient = emailNorm.value;
  const globalBefore = await isEmailGloballySuppressed(supabase, recipient);
  if (globalBefore.error) {
    console.error('[lead-engine-send] global suppression check', globalBefore.error);
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
        error: 'This email address is globally suppressed from outreach. Do not send.',
        code: 'GLOBAL_EMAIL_SUPPRESSED',
      }),
    };
  }

  let targetOutreachId = outreachId;

  if (!targetOutreachId) {
    const { data: approvedRows, error: arErr } = await supabase
      .from('lead_engine_outreach')
      .select('id')
      .eq('lead_id', leadId)
      .eq('channel', 'email')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);

    if (arErr) {
      console.error('[lead-engine-send] query approved', arErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load approved outreach' }),
      };
    }
    const ar = approvedRows && approvedRows[0];
    if (!ar) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'No approved outreach row to send. Approve a draft first.',
          code: 'NO_APPROVED_OUTREACH',
        }),
      };
    }
    targetOutreachId = ar.id;
  }

  const { data: outreach, error: oErr } = await supabase
    .from('lead_engine_outreach')
    .select('id, lead_id, status, draft_subject, draft_body, send_started_at')
    .eq('id', targetOutreachId)
    .maybeSingle();

  if (oErr) {
    console.error('[lead-engine-send] outreach', oErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load outreach row' }),
    };
  }

  if (!outreach || outreach.lead_id !== leadId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Outreach row not found for this lead' }),
    };
  }

  if (outreach.status === 'sent') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        idempotentReplay: true,
        leadId,
        outreachId: outreach.id,
        status: 'sent',
        message: 'This outreach was already sent; no duplicate email was sent.',
      }),
    };
  }

  if (outreach.status !== 'approved') {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: `Outreach must be approved before send (current status: ${outreach.status}).`,
        code: 'OUTREACH_NOT_APPROVED',
      }),
    };
  }

  const claim = await claimApprovedOutreachForSend(supabase, targetOutreachId);
  if (claim.kind === 'already_sent') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        idempotentReplay: true,
        leadId,
        outreachId: targetOutreachId,
        status: 'sent',
        message: 'This outreach was already sent; no duplicate email was sent.',
      }),
    };
  }
  if (claim.kind === 'in_progress') {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error:
          'A send is already in progress for this outreach. Wait for it to finish or for the lock to expire (~15 min), then retry if needed.',
        code: 'SEND_IN_PROGRESS',
      }),
    };
  }
  if (claim.kind === 'bad_state') {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: `Outreach must be approved before send (current status: ${claim.status}).`,
        code: 'OUTREACH_NOT_APPROVED',
      }),
    };
  }
  if (claim.kind === 'error') {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: claim.message || 'Could not acquire send lock' }),
    };
  }

  const claimedAt = claim.claimedAt;
  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    outreach_id: targetOutreachId,
    event_type: EVENT_TYPES.SEND_ATTEMPTED,
    actor: g.session.username || null,
    message: 'Send attempt started',
    metadata_json: { recipient },
  });

  const { data: leadAgain, error: leadAgainErr } = await supabase
    .from('lead_engine_leads')
    .select('email_opted_out, contact_email')
    .eq('id', leadId)
    .maybeSingle();

  if (leadAgainErr || !leadAgain || isLeadEmailSendBlocked(leadAgain)) {
    await releaseSendClaim(supabase, targetOutreachId);
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'Lead opted out before send completed. Send was not delivered.',
        code: 'LEAD_OPTED_OUT',
      }),
    };
  }
  const globalAfter = await isEmailGloballySuppressed(supabase, leadAgain.contact_email);
  const blockAfter = classifyEmailSendBlock({
    leadOptedOut: isLeadEmailSendBlocked(leadAgain),
    globallySuppressed: !globalAfter.error && globalAfter.suppressed,
  });
  if (globalAfter.error || (blockAfter.blocked && blockAfter.code === 'GLOBAL_EMAIL_SUPPRESSED')) {
    await releaseSendClaim(supabase, targetOutreachId);
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error:
          'This email became globally suppressed before send completed. Send was not delivered.',
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

  const { subject, html } = buildOutreachEmailHtml({
    subject: outreach.draft_subject || 'Message from JL Solutions',
    bodyPlain: outreach.draft_body || '',
    unsubscribeUrl,
    physicalAddress,
  });

  let resendData;
  try {
    resendData = await sendLeadEngineOutreachEmail({
      to: recipient,
      subject,
      html,
      replyTo: DEFAULT_REPLY_TO,
      tags: [
        { name: 'lead_engine_lead_id', value: String(leadId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 256) || 'x' },
        {
          name: 'lead_engine_outreach_id',
          value: String(targetOutreachId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 256) || 'x',
        },
      ],
    });
  } catch (e) {
    console.error('[lead-engine-send] Resend', e);
    await releaseSendClaim(supabase, targetOutreachId);
    const msg =
      e.code === 'NO_RESEND'
        ? 'Email provider not configured'
        : e.message || 'Send failed';
    if (looksLikeEmailHardFailure(msg)) {
      await logNativeLeadOutcome(supabase, {
        leadId,
        outreachId: targetOutreachId,
        outcome_code: 'bounced',
        native_source: NATIVE_SOURCES.RESEND_SEND_ERROR,
        context: 'send_hard_fail',
        note: msg.slice(0, 240),
        evidence: { provider: 'resend' },
        actor: 'native_pipeline',
      });
    }
    return {
      statusCode: e.code === 'NO_RESEND' ? 503 : 502,
      headers,
      body: JSON.stringify({ error: 'Failed to send email', details: msg, code: 'RESEND_FAILED' }),
    };
  }

  const resendMessageId = resendData && (resendData.id || resendData.message_id || null);
  const sentAtIso = new Date().toISOString();

  const fin = await finalizeOutreachSentWithRetries(supabase, targetOutreachId, claimedAt, sentAtIso, 4);

  if (!fin.ok) {
    console.error(
      '[lead-engine-send] RECONCILE_REQUIRED outreach=%s lead=%s resendId=%s',
      targetOutreachId,
      leadId,
      resendMessageId,
      fin.error
    );
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          'Email was likely delivered via Resend, but the database could not be updated after several retries.',
        code: 'RECONCILE_REQUIRED',
        resendLikelyDelivered: true,
        resendMessageId,
        leadId,
        outreachId: targetOutreachId,
        sentTo: recipient,
        claimedAt,
        hint:
          'Check the Resend dashboard for this recipient. In Supabase, set lead_engine_outreach.status=sent, sent_at=now, send_started_at=null for this outreach id if the message was delivered. If it was not, clear send_started_at and retry send.',
      }),
    };
  }

  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    outreach_id: fin.data.id,
    event_type: EVENT_TYPES.SEND_SUCCEEDED,
    actor: g.session.username || null,
    message: 'Outreach sent successfully',
    metadata_json: { recipient, resendMessageId: resendMessageId || null },
  });
  await logNativeLeadOutcome(supabase, {
    leadId,
    outreachId: fin.data.id,
    outcome_code: 'email_delivered',
    native_source: NATIVE_SOURCES.RESEND_SEND_OK,
    context: 'send_ok',
    delivery_idempotency_key: resendMessageId || null,
    evidence: { resendMessageId: resendMessageId || null },
    actor: g.session.username ? `operator_send:${g.session.username}` : 'operator_send',
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      leadId,
      outreachId: fin.data.id,
      status: fin.data.status,
      sent_at: fin.data.sent_at,
      sent_to: recipient,
      unsubscribe_link_included: Boolean(unsubscribeUrl),
      resendMessageId,
    }),
  };
};
