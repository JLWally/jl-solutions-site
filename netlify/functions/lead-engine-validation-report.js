/**
 * MVP operations validation: 24h / 7d funnel, scout health, operator feedback rollup.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { buildValidationReport } = require('./lib/lead-engine-validation-report');

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
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Database not configured' }) };
  }

  try {
    const report = await buildValidationReport(supabase);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...report }) };
  } catch (e) {
    console.error('[lead-engine-validation-report]', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message || String(e) }),
    };
  }
};
