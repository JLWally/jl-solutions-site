'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseListQueryParams,
  sanitizeSearchForIlike,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} = require('./lead-engine-list-params');

test('parseListQueryParams defaults', () => {
  const r = parseListQueryParams({});
  assert.equal(r.ok, true);
  assert.equal(r.value.page, DEFAULT_PAGE);
  assert.equal(r.value.pageSize, DEFAULT_PAGE_SIZE);
  assert.equal(r.value.status, null);
  assert.equal(r.value.search, null);
  assert.equal(r.value.optedOut, null);
  assert.equal(r.value.suppressed, null);
  assert.equal(r.value.outreachStatus, null);
  assert.equal(r.value.recommendedOffer, null);
  assert.equal(r.value.reviewQueue, null);
  assert.equal(r.value.needsAttentionSend, false);
  assert.equal(r.value.demoOutreachStatus, null);
  assert.equal(r.value.demoFollowupDue, null);
  assert.equal(r.value.demoRecentSentDays, null);
  assert.equal(r.value.demoQueuePreset, null);
  assert.equal(r.value.includeSummary, false);
});

test('parseListQueryParams caps pageSize', () => {
  const r = parseListQueryParams({ pageSize: '500' });
  assert.equal(r.ok, true);
  assert.equal(r.value.pageSize, MAX_PAGE_SIZE);
});

test('parseListQueryParams range', () => {
  const r = parseListQueryParams({ page: '2', pageSize: '10' });
  assert.equal(r.ok, true);
  assert.equal(r.value.rangeFrom, 10);
  assert.equal(r.value.rangeTo, 19);
});

test('parseListQueryParams invalid status', () => {
  const r = parseListQueryParams({ status: 'bogus' });
  assert.equal(r.ok, false);
});

test('parseListQueryParams search sanitizes commas', () => {
  const r = parseListQueryParams({ search: 'foo,bar' });
  assert.equal(r.ok, true);
  assert.equal(r.value.search, 'foo bar');
});

test('sanitizeSearchForIlike removes parens', () => {
  assert.equal(sanitizeSearchForIlike('a(b)c'), 'a b c');
});

test('parseListQueryParams Slice G filters', () => {
  const r = parseListQueryParams({
    optedOut: 'true',
    outreachStatus: 'draft',
    recommendedOffer: 'Fix My App',
    includeSummary: '1',
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.optedOut, true);
  assert.equal(r.value.outreachStatus, 'draft');
  assert.equal(r.value.recommendedOffer, 'Fix My App');
  assert.equal(r.value.includeSummary, true);
});

test('parseListQueryParams rejects bad optedOut', () => {
  const r = parseListQueryParams({ optedOut: 'maybe' });
  assert.equal(r.ok, false);
});

test('parseListQueryParams suppressed filter', () => {
  const r = parseListQueryParams({ suppressed: 'true' });
  assert.equal(r.ok, true);
  assert.equal(r.value.suppressed, true);
  const r2 = parseListQueryParams({ suppressed: 'no' });
  assert.equal(r2.ok, true);
  assert.equal(r2.value.suppressed, false);
});

test('parseListQueryParams rejects bad suppressed', () => {
  const r = parseListQueryParams({ suppressed: 'global' });
  assert.equal(r.ok, false);
});

test('parseListQueryParams rejects bad outreachStatus', () => {
  const r = parseListQueryParams({ outreachStatus: 'pending' });
  assert.equal(r.ok, false);
});

test('parseListQueryParams needsAttention send', () => {
  const r = parseListQueryParams({ needsAttention: 'send' });
  assert.equal(r.ok, true);
  assert.equal(r.value.needsAttentionSend, true);
  const r2 = parseListQueryParams({ needsAttention: '1' });
  assert.equal(r2.value.needsAttentionSend, true);
});

test('parseListQueryParams rejects bad needsAttention', () => {
  const r = parseListQueryParams({ needsAttention: 'crm' });
  assert.equal(r.ok, false);
});

test('parseListQueryParams reviewQueue', () => {
  const r = parseListQueryParams({ reviewQueue: 'multiple_drafts' });
  assert.equal(r.ok, true);
  assert.equal(r.value.reviewQueue, 'multiple_drafts');
});

test('parseListQueryParams rejects bad reviewQueue', () => {
  const r = parseListQueryParams({ reviewQueue: 'foo' });
  assert.equal(r.ok, false);
});

test('parseListQueryParams demoOutreachStatus', () => {
  const r = parseListQueryParams({ demoOutreachStatus: 'copied' });
  assert.equal(r.ok, true);
  assert.equal(r.value.demoOutreachStatus, 'copied');
  const u = parseListQueryParams({ demoOutreachStatus: 'unset' });
  assert.equal(u.ok, true);
  assert.equal(u.value.demoOutreachStatus, 'unset');
  const bad = parseListQueryParams({ demoOutreachStatus: 'nope' });
  assert.equal(bad.ok, false);
});

test('parseListQueryParams demoFollowupDue', () => {
  const r = parseListQueryParams({ demoFollowupDue: 'overdue' });
  assert.equal(r.ok, true);
  assert.equal(r.value.demoFollowupDue, 'overdue');
  const n2 = parseListQueryParams({ demoFollowupDue: 'next_2_days' });
  assert.equal(n2.ok, true);
  assert.equal(n2.value.demoFollowupDue, 'next_2_days');
  const bad = parseListQueryParams({ demoFollowupDue: 'soon' });
  assert.equal(bad.ok, false);
});

test('parseListQueryParams demoRecentSentDays', () => {
  const r = parseListQueryParams({ demoRecentSentDays: '7' });
  assert.equal(r.ok, true);
  assert.equal(r.value.demoRecentSentDays, 7);
  const bad = parseListQueryParams({ demoRecentSentDays: '99' });
  assert.equal(bad.ok, false);
});

test('parseListQueryParams demoOutreachStatus send_failed', () => {
  const r = parseListQueryParams({ demoOutreachStatus: 'send_failed' });
  assert.equal(r.ok, true);
  assert.equal(r.value.demoOutreachStatus, 'send_failed');
});

test('parseListQueryParams demoOutreachStatus outcomes', () => {
  const r = parseListQueryParams({ demoOutreachStatus: 'interested' });
  assert.equal(r.ok, true);
  assert.equal(r.value.demoOutreachStatus, 'interested');
});

test('parseListQueryParams demoQueuePreset daily_action', () => {
  const r = parseListQueryParams({ demoQueuePreset: 'daily_action' });
  assert.equal(r.ok, true);
  assert.equal(r.value.demoQueuePreset, 'daily_action');
  assert.equal(r.value.demoOutreachStatus, null);
  assert.equal(r.value.demoFollowupDue, null);
});

test('parseListQueryParams demoQueuePreset clears conflicting demo filters', () => {
  const r = parseListQueryParams({
    demoQueuePreset: 'daily_action',
    demoFollowupDue: 'today',
    demoOutreachStatus: 'send_failed',
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.demoQueuePreset, 'daily_action');
  assert.equal(r.value.demoOutreachStatus, null);
  assert.equal(r.value.demoFollowupDue, null);
});

test('parseListQueryParams demoQueuePreset invalid', () => {
  const r = parseListQueryParams({ demoQueuePreset: 'weekly' });
  assert.equal(r.ok, false);
});
