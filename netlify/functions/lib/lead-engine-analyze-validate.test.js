'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAnalyzeBody } = require('./lead-engine-analyze-validate');

test('validateAnalyzeBody accepts UUID leadId', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const r = validateAnalyzeBody({ leadId: id });
  assert.equal(r.ok, true);
  assert.equal(r.value.leadId, id);
});

test('validateAnalyzeBody rejects missing leadId', () => {
  const r = validateAnalyzeBody({});
  assert.equal(r.ok, false);
});

test('validateAnalyzeBody rejects bad UUID', () => {
  const r = validateAnalyzeBody({ leadId: 'not-a-uuid' });
  assert.equal(r.ok, false);
});
