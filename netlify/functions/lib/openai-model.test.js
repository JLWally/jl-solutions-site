'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOpenAiModelId, DEFAULT_MODEL } = require('./openai-model');

test('normalizeOpenAiModelId defaults when empty', () => {
  assert.equal(normalizeOpenAiModelId(null), DEFAULT_MODEL);
  assert.equal(normalizeOpenAiModelId(''), DEFAULT_MODEL);
  assert.equal(normalizeOpenAiModelId('  '), DEFAULT_MODEL);
});

test('normalizeOpenAiModelId fixes 4.1-mini shorthand', () => {
  assert.equal(normalizeOpenAiModelId('4.1-mini'), 'gpt-4.1-mini');
  assert.equal(normalizeOpenAiModelId('4.1-MINI'), 'gpt-4.1-mini');
  assert.equal(normalizeOpenAiModelId('"4.1-mini"'), 'gpt-4.1-mini');
});

test('normalizeOpenAiModelId passes through full ids', () => {
  assert.equal(normalizeOpenAiModelId('gpt-4.1-mini'), 'gpt-4.1-mini');
  assert.equal(normalizeOpenAiModelId('gpt-4o-mini'), 'gpt-4o-mini');
});
