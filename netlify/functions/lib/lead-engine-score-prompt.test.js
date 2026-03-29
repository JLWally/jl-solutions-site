'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildScoreSystemPrompt,
  buildScoreUserContent,
  ALLOWED_OFFERS,
} = require('./lead-engine-score-prompt');

test('buildScoreSystemPrompt mentions JSON keys and offers', () => {
  const p = buildScoreSystemPrompt();
  assert.ok(p.includes('fit_score'));
  assert.ok(p.includes('confidence'));
  assert.ok(p.includes('pain_points'));
  assert.ok(p.includes('outreach_angle'));
  assert.ok(p.includes('recommended_offer'));
  for (const o of ALLOWED_OFFERS) {
    assert.ok(p.includes(o));
  }
});

test('buildScoreUserContent embeds lead and signals', () => {
  const lead = { company_name: 'Co', website_url: 'https://co.test', source: 'manual' };
  const signals = { audit_version: 1, success: true };
  const j = JSON.parse(buildScoreUserContent(lead, signals));
  assert.equal(j.company_name, 'Co');
  assert.equal(j.website_url, 'https://co.test');
  assert.equal(j.source, 'manual');
  assert.deepEqual(j.audit_signals, signals);
});
