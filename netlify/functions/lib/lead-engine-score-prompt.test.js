'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildScoreSystemPrompt,
  buildScoreUserContent,
  ALLOWED_OFFERS,
} = require('./lead-engine-score-prompt');

test('buildScoreSystemPrompt mentions JSON keys and offers', () => {
  const p = buildScoreSystemPrompt({ selected_offer: 'Scheduling & Resource Routing' });
  assert.ok(p.includes('fit_score'));
  assert.ok(p.includes('confidence'));
  assert.ok(p.includes('pain_points'));
  assert.ok(p.includes('outreach_angle'));
  assert.ok(p.includes('recommended_offer'));
  assert.ok(p.includes('offer_rationale'));
  assert.ok(p.includes('pre-selected'));
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

test('buildScoreUserContent includes deterministic_offer_selection when passed', () => {
  const lead = { company_name: 'Co', website_url: 'https://co.test', source: 'manual' };
  const signals = { success: true };
  const det = {
    selected_offer: 'AI Intake Form Setup',
    offer_scores: {},
    top_supporting_signals: ['a'],
    draft_angle: 'x',
    is_hvac: false,
    fix_my_app_eligible: false,
  };
  const j = JSON.parse(buildScoreUserContent(lead, signals, det));
  assert.equal(j.deterministic_offer_selection.selected_offer, 'AI Intake Form Setup');
});
