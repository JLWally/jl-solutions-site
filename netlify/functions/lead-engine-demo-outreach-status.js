/**
 * Patch custom-demo outreach fields on a lead.
 * POST JSON: { leadId, status? } — status must be an allowed demo_outreach_status or null (omit to leave unchanged).
 * Optional: demoFollowupDueAt (ISO string | null | ""), demoLastContactedAt (ISO | null | "")
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateAnalyzeBody } = require('./lib/lead-engine-analyze-validate');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const {
  validateDemoOutreachStatusForWrite,
  allowedDemoOutreachStatusesHumanList,
} = require('./lib/lead-engine-demo-outreach-contract');

function parseBody(raw) {
  if (!raw) return { ok: false, errors: ['Missing body'] };
  try {
    const o = JSON.parse(raw);
    return { ok: true, value: o };
  } catch {
    return { ok: false, errors: ['Invalid JSON'] };
  }
}

function parseInstant(raw, fieldLabel) {
  if (raw === null || raw === '') return { ok: true, value: null };
  const s = String(raw).trim();
  if (!s) return { ok: true, value: null };
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) {
    return { ok: false, errors: [`${fieldLabel} must be a valid ISO date/time or null`] };
  }
  return { ok: true, value: d.toISOString() };
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

  const parsed = parseBody(event.body);
  if (!parsed.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request', errors: parsed.errors }),
    };
  }

  const o = parsed.value;
  const leadCheck = validateAnalyzeBody(o);
  if (!leadCheck.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: leadCheck.errors }),
    };
  }

  const { leadId } = leadCheck.value;
  const nowIso = new Date().toISOString();
  const patch = { updated_at: nowIso };

  if (Object.prototype.hasOwnProperty.call(o, 'status')) {
    const stCheck = validateDemoOutreachStatusForWrite(o.status);
    if (!stCheck.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: stCheck.error,
          code: stCheck.code,
          details: stCheck.details,
        }),
      };
    }
    const status = stCheck.value;
    patch.demo_outreach_status = status;
    patch.demo_outreach_status_at = nowIso;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'demoFollowupDueAt')) {
    const p = parseInstant(o.demoFollowupDueAt, 'demoFollowupDueAt');
    if (!p.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Validation failed', errors: p.errors }),
      };
    }
    patch.demo_followup_due_at = p.value;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'demoLastContactedAt')) {
    const p = parseInstant(o.demoLastContactedAt, 'demoLastContactedAt');
    if (!p.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Validation failed', errors: p.errors }),
      };
    }
    patch.demo_last_contacted_at = p.value;
  }

  const patchKeys = Object.keys(patch).filter((k) => k !== 'updated_at');
  if (patchKeys.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Nothing to update',
        errors: ['Provide status, demoFollowupDueAt, and/or demoLastContactedAt'],
      }),
    };
  }

  const { data: prevLead } = await supabase
    .from('lead_engine_leads')
    .select('demo_outreach_status, demo_followup_due_at, demo_last_contacted_at')
    .eq('id', leadId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('lead_engine_leads')
    .update(patch)
    .eq('id', leadId)
    .select(
      'id, demo_outreach_status, demo_outreach_status_at, demo_followup_due_at, demo_last_contacted_at'
    )
    .maybeSingle();

  if (error) {
    console.error('[lead-engine-demo-outreach-status]', error);
    const msg = String(error.message || '');
    const pgCode = error.code != null ? String(error.code) : '';
    if (
      pgCode === '23514' ||
      /chk_lead_demo_outreach_status/i.test(msg) ||
      /violates check constraint/i.test(msg)
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Demo outreach status is not allowed by the database',
          code: 'INVALID_DEMO_OUTREACH_STATUS',
          details: `Allowed values: ${allowedDemoOutreachStatusesHumanList()}. If you recently deployed code, apply migration 20260407180000_lead_engine_demo_outreach_status_expand.sql in Supabase.`,
        }),
      };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Update failed',
        code: 'UPDATE_FAILED',
        details: msg.slice(0, 500),
      }),
    };
  }

  if (!data) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Lead not found' }),
    };
  }

  const st = data.demo_outreach_status;
  if (Object.prototype.hasOwnProperty.call(o, 'status')) {
    if (st === 'drafted') {
      await logLeadEngineEvent(supabase, {
        lead_id: leadId,
        event_type: EVENT_TYPES.DEMO_OUTREACH_DRAFTED,
        actor: g.session.username || null,
        message: 'Custom demo outreach marked drafted',
        metadata_json: { source: 'lead-engine-demo-outreach-status' },
      });
    } else if (st === 'followup_due') {
      await logLeadEngineEvent(supabase, {
        lead_id: leadId,
        event_type: EVENT_TYPES.DEMO_OUTREACH_FOLLOWUP_DUE,
        actor: g.session.username || null,
        message: 'Demo outreach status set to follow-up due',
        metadata_json: { source: 'lead-engine-demo-outreach-status' },
      });
    }
  }

  const pipelineMeta = { source: 'operator_ui' };
  if (Object.prototype.hasOwnProperty.call(o, 'status')) {
    pipelineMeta.demo_outreach_status_before = prevLead ? prevLead.demo_outreach_status : null;
    pipelineMeta.demo_outreach_status_after = data.demo_outreach_status;
  }
  if (Object.prototype.hasOwnProperty.call(o, 'demoFollowupDueAt')) {
    pipelineMeta.demo_followup_due_at_before = prevLead ? prevLead.demo_followup_due_at : null;
    pipelineMeta.demo_followup_due_at_after = data.demo_followup_due_at;
  }
  if (Object.prototype.hasOwnProperty.call(o, 'demoLastContactedAt')) {
    pipelineMeta.demo_last_contacted_at_before = prevLead ? prevLead.demo_last_contacted_at : null;
    pipelineMeta.demo_last_contacted_at_after = data.demo_last_contacted_at;
  }
  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    event_type: EVENT_TYPES.OPERATOR_DEMO_PIPELINE_EDIT,
    actor: g.session.username || null,
    message: 'Operator updated demo pipeline fields',
    metadata_json: pipelineMeta,
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      leadId: data.id,
      demo_outreach_status: data.demo_outreach_status,
      demo_outreach_status_at: data.demo_outreach_status_at,
      demo_followup_due_at: data.demo_followup_due_at,
      demo_last_contacted_at: data.demo_last_contacted_at,
    }),
  };
};
