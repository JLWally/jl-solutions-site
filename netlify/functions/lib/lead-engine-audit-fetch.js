/**
 * Bounded homepage / key-page fetch for lead engine audit (no crawler).
 */

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_BYTES = 600_000;

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
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
        'User-Agent': 'JL-Solutions-LeadEngine/1.0 (+https://www.jlsolutions.io)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
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
  DEFAULT_TIMEOUT_MS,
  MAX_BYTES,
};
