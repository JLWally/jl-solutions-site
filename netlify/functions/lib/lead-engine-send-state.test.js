'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isStaleSendClaim,
  classifyOutreachSendReadiness,
  STALE_SEND_CLAIM_MS,
} = require('./lead-engine-send-state');

test('isStaleSendClaim true when old', () => {
  const old = new Date(Date.now() - STALE_SEND_CLAIM_MS - 60000).toISOString();
  assert.equal(isStaleSendClaim(old), true);
});

test('isStaleSendClaim false when recent', () => {
  const recent = new Date(Date.now() - 60000).toISOString();
  assert.equal(isStaleSendClaim(recent), false);
});

test('classifyOutreachSendReadiness', () => {
  assert.equal(classifyOutreachSendReadiness(null), 'not_approved');
  assert.equal(classifyOutreachSendReadiness({ status: 'sent' }), 'sent');
  assert.equal(classifyOutreachSendReadiness({ status: 'draft' }), 'not_approved');
  assert.equal(classifyOutreachSendReadiness({ status: 'approved' }), 'ready');
  assert.equal(
    classifyOutreachSendReadiness({
      status: 'approved',
      send_started_at: new Date().toISOString(),
    }),
    'in_progress'
  );
  const staleAt = new Date(Date.now() - STALE_SEND_CLAIM_MS - 1000).toISOString();
  assert.equal(
    classifyOutreachSendReadiness({ status: 'approved', send_started_at: staleAt }),
    'stale_claim'
  );
});
