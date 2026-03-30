/**
 * Returns referral stats for simple-auth users.
 * Reads session from cookie, fetches referrals from Netlify Blobs.
 */
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');
const { envVarFromB64 } = require('./lib/runtime-process-env');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

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

function getSession(event) {
  const cookie = event.headers.cookie || event.headers.Cookie || '';
  const match = cookie.match(/referral_session=([^;]+)/);
  const token = match ? match[1].trim() : '';
  const secret = envVarFromB64('UkVGRVJSQUxfU0VDUkVU') || '';
  return verifySession(token, secret);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const session = getSession(event);
  if (!session) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' }),
    };
  }

  try {
    const store = getStore('referrals');
    const raw = await store.get('all', { type: 'json' });
    const referrals = raw == null ? [] : (Array.isArray(raw) ? raw : raw?.referrals || []);

    const myRefs = referrals.filter(
      (r) => (r.code || r.referral_code || '').toUpperCase() === session.code
    );
    const totalEarnings = myRefs.reduce((s, r) => s + (r.commission_cents || 0), 0);
    const pendingEarnings = myRefs
      .filter((r) => (r.status || 'pending') !== 'paid')
      .reduce((s, r) => s + (r.commission_cents || 0), 0);

    const formatted = myRefs.map((r) => ({
      id: r.id,
      created_at: r.created_at || r.createdAt,
      referred_email: r.referred_email || r.email,
      amount_cents: r.amount_cents || 0,
      commission_cents: r.commission_cents || 0,
      status: r.status || 'pending',
      source: r.source || 'unknown',
    }));

    const leadsStore = getStore('consultation-leads');
    const leadsRaw = await leadsStore.get('all', { type: 'json' });
    const leadsList = leadsRaw == null ? [] : (Array.isArray(leadsRaw) ? leadsRaw : []);
    const leadSubmissions = leadsList
      .filter((l) => (String(l.referralCode || '').trim().toUpperCase() === session.code))
      .slice(-100)
      .reverse()
      .map((l) => ({
        created_at: l._storedAt || null,
        name: l.name || '',
        email: l.email || '',
        service: l.service || '',
        referral_code: l.referralCode || '',
        source: l.source || l._formName || '',
        status: 'new',
        message: l.message || '',
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        referrals: formatted,
        totalEarnings,
        pendingEarnings,
        totalReferrals: myRefs.length,
        codes: [{ code: session.code, commission_rate: session.commissionRate || 10 }],
        leadSubmissions,
        totalLeadSubmissions: leadSubmissions.length,
      }),
    };
  } catch (e) {
    console.error('[referral-simple-stats]', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message || 'Failed to load stats' }),
    };
  }
};
