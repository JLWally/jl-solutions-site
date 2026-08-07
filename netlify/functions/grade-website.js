/**
 * Website Health grader for Website & Lead Flow Check.
 * Uses PageSpeed Insights v5 (mobile) with the same key as lead-engine
 * (GOOGLE_PAGESPEED_API_KEY). Never expose the key or raw PSI payload to the browser.
 */
'use strict';

const {
  CACHE_TTL_MS,
  normalizeAndValidateUrl,
  buildGradePayload,
  createMemoryStore,
} = require('./lib/grade-website-core');
const { getPageSpeedApiKey } = require('./lib/lead-engine-psi');

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const TIMEOUT_MS = 45000;
const store = createMemoryStore();

function getApiKey() {
  return getPageSpeedApiKey();
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}

function clientIp(event) {
  const h = event.headers || {};
  const xf = h['x-forwarded-for'] || h['X-Forwarded-For'] || '';
  if (xf) return String(xf).split(',')[0].trim();
  return h['client-ip'] || h['x-nf-client-connection-ip'] || 'unknown';
}

function parseBody(event) {
  if (!event.body) return {};
  let raw = event.body;
  if (event.isBase64Encoded) {
    try {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    } catch (_) {
      return {};
    }
  }
  const ct = String(event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }
  try {
    return Object.fromEntries(new URLSearchParams(raw));
  } catch (_) {
    return {};
  }
}

async function fetchPageSpeed(url, apiKey) {
  const qs = new URLSearchParams();
  qs.set('url', url);
  qs.set('key', apiKey);
  qs.set('strategy', 'mobile');
  // Append each category correctly (API expects repeated category params)
  for (const c of ['performance', 'accessibility', 'seo', 'best-practices']) {
    qs.append('category', c);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${PSI_BASE}?${qs.toString()}`, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = data && data.error && data.error.code;
      if (res.status === 429 || code === 429) {
        return { ok: false, statusCode: 429, error: 'rate_limited' };
      }
      return { ok: false, statusCode: 502, error: 'upstream_error' };
    }
    return { ok: true, data };
  } catch (e) {
    const aborted = e && e.name === 'AbortError';
    return {
      ok: false,
      statusCode: aborted ? 504 : 502,
      error: aborted ? 'timeout' : 'fetch_failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async function gradeWebsiteHandler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  const ip = clientIp(event);
  if (!store.allowRate(ip, 8, 10 * 60 * 1000)) {
    return json(429, {
      ok: false,
      error: 'Too many website checks from this connection. Please try again in a few minutes.',
    });
  }

  const body = parseBody(event);
  const validated = normalizeAndValidateUrl(body.url || body.websiteUrl || '');
  if (!validated.ok) {
    return json(validated.statusCode || 400, { ok: false, error: validated.error });
  }

  const cacheKey = validated.url.toLowerCase();
  const cached = store.getCache(cacheKey);
  if (cached) {
    return json(200, { ok: true, cached: true, ...cached });
  }

  const apiKey = String(getApiKey() || '').trim();
  if (!apiKey) {
    console.error('[grade-website] missing GOOGLE_PAGESPEED_API_KEY (lead-engine PageSpeed key)');
    return json(503, {
      ok: false,
      error: 'The automated website check is temporarily unavailable. You can still complete the Lead Flow Check.',
      code: 'missing_api_key',
    });
  }

  const psi = await fetchPageSpeed(validated.url, apiKey);
  if (!psi.ok) {
    const messages = {
      timeout: 'The website check timed out. You can retry or continue with the Lead Flow Check.',
      rate_limited: 'The website check is busy right now. Please retry in a moment.',
      upstream_error: 'We could not complete the automated website check for this address.',
      fetch_failed: 'We could not reach the website grading service. Please try again.',
    };
    return json(psi.statusCode || 502, {
      ok: false,
      error: messages[psi.error] || messages.upstream_error,
      code: psi.error,
    });
  }

  const payload = buildGradePayload(psi.data, validated.url);
  if (!payload || payload.websiteHealthScore == null) {
    return json(502, {
      ok: false,
      error: 'We could not interpret the website audit results. Please try again.',
      code: 'parse_failed',
    });
  }

  // Strip raw audit ids from public opportunities for end-user safety (keep category/title/desc)
  const publicPayload = {
    requestedUrl: payload.requestedUrl,
    finalUrl: payload.finalUrl,
    scannedAt: payload.scannedAt,
    categories: payload.categories,
    websiteHealthScore: payload.websiteHealthScore,
    grade: payload.grade,
    opportunities: (payload.opportunities || []).map((o) => ({
      category: o.category,
      title: o.title,
      description: o.description,
      score: o.score,
      severity: o.severity,
    })),
  };

  store.setCache(cacheKey, publicPayload, CACHE_TTL_MS);
  return json(200, { ok: true, cached: false, ...publicPayload });
};
