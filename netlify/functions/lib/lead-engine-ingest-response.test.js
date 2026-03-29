'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ingestSuccessBody } = require('./lead-engine-ingest-response');

test('ingestSuccessBody idempotent replay flags', () => {
  const lead = { id: '1' };
  const a = ingestSuccessBody(lead, { idempotentReplay: true });
  assert.deepEqual(a, { lead, idempotentReplay: true });
  const b = ingestSuccessBody(lead, { duplicateReplay: true });
  assert.deepEqual(b, { lead, duplicateReplay: true });
});

test('ingestSuccessBody create has no replay flags', () => {
  const lead = { id: '2' };
  assert.deepEqual(ingestSuccessBody(lead), { lead });
});
