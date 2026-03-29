/**
 * Shared guards for lead engine Netlify functions.
 */
const {
  isLeadEngineEnabled,
  isLeadEngineAuthConfigured,
} = require('./lead-engine-config');
const { getLeadEngineSession } = require('./lead-engine-session');

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Cookie',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

function withCors(methods) {
  return {
    ...jsonHeaders,
    'Access-Control-Allow-Methods': methods || 'GET, POST, DELETE, OPTIONS',
  };
}

/**
 * @param {object} event Netlify handler event
 * @param {{ requireAuth: boolean }} options
 */
function guardLeadEngineRequest(event, options) {
  const { requireAuth } = options;
  const headers = withCors();

  if (!isLeadEngineEnabled()) {
    return {
      ok: false,
      response: {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Lead engine is disabled',
          details:
            'In Netlify: Site configuration → Environment variables → add LEAD_ENGINE_ENABLED=true (and redeploy). Also set LEAD_ENGINE_OPERATORS and LEAD_ENGINE_SECRET for sign-in.',
        }),
      },
    };
  }

  if (!isLeadEngineAuthConfigured()) {
    return {
      ok: false,
      response: {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Lead engine auth is not configured. Set LEAD_ENGINE_OPERATORS and LEAD_ENGINE_SECRET.',
        }),
      },
    };
  }

  if (requireAuth) {
    const session = getLeadEngineSession(event);
    if (!session) {
      return {
        ok: false,
        response: {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' }),
        },
      };
    }
    return { ok: true, session };
  }

  return { ok: true, session: undefined };
}

module.exports = {
  jsonHeaders,
  withCors,
  guardLeadEngineRequest,
};
