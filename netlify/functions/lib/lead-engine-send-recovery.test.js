'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { describeApprovedSendRecovery } = require('./lead-engine-send-recovery');
const { STALE_SEND_CLAIM_MS } = require('./lead-engine-send-state');

test('describeApprovedSendRecovery null when no lock', () => {
  assert.equal(describeApprovedSendRecovery({ status: 'approved' }), null);
  assert.equal(describeApprovedSendRecovery(null), null);
  assert.equal(describeApprovedSendRecovery({ status: 'sent', send_started_at: 't' }), null);
});

test('describeApprovedSendRecovery active lock', () => {
  const recent = new Date(Date.now() - 60000).toISOString();
  const d = describeApprovedSendRecovery({ status: 'approved', send_started_at: recent });
  assert.ok(d);
  assert.equal(d.active_lock, true);
  assert.equal(d.stale_lock, false);
  assert.ok(d.reasons.includes('send_in_progress_or_unfinalized'));
});

test('describeApprovedSendRecovery stale lock', () => {
  const old = new Date(Date.now() - STALE_SEND_CLAIM_MS - 5000).toISOString();
  const d = describeApprovedSendRecovery({ status: 'approved', send_started_at: old });
  assert.ok(d);
  assert.equal(d.stale_lock, true);
  assert.equal(d.active_lock, false);
  assert.ok(d.reasons.includes('stale_send_lock'));
});
