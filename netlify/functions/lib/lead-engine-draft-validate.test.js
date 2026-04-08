'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDraftBody } = require('./lead-engine-draft-validate');

const UUID = '550e8400-e29b-41d4-a716-446655440000';

test('validateDraftBody defaults channel to email', () => {
  const r = validateDraftBody({ leadId: UUID });
  assert.equal(r.ok, true);
  assert.equal(r.value.channel, 'email');
  assert.equal(r.value.operatorIntent, 'new');
});

test('validateDraftBody accepts operatorIntent regenerate', () => {
  const r = validateDraftBody({ leadId: UUID, operatorIntent: 'regenerate' });
  assert.equal(r.ok, true);
  assert.equal(r.value.operatorIntent, 'regenerate');
});

test('validateDraftBody rejects non-email channel', () => {
  const r = validateDraftBody({ leadId: UUID, channel: 'sms' });
  assert.equal(r.ok, false);
});
