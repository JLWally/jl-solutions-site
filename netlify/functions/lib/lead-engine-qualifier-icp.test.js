'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateProspectAgainstIcp } = require('./lead-engine-qualifier-icp');

const baseIcp = {
  version: 'icp-v1',
  rules: {
    require_https: true,
    min_company_name_len: 2,
    max_company_name_len: 200,
    blocked_host_substrings: ['wikipedia.org'],
    blocked_url_substrings: [],
    allowed_url_protocols: ['https:', 'http:'],
  },
  tiers: { default_pass_tier: 'standard' },
};

test('ICP passes valid https prospect', () => {
  const r = evaluateProspectAgainstIcp(
    { company_name: 'Acme Co', website_url: 'https://acme.example.com/about' },
    baseIcp
  );
  assert.equal(r.pass, true);
  assert.equal(r.tier, 'standard');
  assert.equal(r.blockReason, null);
  assert.ok(r.ruleHits.some((h) => h.rule === 'pass_base_url_name'));
});

test('ICP v2 blocks country when allowed_countries set', () => {
  const icp = {
    version: 'icp-v2',
    rules: baseIcp.rules,
    tiers: baseIcp.tiers,
    geography: { allowed_countries: ['US'] },
  };
  const r = evaluateProspectAgainstIcp(
    {
      company_name: 'Acme Co',
      website_url: 'https://acme.example.com',
      source_key: 'scout_google_places',
      raw_payload: {
        scout_normalized: { address_country: 'CA', types: ['plumber'] },
      },
    },
    icp
  );
  assert.equal(r.pass, false);
  assert.equal(r.blockReason, 'geo_country_not_allowed');
});

test('ICP v2 allows country match', () => {
  const icp = {
    version: 'icp-v2',
    rules: baseIcp.rules,
    tiers: baseIcp.tiers,
    geography: { allowed_countries: ['US'] },
    source_weights: { scout_google_places: 1 },
  };
  const r = evaluateProspectAgainstIcp(
    {
      company_name: 'Acme Co',
      website_url: 'https://acme.example.com',
      source_key: 'scout_google_places',
      raw_payload: {
        scout_normalized: { address_country: 'US', types: ['plumber'], rating: 4.5, user_ratings_total: 50 },
      },
    },
    icp
  );
  assert.equal(r.pass, true);
});

test('ICP blocks http when require_https', () => {
  const r = evaluateProspectAgainstIcp(
    { company_name: 'Acme Co', website_url: 'http://acme.example.com' },
    baseIcp
  );
  assert.equal(r.pass, false);
  assert.equal(r.blockReason, 'http_not_https');
});

test('ICP blocks short company name', () => {
  const r = evaluateProspectAgainstIcp({ company_name: 'A', website_url: 'https://x.com' }, baseIcp);
  assert.equal(r.pass, false);
  assert.equal(r.blockReason, 'company_name_too_short');
});

test('ICP blocks host substring', () => {
  const r = evaluateProspectAgainstIcp(
    { company_name: 'Wiki', website_url: 'https://en.wikipedia.org/wiki/Foo' },
    baseIcp
  );
  assert.equal(r.pass, false);
  assert.equal(r.blockReason, 'blocked_host');
});
