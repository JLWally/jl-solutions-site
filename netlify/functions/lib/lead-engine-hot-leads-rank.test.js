'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeHotLeadScore, rankHotLeads } = require('./lead-engine-hot-leads-rank');

test('hot score increases with fit and demo', () => {
  const base = {
    company_name: 'A',
    website_url: 'https://a.com',
    lead_score: 60,
    updated_at: new Date().toISOString(),
    email_opted_out: false,
  };
  const a = computeHotLeadScore(base, { has_draft: false, icp_tier: 'standard' });
  const b = computeHotLeadScore(
    { ...base, demo_slug: 'acme-demo', lead_score: 80 },
    { has_draft: true, icp_tier: 'standard' }
  );
  assert.ok(b.score > a.score);
});

test('rankHotLeads orders by score', () => {
  const rows = [
    { id: '1', company_name: 'Low', website_url: 'https://l.com', lead_score: 40, updated_at: new Date().toISOString() },
    { id: '2', company_name: 'High', website_url: 'https://h.com', lead_score: 90, updated_at: new Date().toISOString() },
  ];
  const out = rankHotLeads(rows, { 1: false, 2: false }, {});
  assert.equal(out[0].id, '2');
});
