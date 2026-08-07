/**
 * Pure helpers for Website & Lead Flow Check grading (testable without Netlify).
 */
'use strict';

const MAX_URL_LENGTH = 2048;
const CACHE_TTL_MS = 30 * 60 * 1000;

const PRIVATE_HOST_RE =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.intranet)$/i;

/** Opportunity audit ids we care about, with friendly copy. */
const OPPORTUNITY_CATALOG = [
  {
    id: 'uses-responsive-images',
    category: 'performance',
    title: 'Optimize images for faster loading',
    description:
      'Large or unoptimized images can slow the page for visitors on mobile devices or slower connections.',
  },
  {
    id: 'offscreen-images',
    category: 'performance',
    title: 'Defer offscreen images',
    description:
      'Images below the fold can wait to load so the first view of the page appears more quickly.',
  },
  {
    id: 'modern-image-formats',
    category: 'performance',
    title: 'Serve modern image formats',
    description:
      'Newer image formats often reduce file size without a visible quality loss.',
  },
  {
    id: 'render-blocking-resources',
    category: 'performance',
    title: 'Reduce render-blocking resources',
    description:
      'Some scripts or stylesheets may delay how quickly the page becomes usable.',
  },
  {
    id: 'server-response-time',
    category: 'performance',
    title: 'Improve server response time',
    description:
      'A slow first response from the server can make the whole visit feel delayed.',
  },
  {
    id: 'largest-contentful-paint',
    category: 'performance',
    title: 'Speed up the main visible content',
    description:
      'The primary content visitors see first may be taking longer than ideal to appear.',
  },
  {
    id: 'cumulative-layout-shift',
    category: 'performance',
    title: 'Reduce unexpected layout shifting',
    description:
      'Content that jumps while loading can frustrate visitors and make buttons harder to tap.',
  },
  {
    id: 'unsized-images',
    category: 'best-practices',
    title: 'Reserve space for images',
    description:
      'Images without size attributes can cause the layout to shift as they load.',
  },
  {
    id: 'button-name',
    category: 'accessibility',
    title: 'Give buttons accessible names',
    description:
      'Some controls may be difficult for assistive technology users to identify.',
  },
  {
    id: 'link-name',
    category: 'accessibility',
    title: 'Give links accessible names',
    description:
      'Links without clear names make navigation harder for screen-reader users.',
  },
  {
    id: 'label',
    category: 'accessibility',
    title: 'Label form fields clearly',
    description:
      'Form inputs without proper labels can create barriers when visitors try to contact you.',
  },
  {
    id: 'image-alt',
    category: 'accessibility',
    title: 'Add meaningful image descriptions',
    description:
      'Missing alternative text can leave important visuals unavailable to some visitors.',
  },
  {
    id: 'color-contrast',
    category: 'accessibility',
    title: 'Improve text contrast',
    description:
      'Some text may be hard to read for visitors with low vision or in bright environments.',
  },
  {
    id: 'document-title',
    category: 'seo',
    title: 'Add a clear page title',
    description:
      'Search engines and browsers use the page title to understand and present the page.',
  },
  {
    id: 'meta-description',
    category: 'seo',
    title: 'Add a meta description',
    description:
      'A concise description helps search engines present the page more clearly in results.',
  },
  {
    id: 'is-crawlable',
    category: 'seo',
    title: 'Ensure the page can be crawled',
    description:
      'Crawlability settings may be preventing search engines from understanding this page.',
  },
  {
    id: 'robots-txt',
    category: 'seo',
    title: 'Review crawl instructions',
    description:
      'Robots rules may be limiting how search engines discover content on the site.',
  },
  {
    id: 'hreflang',
    category: 'seo',
    title: 'Clarify language targeting',
    description:
      'Language signals help search engines show the right version of the page to visitors.',
  },
  {
    id: 'is-on-https',
    category: 'best-practices',
    title: 'Serve the site over HTTPS',
    description:
      'Secure connections protect visitors and are expected by modern browsers.',
  },
  {
    id: 'viewport',
    category: 'seo',
    title: 'Configure a mobile viewport',
    description:
      'Without a proper viewport setting, the page may be hard to use on phones.',
  },
  {
    id: 'tap-targets',
    category: 'accessibility',
    title: 'Make tap targets easier to use',
    description:
      'Small or tightly spaced controls can be difficult to tap accurately on mobile.',
  },
  {
    id: 'errors-in-console',
    category: 'best-practices',
    title: 'Resolve browser console errors',
    description:
      'Script or page errors can affect stability for some visitors.',
  },
  {
    id: 'geolocation-on-start',
    category: 'best-practices',
    title: 'Avoid requesting location on load',
    description:
      'Unexpected permission prompts can interrupt the first moments of a visit.',
  },
  {
    id: 'notification-on-start',
    category: 'best-practices',
    title: 'Avoid notification prompts on load',
    description:
      'Early permission requests can feel intrusive and push visitors away.',
  },
];

function scoreToInt(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const n = Number(score);
  if (n <= 1 && n >= 0) return Math.round(n * 100);
  return Math.round(Math.min(100, Math.max(0, n)));
}

function letterGrade(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const s = Math.round(Number(score));
  if (s >= 90) return 'A';
  if (s >= 80) return 'B';
  if (s >= 70) return 'C';
  if (s >= 60) return 'D';
  return 'Needs attention';
}

function websiteHealthScore(categories) {
  const p = categories.performance;
  const a = categories.accessibility;
  const s = categories.seo;
  const b = categories.bestPractices;
  const parts = [];
  if (p != null) parts.push({ w: 0.3, v: p });
  if (a != null) parts.push({ w: 0.3, v: a });
  if (s != null) parts.push({ w: 0.2, v: s });
  if (b != null) parts.push({ w: 0.2, v: b });
  if (!parts.length) return null;
  const wSum = parts.reduce((acc, x) => acc + x.w, 0);
  const total = parts.reduce((acc, x) => acc + x.v * x.w, 0);
  return Math.round(total / wSum);
}

function isPrivateOrReservedIp(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (host.includes(':')) {
    // Basic IPv6 local/link-local/ULA rejection
    if (
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe8') ||
      host.startsWith('fe9') ||
      host.startsWith('fea') ||
      host.startsWith('feb')
    ) {
      return true;
    }
  }
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1).map((x) => Number(x));
  if (octets.some((n) => n > 255)) return true;
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/**
 * Normalize and validate a user-supplied website URL for grading.
 * @returns {{ ok: true, url: string, display: string } | { ok: false, error: string, statusCode: number }}
 */
function normalizeAndValidateUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    return { ok: false, error: 'Enter a website URL to continue.', statusCode: 400 };
  }
  if (raw.length > MAX_URL_LENGTH) {
    return { ok: false, error: 'That URL is too long.', statusCode: 400 };
  }
  if (/\s/.test(raw)) {
    return { ok: false, error: 'Remove spaces from the website address.', statusCode: 400 };
  }

  const lower = raw.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('ftp:') ||
    lower.startsWith('blob:')
  ) {
    return { ok: false, error: 'Only http and https websites are supported.', statusCode: 400 };
  }

  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = 'https://' + candidate.replace(/^\/+/, '');
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (_) {
    return {
      ok: false,
      error: 'Enter a valid domain, such as yourbusiness.com.',
      statusCode: 400,
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https websites are supported.', statusCode: 400 };
  }

  // Prefer https when user omitted protocol (already applied). Keep explicit http.
  const host = (parsed.hostname || '').toLowerCase();
  if (!host || host === '.') {
    return {
      ok: false,
      error: 'Enter a valid domain, such as yourbusiness.com.',
      statusCode: 400,
    };
  }
  if (PRIVATE_HOST_RE.test(host) || host === 'localhost') {
    return { ok: false, error: 'That address cannot be checked.', statusCode: 400 };
  }
  if (isPrivateOrReservedIp(host)) {
    return { ok: false, error: 'That address cannot be checked.', statusCode: 400 };
  }
  if (!host.includes('.') && !host.includes(':')) {
    return {
      ok: false,
      error: 'Enter a valid domain, such as yourbusiness.com.',
      statusCode: 400,
    };
  }

  // Rebuild without credentials / fragments
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  const finalUrl = parsed.toString().replace(/\/$/, '') === parsed.origin
    ? parsed.origin + '/'
    : parsed.toString();

  const displayHost = host.replace(/^www\./, '');
  const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
  const display = displayHost + path + (parsed.search || '');

  return { ok: true, url: finalUrl, display };
}

function severityFromScore(score) {
  if (score == null) return 'medium';
  if (score === 0) return 'high';
  if (score < 0.5) return 'high';
  if (score < 0.9) return 'medium';
  return 'low';
}

/**
 * Pick up to 5 actionable opportunities from Lighthouse audits.
 */
function selectOpportunities(lhr, limit) {
  const max = limit || 5;
  const audits = (lhr && lhr.audits) || {};
  const picked = [];
  const seen = new Set();

  for (const item of OPPORTUNITY_CATALOG) {
    if (picked.length >= max) break;
    const audit = audits[item.id];
    if (!audit) continue;
    if (audit.score == null) continue;
    if (audit.score >= 0.9) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push({
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
      score: scoreToInt(audit.score),
      severity: severityFromScore(audit.score),
    });
  }

  // Fill from failed category audits if still short
  if (picked.length < max && lhr && lhr.categories) {
    const catKeys = ['performance', 'accessibility', 'seo', 'best-practices'];
    for (const key of catKeys) {
      if (picked.length >= max) break;
      const cat = lhr.categories[key];
      if (!cat || !Array.isArray(cat.auditRefs)) continue;
      const refs = cat.auditRefs
        .slice()
        .sort((a, b) => (b.weight || 0) - (a.weight || 0));
      for (const ref of refs) {
        if (picked.length >= max) break;
        const audit = audits[ref.id];
        if (!audit || audit.score == null || audit.score >= 0.9) continue;
        if (seen.has(ref.id)) continue;
        if (!audit.title) continue;
        seen.add(ref.id);
        const friendlyCat =
          key === 'best-practices' ? 'best-practices' : key;
        picked.push({
          id: ref.id,
          category: friendlyCat,
          title: String(audit.title).slice(0, 120),
          description: String(audit.description || audit.title)
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .slice(0, 220),
          score: scoreToInt(audit.score),
          severity: severityFromScore(audit.score),
        });
      }
    }
  }

  return picked.slice(0, max).map((o) => ({
    // Do not expose raw Lighthouse IDs to end users in the public payload title path;
    // keep id for internal mapping only — frontend should prefer title/description.
    id: o.id,
    category: o.category === 'best-practices' ? 'bestPractices' : o.category,
    title: o.title,
    description: o.description,
    score: o.score,
    severity: o.severity,
  }));
}

function buildGradePayload(psiJson, requestedUrl) {
  const lhr = psiJson && psiJson.lighthouseResult;
  if (!lhr || !lhr.categories) {
    return null;
  }
  const cat = lhr.categories;
  const categories = {
    performance: scoreToInt(cat.performance && cat.performance.score),
    accessibility: scoreToInt(cat.accessibility && cat.accessibility.score),
    seo: scoreToInt(cat.seo && cat.seo.score),
    bestPractices: scoreToInt(cat['best-practices'] && cat['best-practices'].score),
  };
  const health = websiteHealthScore(categories);
  return {
    requestedUrl,
    finalUrl: (psiJson.finalUrl || (lhr.finalUrl) || requestedUrl || '').toString(),
    scannedAt: new Date().toISOString(),
    categories,
    websiteHealthScore: health,
    grade: letterGrade(health),
    opportunities: selectOpportunities(lhr, 5),
  };
}

/** Simple in-memory cache + rate limit (best-effort per isolate). */
function createMemoryStore() {
  const cache = new Map();
  const hits = new Map();

  return {
    getCache(key) {
      const row = cache.get(key);
      if (!row) return null;
      if (Date.now() > row.expires) {
        cache.delete(key);
        return null;
      }
      return row.value;
    },
    setCache(key, value, ttlMs) {
      cache.set(key, { value, expires: Date.now() + (ttlMs || CACHE_TTL_MS) });
      if (cache.size > 200) {
        const first = cache.keys().next().value;
        cache.delete(first);
      }
    },
    /** @returns {boolean} true if allowed */
    allowRate(ip, limit, windowMs) {
      const key = String(ip || 'unknown');
      const now = Date.now();
      let bucket = hits.get(key);
      if (!bucket || now > bucket.reset) {
        bucket = { count: 0, reset: now + windowMs };
        hits.set(key, bucket);
      }
      bucket.count += 1;
      return bucket.count <= limit;
    },
  };
}

module.exports = {
  MAX_URL_LENGTH,
  CACHE_TTL_MS,
  scoreToInt,
  letterGrade,
  websiteHealthScore,
  normalizeAndValidateUrl,
  isPrivateOrReservedIp,
  selectOpportunities,
  buildGradePayload,
  createMemoryStore,
  OPPORTUNITY_CATALOG,
};
