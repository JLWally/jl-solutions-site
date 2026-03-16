/**
 * Simple internal auth for referral dashboard.
 * Used when REFERRAL_USE_SIMPLE_AUTH is set.
 */
const REFERRAL_LOGIN_URL = '/referral/login.html';
const REFERRAL_DASHBOARD_URL = '/referral-dashboard/';

async function referralSimpleSignIn(username, password) {
  const res = await fetch('/.netlify/functions/referral-simple-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || 'Login failed' };
  return { success: true, code: data.code, username: data.username };
}

async function referralSimpleSignOut() {
  await fetch('/.netlify/functions/referral-simple-auth', {
    method: 'DELETE',
    credentials: 'include',
  });
  window.location.href = REFERRAL_LOGIN_URL;
}

async function referralSimpleApi(path) {
  const res = await fetch((window.location.origin || '') + '/.netlify/functions/referral-simple-stats' + (path ? '/' + path : ''), {
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function requireReferralSimpleAuth() {
  try {
    const data = await referralSimpleApi();
    return data;
  } catch (e) {
    window.location.href = REFERRAL_LOGIN_URL + '?return=' + encodeURIComponent(window.location.pathname);
    return null;
  }
}
