/**
 * Downstream evidence ingestion (validation mode).
 *
 * 1) Resend webhooks (Svix-signed): POST raw JSON from Resend with headers svix-id, svix-timestamp, svix-signature.
 *    Env: RESEND_WEBHOOK_SECRET (from Resend dashboard → Webhooks → signing secret).
 * 2) Generic JSON (n8n, HubSpot-forwarded, Calendly, etc.): Authorization: Bearer LEAD_ENGINE_PIPELINE_SIGNAL_SECRET
 *
 * @see docs/lead-engine-pipeline-signals.md
 */
const { withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { isValidOutcomeCode } = require('./lib/lead-engine-outcome-events');
const { logNativeLeadOutcome, NATIVE_SOURCES } = require('./lib/lead-engine-native-outcome-log');
const {
  verifyResendSvixPayload,
  ingestVerifiedResendEvent,
} = require('./lib/lead-engine-resend-webhook-ingest');
const {
  findLeadIdByContactEmail,
  findLeadIdByExternalCrmId,
} = require('./lib/lead-engine-pipeline-resolve-lead');

const GENERIC_ALLOWED = new Set([
  'bounced',
  'replied',
  'interested',
  'meeting_booked',
  'not_a_fit',
  'converted_opportunity',
  'unsubscribed',
  'crm_stage_changed',
  'spam_complaint',
  'email_delivered',
]);

function rawBodyFromEvent(event) {
  if (!event || event.body == null) return '';
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64').toString('utf8');
  }
  return typeof event.body === 'string' ? event.body : String(event.body);
}

async function handleAuthenticatedJson(supabase, body) {
  const mode = body.mode != null ? String(body.mode).trim().toLowerCase() : '';

  if (mode === 'calendly' || mode === 'scheduling') {
    const leadIdRaw = body.leadId != null ? String(body.leadId).trim() : '';
    const email = body.invitee_email != null ? String(body.invitee_email) : body.email != null ? String(body.email) : '';
    const leadId = leadIdRaw || (await findLeadIdByContactEmail(supabase, email));
    if (!leadId) {
      return { statusCode: 400, body: { error: 'calendly mode requires leadId or invitee_email matching a lead' } };
    }
    const logged = await logNativeLeadOutcome(supabase, {
      leadId,
      outcome_code: 'meeting_booked',
      native_source: NATIVE_SOURCES.CALENDLY_PIPELINE,
      context: 'calendly',
      note: body.event_name != null ? String(body.event_name).slice(0, 200) : null,
      evidence: {
        event_uri: body.event_uri != null ? String(body.event_uri).slice(0, 300) : null,
        scheduled_at: body.scheduled_at != null ? String(body.scheduled_at).slice(0, 64) : null,
        raw_mode: mode,
      },
      actor: 'calendly_pipeline',
    });
    if (!logged.ok) {
      return { statusCode: 500, body: { error: (logged.error && logged.error.message) || 'log failed' } };
    }
    return { statusCode: 200, body: { ok: true, leadId, outcome_code: 'meeting_booked', mode: 'calendly' } };
  }

  if (mode === 'hubspot_crm' || mode === 'hubspot') {
    const leadIdRaw = body.leadId != null ? String(body.leadId).trim() : '';
    const crmId = body.external_crm_id != null ? String(body.external_crm_id).trim() : '';
    const email = body.email != null ? String(body.email) : '';
    let leadId = leadIdRaw;
    if (!leadId && crmId) leadId = await findLeadIdByExternalCrmId(supabase, crmId);
    if (!leadId && email) leadId = await findLeadIdByContactEmail(supabase, email);
    if (!leadId) {
      return {
        statusCode: 400,
        body: { error: 'hubspot_crm mode requires leadId, external_crm_id, or email matching a lead' },
      };
    }
    const logged = await logNativeLeadOutcome(supabase, {
      leadId,
      outreachId: body.outreachId != null ? String(body.outreachId).trim() : null,
      outcome_code: 'crm_stage_changed',
      native_source: NATIVE_SOURCES.HUBSPOT_PIPELINE,
      context: 'hubspot_pipeline',
      evidence: {
        lifecyclestage: body.lifecyclestage != null ? String(body.lifecyclestage).slice(0, 120) : null,
        dealstage: body.dealstage != null ? String(body.dealstage).slice(0, 120) : null,
        hs_lead_status: body.hs_lead_status != null ? String(body.hs_lead_status).slice(0, 120) : null,
        pipeline: body.pipeline != null ? String(body.pipeline).slice(0, 120) : null,
        object_id: crmId || null,
      },
      actor: 'hubspot_pipeline',
    });
    if (!logged.ok) {
      return { statusCode: 500, body: { error: (logged.error && logged.error.message) || 'log failed' } };
    }
    return { statusCode: 200, body: { ok: true, leadId, outcome_code: 'crm_stage_changed', mode: 'hubspot_crm' } };
  }

  const leadId = body.leadId != null ? String(body.leadId).trim() : '';
  const outcome_code = body.outcome_code != null ? String(body.outcome_code).trim() : '';
  if (!leadId || !outcome_code) {
    return {
      statusCode: 400,
      body: {
        error: 'leadId and outcome_code required (or mode: calendly | hubspot_crm)',
      },
    };
  }
  if (!isValidOutcomeCode(outcome_code) || !GENERIC_ALLOWED.has(outcome_code)) {
    return { statusCode: 400, body: { error: 'outcome_code not allowed', outcome_code } };
  }

  const logged = await logNativeLeadOutcome(supabase, {
    leadId,
    outreachId: body.outreachId != null ? String(body.outreachId).trim() : null,
    outcome_code,
    native_source: NATIVE_SOURCES.PIPELINE_WEBHOOK,
    context: body.context != null ? String(body.context).slice(0, 64) : 'pipeline_webhook',
    note: body.note != null ? String(body.note) : null,
    evidence: body.evidence,
    actor: 'pipeline_webhook',
  });

  if (!logged.ok) {
    return { statusCode: 500, body: { error: (logged.error && logged.error.message) || 'log failed' } };
  }
  return { statusCode: 200, body: { ok: true, leadId, outcome_code } };
}

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Database not configured' }) };
  }

  const h = event.headers || {};
  const raw = rawBodyFromEvent(event);
  const svixId = h['svix-id'] || h['Svix-Id'];
  if (svixId && (process.env.RESEND_WEBHOOK_SECRET || '').trim()) {
    const v = verifyResendSvixPayload(raw, h);
    if (!v.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Resend webhook verification failed', details: String(v.error && v.error.message) }),
      };
    }
    const result = await ingestVerifiedResendEvent(supabase, v.event);
    if (result.skip) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, ...result }) };
    }
    if (!result.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: (result.error && result.error.message) || 'ingest failed' }),
      };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) };
  }

  const pipelineSecret = (process.env.LEAD_ENGINE_PIPELINE_SIGNAL_SECRET || '').trim();
  if (!pipelineSecret) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          'Pipeline JSON ingestion not configured. Set LEAD_ENGINE_PIPELINE_SIGNAL_SECRET (and for Resend webhooks also RESEND_WEBHOOK_SECRET + Svix headers).',
      }),
    };
  }

  const auth = (h.authorization || h.Authorization || '').trim();
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (bearer !== pipelineSecret) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const out = await handleAuthenticatedJson(supabase, body);
  return { statusCode: out.statusCode, headers, body: JSON.stringify(out.body) };
};
