/**
 * Validation mode rollup: 7d / 30d native vs manual outcomes, query/source rates, guardrails, recovery playbooks.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { buildValidationModeReport } = require('./lib/lead-engine-validation-mode-report');

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
    const report = await buildValidationModeReport(supabase);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...report }) };
  } catch (e) {
    console.error('[lead-engine-validation-mode]', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message || String(e) }),
    };
  }
};
