'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmailForSuppression } = require('./lead-engine-email-normalize');

test('normalizeEmailForSuppression trim + lowercase only', () => {
  assert.equal(normalizeEmailForSuppression('  Alice+Tag@Example.COM  '), 'alice+tag@example.com');
  assert.equal(normalizeEmailForSuppression(''), null);
  assert.equal(normalizeEmailForSuppression('   '), null);
  assert.equal(normalizeEmailForSuppression(null), null);
});

