'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  shapeAnalysisListItem,
  shapeScoreListItem,
  shapeOutreachListItem,
} = require('./lead-engine-lead-detail-shape');

test('shapeAnalysisListItem', () => {
  const r = shapeAnalysisListItem({
    id: 'a',
    created_at: 't',
    signals: { success: false, failure: { type: 'http' } },
  });
  assert.equal(r.success, false);
  assert.ok(r.summary);
});

test('shapeScoreListItem', () => {
  const r = shapeScoreListItem({
    id: 's',
    analysis_id: 'x',
    created_at: 't',
    recommended_offer: 'Fix My App',
    scores: { fit_score: 50, confidence: 'low' },
  });
  assert.equal(r.fit_score, 50);
  assert.equal(r.recommended_offer, 'Fix My App');
});

test('shapeOutreachListItem truncates subject', () => {
  const long = 'x'.repeat(200);
  const r = shapeOutreachListItem({
    id: 'o',
    status: 'draft',
    created_at: 't',
    draft_subject: long,
  });
  assert.equal(r.draft_subject.length, 120);
  assert.equal(r.draft_body, '');
});

test('shapeOutreachListItem passes draft_body for History / copy', () => {
  const r = shapeOutreachListItem({
    id: 'o',
    status: 'draft',
    created_at: 't',
    draft_subject: 'Hello',
    draft_body: 'Body line one\n\nSecond paragraph.',
  });
  assert.equal(r.draft_body, 'Body line one\n\nSecond paragraph.');
});
