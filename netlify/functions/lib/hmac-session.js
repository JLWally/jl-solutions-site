/**
 * Shared HMAC-signed session tokens (base64url payload + hex sig).
 * Callers supply their own secret and payload shape; keep access lists separate per feature.
 */
const crypto = require('crypto');

function signSession(payload, secret) {
  if (!secret) throw new Error('signSession requires secret');
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

module.exports = { signSession, verifySession };
