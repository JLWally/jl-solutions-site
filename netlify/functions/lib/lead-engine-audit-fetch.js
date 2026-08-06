/**
 * Bounded homepage / key-page fetch for lead engine audit (no crawler).
 */

const MAX_BYTES = 600_000;

function resolveFetchTimeoutMs() {
  const raw = process.env.LEAD_ENGINE_AUDIT_FETCH_TIMEOUT_MS;
  if (raw == null || !String(raw).trim()) return 12_000;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return 12_000;
  return Math.min(25_000, Math.max(4_000, n));
}

function defaultAuditUserAgent() {
  const custom = process.env.LEAD_ENGINE_AUDIT_USER_AGENT && String(process.env.LEAD_ENGINE_AUDIT_USER_AGENT).trim();
  if (custom) return custom;
  // Many sites/CDNs block non-browser UAs; this is a standard Chromium UA for operator-triggered fetches only.
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
}

const BLOCKED_HOST_SUBSTRINGS = [
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'google.com/maps',
];

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  return BLOCKED_HOST_SUBSTRINGS.some((s) => h.includes(s.replace(/^www\./, '')) || h.endsWith(s));
}

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, maxBytes?: number }} [opts]
 */
async function fetchHtmlPage(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? resolveFetchTimeoutMs();
  const maxBytes = opts.maxBytes ?? MAX_BYTES;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return {
      ok: false,
      error: 'invalid_url',
      message: 'URL could not be parsed',
      finalUrl: url,
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      error: 'invalid_protocol',
      message: 'Only http and https are allowed',
      finalUrl: url,
    };
  }

  if (isBlockedHost(parsed.hostname)) {
    return {
      ok: false,
      error: 'blocked_host',
      message: 'This host cannot be fetched by the lead engine',
      finalUrl: url,
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': defaultAuditUserAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    const finalUrl = res.url;
    let finalParsed;
    try {
      finalParsed = new URL(finalUrl);
    } catch {
      return {
        ok: false,
        error: 'invalid_final_url',
        message: 'Redirect resolved to an invalid URL',
        statusCode: res.status,
        finalUrl,
      };
    }

    if (isBlockedHost(finalParsed.hostname)) {
      return {
        ok: false,
        error: 'blocked_host',
        message: 'Redirect landed on a blocked host',
        statusCode: res.status,
        finalUrl,
      };
    }

    const ct = res.headers.get('content-type') || '';
    if (res.ok && !/text\/html|application\/xhtml\+xml/i.test(ct)) {
      return {
        ok: false,
        error: 'not_html',
        message: 'Response is not HTML',
        statusCode: res.status,
        finalUrl,
      };
    }

    const buf = await res.arrayBuffer();
    const truncated = buf.byteLength > maxBytes;
    const slice = truncated ? buf.slice(0, maxBytes) : buf;
    const html = new TextDecoder('utf-8', { fatal: false }).decode(slice);

    if (!res.ok) {
      return {
        ok: false,
        error: 'http_error',
        message: `HTTP ${res.status}`,
        statusCode: res.status,
        finalUrl,
        htmlSample: html.slice(0, 2000),
      };
    }

    return {
      ok: true,
      finalUrl,
      statusCode: res.status,
      html,
      truncated,
    };
  } catch (e) {
    const aborted = e && e.name === 'AbortError';
    return {
      ok: false,
      error: aborted ? 'timeout' : 'fetch_error',
      message: aborted ? 'Request timed out' : e.message || 'Fetch failed',
      finalUrl: url,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  fetchHtmlPage,
  isBlockedHost,
  resolveFetchTimeoutMs,
  MAX_BYTES,
};

Object.defineProperty(module.exports, 'DEFAULT_TIMEOUT_MS', {
  enumerable: true,
  configurable: true,
  get() {
    return resolveFetchTimeoutMs();
  },
});
