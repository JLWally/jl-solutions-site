'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBatchDraftBody } = require('./lead-engine-batch-draft-validate');

test('validateBatchDraftBody accepts leadIds with default email channel', () => {
  const out = validateBatchDraftBody({
    leadIds: ['550e8400-e29b-41d4-a716-446655440000'],
  });
  assert.equal(out.ok, true);
  assert.equal(out.value.channel, 'email');
});

test('validateBatchDraftBody rejects non-email channel', () => {
  const out = validateBatchDraftBody({
    leadIds: ['550e8400-e29b-41d4-a716-446655440000'],
    channel: 'linkedin',
  });
  assert.equal(out.ok, false);
  assert.equal(out.code, 'INVALID_CHANNEL');
});

