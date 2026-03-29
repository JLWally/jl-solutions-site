'use strict';

/**
 * Google PageSpeed Insights API v5 (Lighthouse).
 * Uses GOOGLE_PAGESPEED_API_KEY (same Google Cloud API key with PageSpeed Insights API enabled).
 */

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const DEFAULT_TIMEOUT_MS = 25000;

function scoreToInt(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const n = Number(score);
  if (n <= 1 && n >= 0) return Math.round(n * 100);
  return Math.round(Math.min(100, Math.max(0, n)));
}

/**
 * Extract compact accessibility-related audit ids where score < 1.
 */
function extractAccessibilityFlags(lhr) {
  if (!lhr || !lhr.audits || !lhr.categories || !lhr.categories.accessibility) return [];
  const refs = lhr.categories.accessibility.auditRefs || [];
  const out = [];
  for (const ref of refs) {
    if (out.length >= 20) break;
    const id = ref.id;
    const audit = lhr.audits[id];
    if (!audit || audit.score == null) continue;
    if (audit.score < 1) out.push(id);
  }
  return out;
}

/**
 * @param {string} url
 * @param {{ apiKey: string, strategy?: 'mobile'|'desktop', timeoutMs?: number }} opts
 * @returns {Promise<{ ok: true, url: string, scores: object, accessibility_flags: string[], raw_categories: object } | { ok: false, url: string, error: string, message?: string }>}
 */
async function runPageSpeedForUrl(url, opts) {
  const apiKey = opts.apiKey;
  const strategy = opts.strategy || 'mobile';
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!apiKey || !String(apiKey).trim()) {
    return { ok: false, url, error: 'missing_api_key', message: 'GOOGLE_PAGESPEED_API_KEY not set' };
  }

  const qs = new URLSearchParams();
  qs.set('url', url);
  qs.set('key', apiKey.trim());
  qs.set('strategy', strategy);
  for (const c of ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']) {
    qs.append('category', c);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${PSI_BASE}?${qs.toString()}`, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
      return { ok: false, url, error: 'psi_http_error', message: String(msg).slice(0, 500) };
    }
    const lhr = data.lighthouseResult;
    if (!lhr || !lhr.categories) {
      return { ok: false, url, error: 'psi_no_lighthouse', message: 'No lighthouseResult in PSI response' };
    }
    const cat = lhr.categories;
    const performance = scoreToInt(cat.performance && cat.performance.score);
    const accessibility = scoreToInt(cat.accessibility && cat.accessibility.score);
    const bestPractices = scoreToInt(cat['best-practices'] && cat['best-practices'].score);
    const seo = scoreToInt(cat.seo && cat.seo.score);

    const accessibility_flags = extractAccessibilityFlags(lhr);

    return {
      ok: true,
      url,
      scores: {
        performance,
        accessibility,
        best_practices: bestPractices,
        seo,
        /** Primary "page speed" number for lead row: Lighthouse performance (0–100). */
        page_speed_score: performance,
      },
      accessibility_flags,
      raw_categories: {
        performance: cat.performance && cat.performance.score,
        accessibility: cat.accessibility && cat.accessibility.score,
        best_practices: cat['best-practices'] && cat['best-practices'].score,
        seo: cat.seo && cat.seo.score,
      },
    };
  } catch (e) {
    const aborted = e && e.name === 'AbortError';
    return {
      ok: false,
      url,
      error: aborted ? 'psi_timeout' : 'psi_fetch_error',
      message: aborted ? 'PageSpeed request timed out' : e.message || String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run PSI for multiple URLs in parallel (best-effort; failures are recorded per URL).
 * @param {string[]} urls
 * @param {{ apiKey: string, strategy?: string, timeoutMs?: number }} opts
 */
async function runPageSpeedForUrls(urls, opts) {
  const unique = [...new Set((urls || []).filter(Boolean).map((u) => String(u).trim()))];
  const results = await Promise.all(unique.map((u) => runPageSpeedForUrl(u, opts)));
  return results;
}

/**
 * Build a compact object stored under audit `signals.psi`.
 */
function buildPsiSignalBundle(pages) {
  const list = (pages || []).map((p) => {
    if (p.ok) {
      return {
        url: p.url,
        ok: true,
        scores: p.scores,
        accessibility_flags: p.accessibility_flags || [],
      };
    }
    return {
      url: p.url,
      ok: false,
      error: p.error,
      message: p.message || null,
    };
  });

  const home = list.find((x) => x.ok && x.scores) || null;
  const primary = home && home.scores ? home.scores : null;

  return {
    psi_version: 1,
    strategy: 'mobile',
    pages: list,
    primary_scores: primary
      ? {
          page_speed_score: primary.page_speed_score,
          performance_score: primary.performance,
          accessibility_score: primary.accessibility,
          best_practices_score: primary.best_practices,
          seo_score: primary.seo,
          accessibility_flags: home.accessibility_flags || [],
        }
      : null,
  };
}

module.exports = {
  runPageSpeedForUrl,
  runPageSpeedForUrls,
  buildPsiSignalBundle,
  scoreToInt,
  extractAccessibilityFlags,
};
