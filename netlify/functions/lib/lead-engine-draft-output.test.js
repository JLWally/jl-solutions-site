'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateDraftOutput,
  composeDraftBody,
  parseAndValidateDraftModelText,
} = require('./lead-engine-draft-output');

test('validateDraftOutput accepts valid', () => {
  const r = validateDraftOutput({
    subject: 'Hello from JL Solutions',
    body: 'x'.repeat(80),
  });
  assert.equal(r.ok, true);
});

test('validateDraftOutput rejects short body', () => {
  const r = validateDraftOutput({ subject: 'S', body: 'short' });
  assert.equal(r.ok, false);
});

test('composeDraftBody appends follow-up', () => {
  const c = composeDraftBody('Main', 'Next');
  assert.ok(c.includes('Main'));
  assert.ok(c.includes('follow-up'));
  assert.ok(c.includes('Next'));
});

test('parseAndValidateDraftModelText', () => {
  const text = JSON.stringify({
    subject: 'Subj',
    body: 'y'.repeat(50),
    follow_up_body: 'z'.repeat(30),
  });
  const r = parseAndValidateDraftModelText(text);
  assert.equal(r.ok, true);
  assert.equal(r.value.follow_up_body.length, 30);
});

test('validateDraftOutput accepts optional linkedin_dm_draft', () => {
  const r = validateDraftOutput({
    subject: 'Hello',
    body: 'x'.repeat(80),
    linkedin_dm_draft: 'Short note for manual send.',
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.linkedin_dm_draft, 'Short note for manual send.');
});
