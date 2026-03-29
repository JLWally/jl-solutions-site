'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  stripMarkdownFence,
  validateScoreOutput,
  parseAndValidateScoreModelText,
  normalizeOffer,
  normalizeConfidence,
} = require('./lead-engine-score-output');

test('stripMarkdownFence removes json fence', () => {
  const t = stripMarkdownFence('```json\n{"a":1}\n```');
  assert.equal(t, '{"a":1}');
});

test('normalizeConfidence and normalizeOffer', () => {
  assert.equal(normalizeConfidence('HIGH'), 'high');
  assert.equal(normalizeConfidence('nope'), null);
  assert.equal(normalizeOffer('Website Redesign'), 'Website Redesign');
  assert.equal(normalizeOffer('website redesign'), 'Website Redesign');
  assert.equal(normalizeOffer('Unknown'), null);
});

test('validateScoreOutput accepts valid payload', () => {
  const r = validateScoreOutput({
    fit_score: 72,
    confidence: 'medium',
    pain_points: ['Weak CTA', 'No booking'],
    outreach_angle: 'Focus on scheduling friction.',
    recommended_offer: 'Scheduling & Resource Routing',
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.fit_score, 72);
  assert.equal(r.value.pain_points.length, 2);
});

test('validateScoreOutput rejects bad fit_score', () => {
  const r = validateScoreOutput({
    fit_score: 101,
    confidence: 'low',
    pain_points: [],
    outreach_angle: 'x',
    recommended_offer: 'Fix My App',
  });
  assert.equal(r.ok, false);
});

test('parseAndValidateScoreModelText', () => {
  const text = '{"fit_score":50,"confidence":"low","pain_points":[],"outreach_angle":"Test","recommended_offer":"AI Intake Form Setup"}';
  const r = parseAndValidateScoreModelText(text);
  assert.equal(r.ok, true);
  assert.equal(r.value.recommended_offer, 'AI Intake Form Setup');
});

test('parseAndValidateScoreModelText rejects invalid JSON', () => {
  const r = parseAndValidateScoreModelText('not json');
  assert.equal(r.ok, false);
});
