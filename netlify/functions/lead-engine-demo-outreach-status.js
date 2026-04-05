/**
 * Patch custom-demo outreach fields on a lead.
 * POST JSON: { leadId, status? }, status drafted|copied|sent_manual|followup_due|null (omit status to leave unchanged)
 * Optional: demoFollowupDueAt (ISO string | null | ""), demoLastContactedAt (ISO | null | "")
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateAnalyzeBody } = require('./lib/lead-engine-analyze-validate');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');

const VALID = new Set([
  'drafted',
  'copied',
  'sent_manual',
  'followup_due',
  'send_failed',
  'replied',
  'interested',
  'not_interested',
]);

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
    let status = o.status;
    if (status === '' || status === undefined) {
      status = null;
    } else {
      status = String(status).trim().toLowerCase();
      if (!VALID.has(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid status',
            errors: [
              'status must be drafted, copied, sent_manual, followup_due, send_failed, replied, interested, not_interested, or null',
            ],
          }),
        };
      }
    }
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Update failed', details: error.message }),
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
