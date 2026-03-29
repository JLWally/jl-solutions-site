/**
 * Deterministic HTML signal extraction for lead engine website audit (Slice C).
 * Uses node-html-parser — regex-only parsing is too brittle for CTAs and structure.
 */
const { parse } = require('node-html-parser');

const BOOKING_RE = /(book|schedule|appointment|calendly|cal\.com|acuity|picktime|reserve|booking)/i;

const TRUST_KEYWORDS = [
  ['testimonial', 'testimonials'],
  ['review', 'reviews'],
  ['award', 'awards'],
  ['licensed', 'license'],
  ['insured', 'insurance'],
  ['certified', 'certification'],
  ['bbb', 'better business'],
];

const CHAT_SNIPPETS = [
  'intercom',
  'drift.com',
  'zendesk',
  'crisp.chat',
  'tawk.to',
  'livechatinc',
  'hubspot',
  'usemessages',
  'olark',
  'purechat',
];

const SOCIAL_PATTERNS = [
  { key: 'facebook', re: /facebook\.com\//i },
  { key: 'twitter_x', re: /(twitter\.com\/|x\.com\/)/i },
  { key: 'linkedin', re: /linkedin\.com\//i },
  { key: 'instagram', re: /instagram\.com\//i },
  { key: 'youtube', re: /youtube\.com\//i },
];

const EMAIL_IN_TEXT_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_IN_TEXT_RE =
  /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/;

const PATH_HINTS = [
  { re: /\/contact\b/i, p: 4 },
  { re: /\/(book|booking)\b/i, p: 3 },
  { re: /\/schedule/i, p: 3 },
  { re: /\/appointment/i, p: 3 },
  { re: /\/services?\b/i, p: 2 },
];

function normalizeText(t) {
  return String(t || '').replace(/\s+/g, ' ').trim();
}

function extractMetaDescription(root) {
  let metaDesc = null;
  for (const m of root.querySelectorAll('meta')) {
    const name = (m.getAttribute('name') || '').toLowerCase();
    const prop = (m.getAttribute('property') || '').toLowerCase();
    if (name === 'description' || prop === 'og:description') {
      const c = m.getAttribute('content');
      if (c && c.trim()) {
        metaDesc = c.trim();
        break;
      }
    }
  }
  return metaDesc;
}

/**
 * Collect top CTAs from anchor text + buttons (internal tool; cap count).
 */
function extractCtas(root, pageUrl, max = 8) {
  const seen = new Set();
  const out = [];

  function pushCta(text, href) {
    const t = normalizeText(text);
    if (t.length < 2 || t.length > 100) return;
    const key = `${t}|${href}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ text: t, href });
    return out.length >= max;
  }

  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) return;
    let abs;
    try {
      abs = new URL(href, pageUrl).href;
    } catch {
      return;
    }
    if (pushCta(a.textContent, abs)) return;
  });

  root.querySelectorAll('button').forEach((btn) => {
    if (pushCta(btn.textContent, '(button)')) return;
  });

  return out.slice(0, max);
}

function extractTrustMarkers(bodyTextLower) {
  const found = [];
  for (const group of TRUST_KEYWORDS) {
    for (const word of group) {
      if (bodyTextLower.includes(word)) {
        found.push(group[0]);
        break;
      }
    }
  }
  return [...new Set(found)];
}

function extractChatHints(htmlLower) {
  return CHAT_SNIPPETS.filter((s) => htmlLower.includes(s));
}

function extractSocialFromHrefs(root, pageUrl) {
  const found = new Set();
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    let abs;
    try {
      abs = new URL(href, pageUrl).href.toLowerCase();
    } catch {
      return;
    }
    for (const { key, re } of SOCIAL_PATTERNS) {
      if (re.test(abs)) found.add(key);
    }
  });
  return [...found];
}

/**
 * @param {string} html
 * @param {string} pageUrl Absolute URL of this document
 */
function extractPageSignals(html, pageUrl) {
  const root = parse(html, { lowerCaseTagName: true });
  const forText = parse(html, { lowerCaseTagName: true });
  forText.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  const bodyTextLower = normalizeText(forText.textContent).toLowerCase();
  const htmlLower = html.slice(0, 120_000).toLowerCase();

  const page_title = normalizeText(root.querySelector('title')?.textContent) || null;
  const meta_description = extractMetaDescription(root);
  const h1El = root.querySelector('h1');
  const h1 = h1El ? normalizeText(h1El.textContent) || null : null;
  const forms_count = root.querySelectorAll('form').length;

  const ctas = extractCtas(root, pageUrl, 8);

  const booking_links = [];
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    const text = normalizeText(a.textContent).toLowerCase();
    if (BOOKING_RE.test(href) || BOOKING_RE.test(text)) {
      let abs;
      try {
        abs = new URL(a.getAttribute('href') || '', pageUrl).href;
      } catch {
        return;
      }
      booking_links.push({
        text: normalizeText(a.textContent),
        href: abs,
      });
    }
  });

  let mailto_count = 0;
  root.querySelectorAll('a[href^="mailto:"]').forEach(() => {
    mailto_count += 1;
  });

  let tel_count = 0;
  root.querySelectorAll('a[href^="tel:"]').forEach(() => {
    tel_count += 1;
  });

  const has_email_in_text = EMAIL_IN_TEXT_RE.test(bodyTextLower);
  const has_phone_in_text = PHONE_IN_TEXT_RE.test(bodyTextLower);

  return {
    page_title,
    meta_description,
    h1,
    forms_count,
    ctas,
    booking_links,
    mailto_count,
    tel_count,
    has_email_in_text,
    has_phone_in_text,
    trust_markers: extractTrustMarkers(bodyTextLower),
    chat_widget_hints: extractChatHints(htmlLower),
    social_links: extractSocialFromHrefs(root, pageUrl),
  };
}

/**
 * Find up to `maxExtra` same-origin URLs likely to be contact / booking / services.
 */
function discoverSecondaryPageUrls(html, baseUrl, maxExtra = 2) {
  const base = new URL(baseUrl);
  const root = parse(html, { lowerCaseTagName: true });
  const candidates = new Map();

  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) return;
    let abs;
    try {
      abs = new URL(href, baseUrl);
    } catch {
      return;
    }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return;
    if (abs.hostname.toLowerCase() !== base.hostname.toLowerCase()) return;

    const path = abs.pathname.toLowerCase();
    const text = normalizeText(a.textContent).toLowerCase();
    let p = 0;
    for (const { re, p: score } of PATH_HINTS) {
      if (re.test(path) || re.test(text)) {
        p = Math.max(p, score);
      }
    }
    if (BOOKING_RE.test(path) || BOOKING_RE.test(text)) {
      p = Math.max(p, 3);
    }
    if (p === 0) return;

    const normPath = abs.pathname.replace(/\/+$/, '') || '/';
    const key = `${abs.origin}${normPath === '/' ? '/' : normPath}${abs.search}`;
    candidates.set(key, Math.max(candidates.get(key) || 0, p));
  });

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxExtra)
    .map(([u]) => u);
}

/**
 * Same-origin contact + primary service URLs from homepage links (for PSI targets).
 */
function pickContactAndServiceUrlsFromHomepage(html, baseUrl) {
  const root = parse(html, { lowerCaseTagName: true });
  let contactUrl = null;
  let serviceUrl = null;
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) return;
    let abs;
    try {
      abs = new URL(href, baseUrl);
    } catch {
      return;
    }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return;
    if (abs.hostname.toLowerCase() !== new URL(baseUrl).hostname.toLowerCase()) return;
    const path = abs.pathname.toLowerCase();
    if (!contactUrl && /\/contact\b/i.test(path)) contactUrl = abs.href;
    if (!serviceUrl && /\/services?\b/i.test(path)) serviceUrl = abs.href;
  });
  return { contactUrl, serviceUrl };
}

function deriveFormQuality(aggregate, uxHints) {
  const hints = uxHints || [];
  const total = aggregate && aggregate.forms_count_total != null ? aggregate.forms_count_total : 0;
  if (hints.includes('missing_contact_form')) return 'weak';
  if (total > 3) return 'heavy';
  if (total === 0) return 'none';
  return 'ok';
}

function mergeAggregates(pagePayloads) {
  let forms_count_total = 0;
  let booking_detected = false;
  let has_mailto = false;
  let has_tel = false;
  let has_email_in_text = false;
  let has_phone_in_text = false;
  const trust = new Set();
  const chat = new Set();
  const social = new Set();

  for (const p of pagePayloads) {
    forms_count_total += p.forms_count || 0;
    if ((p.booking_links || []).length > 0) booking_detected = true;
    if (p.mailto_count > 0) has_mailto = true;
    if (p.tel_count > 0) has_tel = true;
    if (p.has_email_in_text) has_email_in_text = true;
    if (p.has_phone_in_text) has_phone_in_text = true;
    (p.trust_markers || []).forEach((t) => trust.add(t));
    (p.chat_widget_hints || []).forEach((c) => chat.add(c));
    (p.social_links || []).forEach((s) => social.add(s));
  }

  const has_visible_phone = has_tel || has_phone_in_text;
  const has_visible_email_path = has_mailto || has_email_in_text;
  const has_contact_form_like = forms_count_total > 0;

  const home = pagePayloads[0] || {};
  const cta_count_home = (home.ctas || []).length;

  return {
    pages_fetched: pagePayloads.length,
    forms_count_total,
    booking_detected,
    has_mailto,
    has_tel,
    has_email_in_text,
    has_phone_in_text,
    has_visible_phone,
    has_visible_email_path,
    has_contact_form_like,
    trust_markers: [...trust],
    chat_widget_hints: [...chat],
    social_links: [...social],
    cta_count_home,
  };
}

function deriveUxHints(pagePayloads, aggregate) {
  const hints = [];
  const home = pagePayloads[0] || {};
  const title = normalizeText(home.page_title || '');
  if (title.length < 2) hints.push('missing_clear_title');
  const meta = home.meta_description || '';
  if (!meta || meta.length < 12) hints.push('missing_meta_description');
  if (!home.h1) hints.push('missing_h1');
  if (!aggregate.has_contact_form_like && !aggregate.has_mailto) {
    hints.push('missing_contact_form');
  }
  if (!aggregate.has_visible_phone) hints.push('missing_phone');
  if (!aggregate.has_visible_email_path) hints.push('missing_email_channel');
  if (!aggregate.booking_detected) hints.push('no_obvious_booking_path');
  if ((aggregate.cta_count_home || 0) < 2) hints.push('missing_clear_cta');
  return hints;
}

function buildSuccessSignalBundle(finalUrl, pageResults) {
  const payloads = pageResults.map((r) => r.signals);
  const aggregate = mergeAggregates(payloads);
  const ux_hints = deriveUxHints(payloads, aggregate);
  return {
    audit_version: 1,
    success: true,
    final_url: finalUrl,
    fetched_at: new Date().toISOString(),
    pages: pageResults.map((r) => ({
      url: r.url,
      role: r.role,
      ...r.signals,
    })),
    aggregate,
    ux_hints,
  };
}

function buildFailureSignalBundle(partial) {
  return {
    audit_version: 1,
    success: false,
    final_url: partial.finalUrl || null,
    fetched_at: new Date().toISOString(),
    pages: [],
    aggregate: { pages_fetched: 0 },
    ux_hints: [],
    failure: {
      type: partial.error || 'unknown',
      message: partial.message || partial.error || 'Audit failed',
      http_status: partial.statusCode,
    },
  };
}

function buildCompactSummary(signals) {
  if (!signals || typeof signals !== 'object') return null;
  const first = signals.pages && signals.pages[0];
  return {
    success: !!signals.success,
    final_url: signals.final_url || null,
    pages_fetched: signals.aggregate?.pages_fetched ?? (signals.pages?.length || 0),
    page_title: first?.page_title || null,
    h1: first?.h1 || null,
    ux_hints: signals.ux_hints || [],
    booking_detected: !!signals.aggregate?.booking_detected,
    forms_total: signals.aggregate?.forms_count_total ?? 0,
    failure: signals.failure || null,
  };
}

module.exports = {
  normalizeText,
  extractPageSignals,
  extractCtas,
  discoverSecondaryPageUrls,
  pickContactAndServiceUrlsFromHomepage,
  deriveFormQuality,
  mergeAggregates,
  deriveUxHints,
  buildSuccessSignalBundle,
  buildFailureSignalBundle,
  buildCompactSummary,
  BOOKING_RE,
  PATH_HINTS,
};
