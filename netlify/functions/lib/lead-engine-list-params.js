/**
 * Parse query string params for lead-engine-list (Slice B).
 */

const VALID_STATUS = new Set(['new', 'analyzed', 'review', 'archived']);
const VALID_OUTREACH_STATUS = new Set(['draft', 'approved', 'sent', 'cancelled']);
const { VALID_REVIEW_QUEUE_MODES } = require('./lead-engine-review-queue');
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LEN = 200;

/** Strip characters that break PostgREST `or=(a.ilike.*,b.ilike.*)` parsing. */
function sanitizeSearchForIlike(s) {
  return s
    .replace(/,/g, ' ')
    .replace(/\(/g, ' ')
    .replace(/\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePositiveInt(raw, fallback) {
  const n = parseInt(String(raw || ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

/**
 * @param {Record<string, string> | null | undefined} qs
 */
function parseListQueryParams(qs) {
  const q = qs || {};
  const page = parsePositiveInt(q.page, DEFAULT_PAGE);
  let pageSize = parsePositiveInt(q.pageSize, DEFAULT_PAGE_SIZE);
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  let status = null;
  if (q.status != null && String(q.status).trim() !== '') {
    const s = String(q.status).trim().toLowerCase();
    if (!VALID_STATUS.has(s)) {
      return {
        ok: false,
        errors: [`status must be one of: ${[...VALID_STATUS].join(', ')}`],
      };
    }
    status = s;
  }

  let search = null;
  if (q.search != null && String(q.search).trim() !== '') {
    search = sanitizeSearchForIlike(String(q.search).trim().slice(0, MAX_SEARCH_LEN));
    if (!search) {
      search = null;
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let optedOut = null;
  if (q.optedOut != null && String(q.optedOut).trim() !== '') {
    const o = String(q.optedOut).trim().toLowerCase();
    if (o === 'true' || o === '1' || o === 'yes') optedOut = true;
    else if (o === 'false' || o === '0' || o === 'no') optedOut = false;
    else {
      return { ok: false, errors: ['optedOut must be true or false when set'] };
    }
  }

  let suppressed = null;
  if (q.suppressed != null && String(q.suppressed).trim() !== '') {
    const s = String(q.suppressed).trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') suppressed = true;
    else if (s === 'false' || s === '0' || s === 'no') suppressed = false;
    else {
      return { ok: false, errors: ['suppressed must be true or false when set'] };
    }
  }

  let outreachStatus = null;
  if (q.outreachStatus != null && String(q.outreachStatus).trim() !== '') {
    const os = String(q.outreachStatus).trim().toLowerCase();
    if (!VALID_OUTREACH_STATUS.has(os)) {
      return {
        ok: false,
        errors: ['outreachStatus must be one of: draft, approved, sent, cancelled'],
      };
    }
    outreachStatus = os;
  }

  let needsAttentionSend = false;
  if (q.needsAttention != null && String(q.needsAttention).trim() !== '') {
    const na = String(q.needsAttention).trim().toLowerCase();
    if (na === 'send' || na === '1' || na === 'true' || na === 'yes') {
      needsAttentionSend = true;
    } else {
      return {
        ok: false,
        errors: ['needsAttention must be send (or 1/true/yes) when set'],
      };
    }
  }

  let recommendedOffer = null;
  if (q.recommendedOffer != null && String(q.recommendedOffer).trim() !== '') {
    const { normalizeOffer } = require('./lead-engine-score-output');
    const off = normalizeOffer(String(q.recommendedOffer).trim());
    if (!off) {
      return {
        ok: false,
        errors: ['recommendedOffer must be a recognized scoring offer string'],
      };
    }
    recommendedOffer = off;
  }

  let reviewQueue = null;
  if (q.reviewQueue != null && String(q.reviewQueue).trim() !== '') {
    const rq = String(q.reviewQueue).trim().toLowerCase();
    if (!VALID_REVIEW_QUEUE_MODES.has(rq)) {
      return {
        ok: false,
        errors: [
          'reviewQueue must be one of: has_draft, latest_draft, latest_approved, multiple_drafts, needs_review',
        ],
      };
    }
    reviewQueue = rq;
  }

  const includeSummary = ['1', 'true', 'yes'].includes(
    String(q.includeSummary || '').trim().toLowerCase()
  );

  return {
    ok: true,
    value: {
      page,
      pageSize,
      status,
      search,
      rangeFrom: from,
      rangeTo: to,
      optedOut,
      suppressed,
      outreachStatus,
      recommendedOffer,
      reviewQueue,
      needsAttentionSend,
      includeSummary,
    },
  };
}

module.exports = {
  parseListQueryParams,
  sanitizeSearchForIlike,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  VALID_STATUS,
  VALID_OUTREACH_STATUS,
};
