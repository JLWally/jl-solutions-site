/**
 * Manual ingest validation, string sanitization, and website URL normalization.
 */

const MAX_COMPANY = 200;
const MAX_URL = 2048;
const MAX_EMAIL = 254;
const MAX_IDEMPOTENCY_KEY = 200;
const DEDUPE_WINDOW_DAYS = 30;

const ALLOWED_SOURCES_MANUAL_SLICE = new Set(['manual']);

function collapseWhitespace(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

function sanitizeCompanyName(raw) {
  const s = collapseWhitespace(raw);
  if (!s) return { ok: false, error: 'company_name is required' };
  if (s.length > MAX_COMPANY) {
    return { ok: false, error: `company_name must be at most ${MAX_COMPANY} characters` };
  }
  return { ok: true, value: s };
}

/**
 * Normalize website URL for storage and dedupe (https, lowercase host, trim path slash).
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
function normalizeWebsiteUrl(raw) {
  let s = String(raw == null ? '' : raw).trim();
  if (!s) {
    return { ok: false, error: 'website_url is required' };
  }
  if (s.length > MAX_URL) {
    return { ok: false, error: `website_url must be at most ${MAX_URL} characters` };
  }
  const lowerProto = s.toLowerCase();
  if (lowerProto.startsWith('javascript:') || lowerProto.startsWith('data:')) {
    return { ok: false, error: 'website_url must be an http(s) URL' };
  }
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  let u;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, error: 'website_url is not a valid URL' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'website_url must use http or https' };
  }
  u.hostname = u.hostname.toLowerCase();
  if (!u.hostname) {
    return { ok: false, error: 'website_url must include a hostname' };
  }
  let path = u.pathname || '/';
  if (path.length > 1 && path.endsWith('/')) {
    path = path.replace(/\/+$/, '');
  }
  const value = `${u.protocol}//${u.host}${path === '/' ? '' : path}${u.search}`;
  if (value.length > MAX_URL) {
    return { ok: false, error: 'website_url is too long after normalization' };
  }
  return { ok: true, value };
}

function normalizeOptionalEmail(raw) {
  if (raw == null || raw === '') return { ok: true, value: null };
  const s = String(raw).trim();
  if (!s) return { ok: true, value: null };
  if (s.length > MAX_EMAIL) {
    return { ok: false, error: `contact_email must be at most ${MAX_EMAIL} characters` };
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(s)) {
    return { ok: false, error: 'contact_email is not a valid email address' };
  }
  return { ok: true, value: s };
}

function normalizeIdempotencyKey(raw) {
  if (raw == null || raw === '') return { ok: true, value: null };
  const s = String(raw).trim();
  if (!s) return { ok: true, value: null };
  if (s.length > MAX_IDEMPOTENCY_KEY) {
    return { ok: false, error: `idempotency_key must be at most ${MAX_IDEMPOTENCY_KEY} characters` };
  }
  return { ok: true, value: s };
}

function normalizeSource(raw) {
  const s = raw == null || raw === '' ? 'manual' : String(raw).trim().toLowerCase();
  if (!ALLOWED_SOURCES_MANUAL_SLICE.has(s)) {
    return {
      ok: false,
      error: `source must be "manual" in this release (received "${String(raw).trim()}")`,
    };
  }
  return { ok: true, value: s };
}

/**
 * Validate manual ingest JSON body (Slice B).
 * @returns {{ ok: true, value: object } | { ok: false, errors: string[] }}
 */
function validateManualIngestBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }

  const company = sanitizeCompanyName(body.company_name);
  if (!company.ok) errors.push(company.error);

  const url = normalizeWebsiteUrl(body.website_url);
  if (!url.ok) errors.push(url.error);

  const email = normalizeOptionalEmail(body.contact_email);
  if (!email.ok) errors.push(email.error);

  const source = normalizeSource(body.source);
  if (!source.ok) errors.push(source.error);

  const idem = normalizeIdempotencyKey(body.idempotency_key);
  if (!idem.ok) errors.push(idem.error);

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      company_name: company.value,
      website_url: url.value,
      contact_email: email.value,
      source: source.value,
      idempotency_key: idem.value,
    },
  };
}

function dedupeCutoffIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - DEDUPE_WINDOW_DAYS);
  return d.toISOString();
}

module.exports = {
  collapseWhitespace,
  sanitizeCompanyName,
  normalizeWebsiteUrl,
  normalizeOptionalEmail,
  normalizeIdempotencyKey,
  normalizeSource,
  validateManualIngestBody,
  dedupeCutoffIso,
  DEDUPE_WINDOW_DAYS,
  MAX_COMPANY,
  MAX_URL,
};
