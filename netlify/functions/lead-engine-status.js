/**
 * GET: feature flag + auth probe for operators (Slice A).
 */
const {
  isLeadEngineOpenAiAllowed,
} = require('./lib/lead-engine-config');
const { guardLeadEngineRequest } = require('./lib/lead-engine-guard');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

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
  if (!g.ok) {
    return g.response;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      enabled: true,
      openaiAllowed: isLeadEngineOpenAiAllowed(),
      username: g.session.username,
    }),
  };
};
