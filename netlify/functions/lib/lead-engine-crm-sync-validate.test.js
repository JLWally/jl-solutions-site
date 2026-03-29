'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSyncCrmBody } = require('./lead-engine-crm-sync-validate');

const goodLead = '550e8400-e29b-41d4-a716-446655440000';

test('validateSyncCrmBody accepts leadId', () => {
  const r = validateSyncCrmBody({ leadId: goodLead });
  assert.equal(r.ok, true);
  assert.equal(r.value.leadId, goodLead);
});

test('validateSyncCrmBody rejects missing or bad leadId', () => {
  assert.equal(validateSyncCrmBody({}).ok, false);
  assert.equal(validateSyncCrmBody({ leadId: 'nope' }).ok, false);
});

