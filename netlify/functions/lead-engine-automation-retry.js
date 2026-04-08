/**
 * Reset failed automation pipeline leads to pending (operator retry, no SQL).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { UUID_RE } = require('./lib/lead-engine-analyze-validate');

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Database not configured' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  let leadIds = body.leadIds;
  if (!Array.isArray(leadIds) && body.leadId) {
    leadIds = [body.leadId];
  }
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Provide leadIds (array) or leadId' }),
    };
  }

  const valid = [...new Set(leadIds.map((x) => String(x).trim()).filter((id) => UUID_RE.test(id)))];
  if (!valid.length) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No valid UUID lead ids' }),
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('lead_engine_leads')
    .update({
      automation_pipeline_status: 'pending',
      updated_at: now,
    })
    .in('id', valid)
    .eq('automation_pipeline_status', 'failed')
    .select('id');

  if (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Update failed' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      reset_to_pending: (updated || []).length,
      lead_ids: (updated || []).map((r) => r.id),
      requested: valid.length,
    }),
  };
};
