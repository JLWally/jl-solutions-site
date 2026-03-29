const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { buildActivitySummary } = require('./lib/lead-engine-activity-report');
const { supabaseErrorPayload } = require('./lib/lead-engine-supabase-error');

exports.handler = async (event) => {
  const headers = withCors('GET, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }),
    };
  }

  const qs = event.queryStringParameters || {};
  const limitRaw = Number(qs.limit || 200);
  const limit = Number.isFinite(limitRaw) ? Math.max(20, Math.min(500, Math.trunc(limitRaw))) : 200;

  const { data, error } = await supabase
    .from('lead_engine_events')
    .select('id, event_type, actor, lead_id, outreach_id, created_at, message')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[lead-engine-activity-summary]', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(supabaseErrorPayload(error, 'Failed to load activity events')),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      summary: buildActivitySummary(data || []),
      recent: (data || []).slice(0, 30),
    }),
  };
};

