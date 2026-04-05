'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeDemoFollowupDueAfterSend,
  addBusinessDaysUtc,
} = require('./lead-engine-demo-followup-schedule');

test('addBusinessDaysUtc skips weekends (Mon +3 → Thu)', () => {
  const mon = new Date(Date.UTC(2026, 0, 5, 15, 0, 0)); // Monday
  const out = addBusinessDaysUtc(mon, 3);
  assert.equal(out.slice(0, 10), '2026-01-08'); // Thu
});

test('computeDemoFollowupDueAfterSend followup_2 clears', () => {
  const r = computeDemoFollowupDueAfterSend('followup_2', new Date());
  assert.equal(r.clearDue, true);
  assert.equal(r.dueAt, null);
});

test('computeDemoFollowupDueAfterSend followup_1 returns ISO', () => {
  const r = computeDemoFollowupDueAfterSend('followup_1', new Date(Date.UTC(2026, 0, 5, 12, 0, 0)));
  assert.equal(r.clearDue, false);
  assert.match(r.dueAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('computeDemoFollowupDueAfterSend initial uses 3 business days', () => {
  const r = computeDemoFollowupDueAfterSend('initial', new Date(Date.UTC(2026, 0, 5, 12, 0, 0)));
  assert.equal(r.clearDue, false);
  assert.equal(r.dueAt.slice(0, 10), '2026-01-08');
});
