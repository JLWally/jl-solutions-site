/**
 * Operator PATCH for core lead fields (company, website, contact email).
 * POST JSON: { leadId, company_name?, website_url?, contact_email? }, at least one field besides leadId.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateLeadUpdateBody } = require('./lib/lead-engine-ingest-validate');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const { supabaseErrorPayload } = require('./lib/lead-engine-supabase-error');

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

  const validated = validateLeadUpdateBody(body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const { leadId, patch } = validated.value;
  const nowIso = new Date().toISOString();
  const row = { ...patch, updated_at: nowIso };

  const { data: updated, error: upErr } = await supabase
    .from('lead_engine_leads')
    .update(row)
    .eq('id', leadId)
    .select('id, company_name, website_url, contact_email, updated_at')
    .maybeSingle();

  if (upErr) {
    console.error('[lead-engine-lead-update]', upErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(supabaseErrorPayload(upErr, 'Update failed')),
    };
  }
  if (!updated) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Lead not found' }),
    };
  }

  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    event_type: EVENT_TYPES.LEAD_FIELDS_UPDATED,
    actor: g.session.username,
    message: 'Lead fields updated',
    metadata_json: { fields: Object.keys(patch) },
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, lead: updated }),
  };
};
