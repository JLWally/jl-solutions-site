'use strict';

/**
 * Shared demo blob rules for demo-config POST and lead-engine demo generation.
 */

const ALLOWED_CTA_SERVICE = new Set(['ai-intake', 'fix-app', 'scheduling', 'lead-engine', 'custom']);

const STORE_NAME = 'smart-demos';

const RESERVED_SLUGS = new Set([
  'builder',
  'build',
  'create',
  'new',
  'quick',
  'hvac-sample',
  'api',
  'static',
  'assets',
  'admin',
  'internal',
]);

/** Shipped under /demo-data/*.json — block overwriting via blob so static fallback stays predictable */
const STATIC_BUNDLED_DEMO_SLUGS = new Set([
  'airlok-hvac',
  'a1-hvac-and-plumbing',
  'burke-home-services',
  'hvac-sample',
  'sample-acme-hvac',
]);

const DEFAULT_DEMO_SUBTEXT =
  "Here's what a smarter intake and booking flow could look like for your business.";

function slugifyBusinessName(name) {
  const s = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
  return s || 'demo';
}

/**
 * @param {string} raw
 * @returns {string|null} normalized slug or null if invalid / empty
 */
function normalizeRequestedSlug(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s.length > 72) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return null;
  return s;
}

async function isSlugAvailable(store, slug) {
  if (RESERVED_SLUGS.has(slug)) return false;
  if (STATIC_BUNDLED_DEMO_SLUGS.has(slug)) return false;
  const existing = await store.get(slug, { type: 'json' });
  return existing == null;
}

/**
 * Lead-engine demos use slug le-{uuid}; allow overwriting only when existing config is for same lead.
 * @param {import('@netlify/blobs').BlobStore} store
 * @param {string} slug
 * @param {string|null} leadId
 */
async function isSlugAvailableOrOwnedByLead(store, slug, leadId) {
  if (RESERVED_SLUGS.has(slug)) return false;
  if (STATIC_BUNDLED_DEMO_SLUGS.has(slug)) return false;
  const existing = await store.get(slug, { type: 'json' });
  if (existing == null) return true;
  if (leadId && existing.leadEngineLeadId === leadId) return true;
  return false;
}

async function allocateSlug(store, base) {
  let b = base;
  if (RESERVED_SLUGS.has(b)) b = `co-${b}`;
  let candidate = b;
  let i = 0;
  while (i < 80) {
    if (await isSlugAvailable(store, candidate)) return candidate;
    i += 1;
    candidate = `${b}-${i}`;
  }
  throw new Error('Could not allocate unique slug');
}

function sanitizeCtaService(raw) {
  let ctaService = String(raw || 'ai-intake')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  if (!ALLOWED_CTA_SERVICE.has(ctaService)) ctaService = 'ai-intake';
  return ctaService;
}

function originFromEvent(event) {
  return event.headers['x-forwarded-proto'] && event.headers['x-forwarded-host']
    ? `${event.headers['x-forwarded-proto']}://${event.headers['x-forwarded-host']}`
    : event.headers.origin || '';
}

module.exports = {
  ALLOWED_CTA_SERVICE,
  STORE_NAME,
  RESERVED_SLUGS,
  STATIC_BUNDLED_DEMO_SLUGS,
  DEFAULT_DEMO_SUBTEXT,
  slugifyBusinessName,
  normalizeRequestedSlug,
  isSlugAvailable,
  isSlugAvailableOrOwnedByLead,
  allocateSlug,
  sanitizeCtaService,
  originFromEvent,
};
