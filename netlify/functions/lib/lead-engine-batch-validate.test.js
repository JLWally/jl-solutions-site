'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_BATCH_SIZE,
  validateBatchLeadIdsBody,
} = require('./lead-engine-batch-validate');

test('validateBatchLeadIdsBody accepts valid array and dedupes', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const out = validateBatchLeadIdsBody({ leadIds: [id, id] });
  assert.equal(out.ok, true);
  assert.equal(out.value.leadIds.length, 1);
});

test('validateBatchLeadIdsBody rejects oversized batch', () => {
  const ids = [];
  for (let i = 0; i < MAX_BATCH_SIZE + 1; i += 1) {
    ids.push('550e8400-e29b-41d4-a716-446655440000');
  }
  const out = validateBatchLeadIdsBody({ leadIds: ids });
  assert.equal(out.ok, false);
  assert.equal(out.code, 'BATCH_TOO_LARGE');
});

