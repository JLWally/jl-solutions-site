/**
 * Operator reference: config-driven industry profile taxonomy (no secrets).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { listProfilesForOperator } = require('./lib/industry-profiles');

exports.handler = async (event) => {
  const headers = withCors('GET, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      profiles: listProfilesForOperator(),
    }),
  };
};
