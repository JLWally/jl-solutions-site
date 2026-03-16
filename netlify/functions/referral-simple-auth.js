/**
 * Simple internal auth for referral dashboard.
 * Set REFERRAL_AGENTS and REFERRAL_SECRET in Netlify env.
 *
 * REFERRAL_AGENTS format: username:password:CODE (comma-separated per agent)
 * Example: jane:secret123:AGENT-JANE,john:pass456:AGENT-JOHN
 *
 * REFERRAL_SECRET: used to sign session cookie (any random string)
 */
const crypto = require('crypto');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function parseAgents(envStr) {
  if (!envStr || typeof envStr !== 'string') return [];
  return envStr
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const p = part.split(':');
      return {
        username: (p[0] || '').trim().toLowerCase(),
        password: (p[1] || '').trim(),
        code: (p[2] || '').trim().toUpperCase(),
        commissionRate: parseFloat(p[3]) || 10,
      };
    })
    .filter((a) => a.username && a.password && a.code);
}

function signSession(payload, secret) {
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return Buffer.from(data).toString('base64url') + '.' + sig;
}

function verifySession(token, secret) {
  if (!token || !secret) return null;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString());
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
    if (sig !== expected) return null;
    if (data.exp && data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const agents = parseAgents(process.env.REFERRAL_AGENTS);
  const secret = process.env.REFERRAL_SECRET || '';

  if (agents.length === 0 || !secret) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Simple auth not configured. Set REFERRAL_AGENTS and REFERRAL_SECRET in Netlify.',
      }),
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const username = (body.username || body.email || '').trim().toLowerCase();
      const password = (body.password || '').trim();
      const agent = agents.find(
        (a) => a.username === username && a.password === password
      );
      if (!agent) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid username or password' }),
        };
      }
      const payload = {
        code: agent.code,
        username: agent.username,
        commissionRate: agent.commissionRate,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      const token = signSession(payload, secret);
      const isDev = process.env.NODE_ENV !== 'production';
      const cookie = `referral_session=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Lax${!isDev ? '; Secure' : ''}`;
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': cookie,
        },
        body: JSON.stringify({
          success: true,
          code: agent.code,
          username: agent.username,
        }),
      };
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }
  }

  if (event.httpMethod === 'DELETE') {
    const cookie = 'referral_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax';
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': cookie,
      },
      body: JSON.stringify({ success: true }),
    };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
