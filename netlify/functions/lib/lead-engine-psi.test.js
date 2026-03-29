'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreToInt, buildPsiSignalBundle } = require('./lead-engine-psi');

test('scoreToInt maps Lighthouse 0-1 to 0-100', () => {
  assert.equal(scoreToInt(0.42), 42);
  assert.equal(scoreToInt(42), 42);
});

test('buildPsiSignalBundle picks primary from first ok page', () => {
  const bundle = buildPsiSignalBundle([
    {
      ok: true,
      url: 'https://a.com/',
      scores: {
        page_speed_score: 40,
        performance: 40,
        accessibility: 80,
        best_practices: 70,
        seo: 60,
      },
      accessibility_flags: ['color-contrast'],
    },
  ]);
  assert.equal(bundle.primary_scores.performance_score, 40);
  assert.equal(bundle.primary_scores.accessibility_flags[0], 'color-contrast');
});
