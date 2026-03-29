'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  summarizeOutreachRowsForReview,
  doesLeadMatchReviewQueue,
} = require('./lead-engine-review-queue');

test('summarizeOutreachRowsForReview computes latest and counts', () => {
  const s = summarizeOutreachRowsForReview([
    { id: 'd2', status: 'draft', created_at: '2025-01-03T00:00:00Z' },
    { id: 'a1', status: 'approved', created_at: '2025-01-02T00:00:00Z' },
    { id: 'd1', status: 'draft', created_at: '2025-01-01T00:00:00Z' },
  ]);
  assert.equal(s.latestStatus, 'draft');
  assert.equal(s.hasDraft, true);
  assert.equal(s.draftCount, 2);
  assert.equal(s.multipleDrafts, true);
  assert.equal(s.latestDraftId, 'd2');
});

test('doesLeadMatchReviewQueue modes', () => {
  const summary = {
    latestStatus: 'approved',
    hasDraft: true,
    multipleDrafts: true,
  };
  assert.equal(doesLeadMatchReviewQueue(summary, 'has_draft'), true);
  assert.equal(doesLeadMatchReviewQueue(summary, 'latest_draft'), false);
  assert.equal(doesLeadMatchReviewQueue(summary, 'latest_approved'), true);
  assert.equal(doesLeadMatchReviewQueue(summary, 'multiple_drafts'), true);
  assert.equal(doesLeadMatchReviewQueue(summary, 'needs_review'), false);
});

