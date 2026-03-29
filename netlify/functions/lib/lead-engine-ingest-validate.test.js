'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeWebsiteUrl,
  validateManualIngestBody,
  dedupeCutoffIso,
} = require('./lead-engine-ingest-validate');

test('normalizeWebsiteUrl adds https and lowercases host', () => {
  const r = normalizeWebsiteUrl('Example.COM/foo/');
  assert.equal(r.ok, true);
  assert.equal(r.value, 'https://example.com/foo');
});

test('normalizeWebsiteUrl rejects javascript:', () => {
  const r = normalizeWebsiteUrl('javascript:alert(1)');
  assert.equal(r.ok, false);
});

test('validateManualIngestBody accepts minimal manual payload', () => {
  const r = validateManualIngestBody({
    company_name: '  Acme  Corp ',
    website_url: 'acme.com',
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.company_name, 'Acme Corp');
  assert.equal(r.value.website_url.startsWith('https://acme.com'), true);
  assert.equal(r.value.source, 'manual');
  assert.equal(r.value.contact_email, null);
  assert.equal(r.value.idempotency_key, null);
});

test('validateManualIngestBody rejects unknown source', () => {
  const r = validateManualIngestBody({
    company_name: 'X',
    website_url: 'https://x.com',
    source: 'hubspot',
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('manual')));
});

test('validateManualIngestBody collects multiple errors', () => {
  const r = validateManualIngestBody({
    company_name: '',
    website_url: '',
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 2);
});

test('dedupeCutoffIso is valid ISO in the past', () => {
  const iso = dedupeCutoffIso();
  const t = Date.parse(iso);
  assert.ok(Number.isFinite(t));
  assert.ok(t < Date.now());
});
