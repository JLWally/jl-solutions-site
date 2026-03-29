/**
 * Approve a draft outreach row (Slice F). Updates existing row only.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateApproveBody } = require('./lib/lead-engine-outreach-actions-validate');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');

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

  const validated = validateApproveBody(body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const { leadId, outreachId } = validated.value;
  const nowIso = new Date().toISOString();
  const approvedBy = g.session.username;

  let targetId = outreachId;

  if (!targetId) {
    const { data: drafts, error: qErr } = await supabase
      .from('lead_engine_outreach')
      .select('id')
      .eq('lead_id', leadId)
      .eq('channel', 'email')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1);

    if (qErr) {
      console.error('[lead-engine-approve] query draft', qErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load outreach drafts' }),
      };
    }
    const row = drafts && drafts[0];
    if (!row) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'No draft outreach row to approve. Generate a draft first.',
        }),
      };
    }
    targetId = row.id;
  } else {
    const { data: existing, error: exErr } = await supabase
      .from('lead_engine_outreach')
      .select('id, lead_id, status')
      .eq('id', targetId)
      .maybeSingle();

    if (exErr) {
      console.error('[lead-engine-approve] load outreach', exErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load outreach row' }),
      };
    }
    if (!existing || existing.lead_id !== leadId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Outreach row not found for this lead' }),
      };
    }
    if (existing.status !== 'draft') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: `Only draft outreach can be approved (current status: ${existing.status}).`,
        }),
      };
    }
  }

  const { data: updated, error: upErr } = await supabase
    .from('lead_engine_outreach')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      updated_at: nowIso,
      send_started_at: null,
    })
    .eq('id', targetId)
    .eq('status', 'draft')
    .select('id, status, approved_by, updated_at')
    .maybeSingle();

  if (upErr) {
    console.error('[lead-engine-approve] update', upErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to approve outreach' }),
    };
  }

  if (!updated) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error:
          'Could not approve this outreach (it may no longer be a draft). Refresh the list and try again.',
      }),
    };
  }

  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    outreach_id: updated.id,
    event_type: EVENT_TYPES.DRAFT_APPROVED,
    actor: approvedBy || null,
    message: 'Draft outreach approved',
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      leadId,
      outreachId: updated.id,
      status: updated.status,
      approved_by: updated.approved_by,
      updated_at: updated.updated_at,
    }),
  };
};
