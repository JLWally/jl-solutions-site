'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDraftBody } = require('./lead-engine-draft-validate');

const UUID = '550e8400-e29b-41d4-a716-446655440000';

test('validateDraftBody defaults channel to email', () => {
  const r = validateDraftBody({ leadId: UUID });
  assert.equal(r.ok, true);
  assert.equal(r.value.channel, 'email');
});

test('validateDraftBody rejects non-email channel', () => {
  const r = validateDraftBody({ leadId: UUID, channel: 'sms' });
  assert.equal(r.ok, false);
});
