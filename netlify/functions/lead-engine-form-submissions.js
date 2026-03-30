/**
 * Operator-only listing for website form submissions.
 * Aggregates from Supabase consultations table (when configured)
 * plus Netlify Blobs fallback audit stream from send-form-email.
 */
const { getStore } = require('@netlify/blobs');
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');

function toIso(v) {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function normalizeSupabaseRow(row) {
  return {
    created_at: toIso(row.created_at),
    name: row.name || '',
    email: row.email || '',
    service: row.service || '',
    source: row.source || 'consultations',
    referral_code: row.referral_code || '',
    message: row.message || '',
    provider: 'supabase',
  };
}

function normalizeBlobRow(row) {
  return {
    created_at: toIso(row._storedAt || row.created_at),
    name: row.name || '',
    email: row.email || '',
    service: row.service || '',
    source: row.source || row._formName || 'blob_audit',
    referral_code: row.referralCode || row.referral_code || '',
    message: row.message || '',
    provider: 'blob',
  };
}

exports.handler = async (event) => {
  const headers = withCors('GET, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  const url = new URL(event.rawUrl || 'http://localhost/.netlify/functions/lead-engine-form-submissions');
  const limitRaw = Number(url.searchParams.get('limit') || 200);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(1000, Math.floor(limitRaw))) : 200;

  let fromSupabase = [];
  let fromBlob = [];
  const errors = [];

  try {
    const supabase = getLeadEngineSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('consultations')
        .select('created_at,name,email,service,source,referral_code,message')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        errors.push(`supabase: ${error.message || error}`);
      } else {
        fromSupabase = (data || []).map(normalizeSupabaseRow);
      }
    }
  } catch (e) {
    errors.push(`supabase_exception: ${e.message || e}`);
  }

  try {
    const store = getStore('consultation-leads');
    const all = await store.get('all', { type: 'json' });
    const fallback = await store.get('fallback', { type: 'json' });
    const allList = all == null ? [] : (Array.isArray(all) ? all : []);
    const fallbackList = fallback == null ? [] : (Array.isArray(fallback) ? fallback : []);
    fromBlob = [...allList, ...fallbackList].map(normalizeBlobRow);
  } catch (e) {
    errors.push(`blob_exception: ${e.message || e}`);
  }

  const dedupe = new Map();
  [...fromSupabase, ...fromBlob].forEach((row) => {
    const key = [
      row.created_at,
      row.email.toLowerCase(),
      row.source,
      row.service,
      row.message.slice(0, 120),
    ].join('|');
    if (!dedupe.has(key)) dedupe.set(key, row);
  });

  const submissions = Array.from(dedupe.values())
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      count: submissions.length,
      submissions,
      diagnostics: {
        supabaseRows: fromSupabase.length,
        blobRows: fromBlob.length,
        errors,
      },
    }),
  };
};

