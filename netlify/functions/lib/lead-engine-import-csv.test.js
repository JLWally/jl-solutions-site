'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsvText } = require('./lead-engine-import-csv');

test('parseCsvText parses supported headers and rows', () => {
  const csv = [
    'company_name,website_url,contact_email,source,idempotency_key',
    'Acme,acme.com,owner@acme.com,manual_import,key-1',
  ].join('\n');
  const out = parseCsvText(csv);
  assert.equal(out.ok, true);
  assert.equal(out.value.rows.length, 1);
  assert.equal(out.value.rows[0].values.company_name, 'Acme');
});

test('parseCsvText rejects missing required header', () => {
  const csv = ['company_name,contact_email', 'Acme,owner@acme.com'].join('\n');
  const out = parseCsvText(csv);
  assert.equal(out.ok, false);
  assert.match(out.error, /Missing required header: website_url/);
});

test('parseCsvText handles quoted commas', () => {
  const csv = ['company_name,website_url', '"Acme, Inc.",https://acme.com'].join('\n');
  const out = parseCsvText(csv);
  assert.equal(out.ok, true);
  assert.equal(out.value.rows[0].values.company_name, 'Acme, Inc.');
});

test('parseCsvText allows city and ignores unknown headers', () => {
  const csv = [
    'company_name,website_url,city,phone',
    'Spa,https://example.com,Austin,512-555-0100',
  ].join('\n');
  const out = parseCsvText(csv);
  assert.equal(out.ok, true);
  assert.equal(out.value.rows[0].values.city, 'Austin');
  assert.deepEqual(out.value.ignoredHeaders, ['phone']);
});

