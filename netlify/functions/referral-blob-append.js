/**
 * Appends a referral to Netlify Blobs storage.
 * Used by stripe-webhook and send-form-email when REFERRAL_USE_SIMPLE_AUTH is set.
 */
const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

async function appendReferral(data) {
  const store = getStore('referrals');
  const raw = await store.get('all', { type: 'json' });
  const list = raw == null ? [] : (Array.isArray(raw) ? raw : raw?.referrals || []);
  const entry = {
    id: crypto.randomUUID(),
    code: (data.code || '').toUpperCase(),
    referred_email: data.referred_email || data.email || '',
    amount_cents: data.amount_cents || 0,
    commission_cents: data.commission_cents || 0,
    status: data.status || 'pending',
    source: data.source || 'unknown',
    created_at: new Date().toISOString(),
  };
  list.push(entry);
  await store.setJSON('all', list);
  return entry;
}

module.exports = { appendReferral };
