/**
 * Lead engine operator login (separate cookie from referral dashboard).
 * Env: LEAD_ENGINE_ENABLED, LEAD_ENGINE_OPERATORS, LEAD_ENGINE_SECRET
 */
const { signSession } = require('./lib/hmac-session');
const {
  isLeadEngineEnabled,
  isLeadEngineAuthConfigured,
  getLeadEngineOperators,
  getLeadEngineSecret,
} = require('./lib/lead-engine-config');
const { buildSessionCookie, clearSessionCookie } = require('./lib/lead-engine-session');
const { withCors } = require('./lib/lead-engine-guard');

function allowDevQuickLogin(event, body) {
  if (!body || body.devQuickLogin !== true) return false;
  if (String(process.env.CONTEXT || '').toLowerCase() === 'dev') return true;
  const host = String(event.headers.host || event.headers.Host || '').toLowerCase();
  if (host.startsWith('localhost:') || host === 'localhost') return true;
  if (host.startsWith('127.0.0.1:') || host === '127.0.0.1') return true;
  return false;
}

exports.handler = async (event) => {
  const headers = withCors('POST, DELETE, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (!isLeadEngineEnabled()) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: 'Lead engine is disabled',
        details:
          'In Netlify: Site configuration → Environment variables → add LEAD_ENGINE_ENABLED=true (and redeploy). Also set LEAD_ENGINE_OPERATORS and LEAD_ENGINE_SECRET for sign-in.',
      }),
    };
  }

  if (!isLeadEngineAuthConfigured()) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Lead engine auth is not configured. Set LEAD_ENGINE_OPERATORS and LEAD_ENGINE_SECRET.',
      }),
    };
  }

  const secret = getLeadEngineSecret();
  const operators = getLeadEngineOperators();

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      let op = null;

      // Dev-only convenience: quick local sign-in for UI review in netlify dev.
      if (body && allowDevQuickLogin(event, body)) {
        op = operators[0] || null;
      } else {
        const username = (body.username || body.email || '').trim().toLowerCase();
        const password = (body.password || '').trim();
        op = operators.find((o) => o.username === username && o.password === password);
      }

      if (!op) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid username or password' }),
        };
      }
      const payload = {
        kind: 'lead_engine',
        username: op.username,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      const token = signSession(payload, secret);
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': buildSessionCookie(token),
        },
        body: JSON.stringify({ success: true, username: op.username }),
      };
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }
  }

  if (event.httpMethod === 'DELETE') {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': clearSessionCookie(),
      },
      body: JSON.stringify({ success: true }),
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
