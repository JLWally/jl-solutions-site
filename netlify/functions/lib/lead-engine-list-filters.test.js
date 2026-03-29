'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesSliceGRowFilters, buildSearchOrFilter } = require('./lead-engine-list-filters');

test('matchesSliceGRowFilters status and optedOut', () => {
  const row = { status: 'new', email_opted_out: false, company_name: 'Acme', website_url: 'https://acme.com' };
  assert.equal(matchesSliceGRowFilters(row, { status: 'new', search: null, optedOut: null }), true);
  assert.equal(matchesSliceGRowFilters(row, { status: 'analyzed', search: null, optedOut: null }), false);
  assert.equal(matchesSliceGRowFilters(row, { status: null, search: null, optedOut: true }), false);
  assert.equal(matchesSliceGRowFilters({ ...row, email_opted_out: true }, { status: null, search: null, optedOut: true }), true);
});

test('matchesSliceGRowFilters search substring', () => {
  const row = { status: 'new', email_opted_out: false, company_name: 'Acme Co', website_url: 'https://x.com' };
  assert.equal(matchesSliceGRowFilters(row, { status: null, search: 'acme', optedOut: null }), true);
  assert.equal(matchesSliceGRowFilters(row, { status: null, search: 'zzz', optedOut: null }), false);
});

test('buildSearchOrFilter escapes percent', () => {
  const f = buildSearchOrFilter('100%');
  assert.match(f, /\\%/);
});
