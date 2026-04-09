const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDeliveryIdempotencyKey } = require('./lead-engine-native-outcome-log');

test('normalizeDeliveryIdempotencyKey keeps Resend-style ids', () => {
  const id = '4a2c5d8e-1234-5678-9abc-def012345678';
  assert.equal(normalizeDeliveryIdempotencyKey(id), id);
  assert.equal(normalizeDeliveryIdempotencyKey(`  ${id}  `), id);
});

test('normalizeDeliveryIdempotencyKey rejects empty', () => {
  assert.equal(normalizeDeliveryIdempotencyKey(''), null);
  assert.equal(normalizeDeliveryIdempotencyKey(null), null);
});
