/**
 * Lead engine HTTP-only cookie session (LEAD_ENGINE_SECRET + lead_engine_session cookie).
 * Payload includes kind: 'lead_engine' so tokens are not interchangeable with other features.
 */
const { verifySession } = require('./hmac-session');
const { getLeadEngineSecret } = require('./lead-engine-config');

const COOKIE_NAME = 'lead_engine_session';

function parseCookie(event) {
  const cookie = event.headers.cookie || event.headers.Cookie || '';
  const re = new RegExp(`${COOKIE_NAME}=([^;]+)`);
  const match = cookie.match(re);
  return match ? match[1].trim() : '';
}

function getLeadEngineSession(event) {
  const token = parseCookie(event);
  const secret = getLeadEngineSecret();
  const data = verifySession(token, secret);
  if (!data || data.kind !== 'lead_engine') return null;
  if (!data.username) return null;
  return { username: data.username };
}

function buildSessionCookie(token) {
  const isDev = process.env.NODE_ENV !== 'production';
  const maxAge = 7 * 24 * 60 * 60;
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${!isDev ? '; Secure' : ''}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

module.exports = {
  COOKIE_NAME,
  getLeadEngineSession,
  buildSessionCookie,
  clearSessionCookie,
};
