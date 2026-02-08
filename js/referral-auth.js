/**
 * JL Solutions - Referral Dashboard Auth
 * Uses Supabase Auth. Requires supabase-client.js and Supabase JS loaded.
 */

const REFERRAL_DASHBOARD_URL = '/referral-dashboard/';
const REFERRAL_LOGIN_URL = '/referral/login.html';

async function getSupabase() {
  return window.supabaseClient || null;
}

async function getSession() {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

async function getReferralUser() {
  const session = await getSession();
  return session?.user || null;
}

async function requireReferralAuth() {
  const user = await getReferralUser();
  if (!user) {
    window.location.href = REFERRAL_LOGIN_URL + '?return=' + encodeURIComponent(window.location.pathname);
    return null;
  }
  return user;
}

async function referralSignIn(email, password) {
  const sb = await getSupabase();
  if (!sb) return { error: 'Supabase not configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
}

async function referralSignUp(email, password, options = {}) {
  const sb = await getSupabase();
  if (!sb) return { error: 'Supabase not configured' };
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: options.fullName || options.name,
        role: options.role || 'client',
      },
    },
  });
  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
}

async function referralSignOut() {
  const sb = await getSupabase();
  if (sb) await sb.auth.signOut();
  window.location.href = REFERRAL_LOGIN_URL;
}

async function referralApi(pathOrOptions, options) {
  const path = typeof pathOrOptions === 'string' ? pathOrOptions : '';
  const opts = typeof pathOrOptions === 'object' ? pathOrOptions : (options || {});
  const session = await getSession();
  const token = session?.access_token;
  const base = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const url = base + '/.netlify/functions/referrals' + (path ? '/' + path : '');
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
