'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  pickPreferredAnalysisRow,
  pickNewestSuccessfulAnalysisRow,
  resolveScoringPayloadWithLegacyCompat,
  resolveCanonicalScoringPayloadForPreferredAnalysis,
} = require('./lead-engine-analysis-pick');

test('pickPreferredAnalysisRow prefers newest successful', () => {
  const rows = [
    { id: 'a', created_at: '2025-01-01T00:00:00Z', signals: { success: false } },
    { id: 'b', created_at: '2025-01-02T00:00:00Z', signals: { success: true } },
    { id: 'c', created_at: '2025-01-03T00:00:00Z', signals: { success: true } },
  ];
  const p = pickPreferredAnalysisRow(rows);
  assert.equal(p.id, 'c');
});

test('pickPreferredAnalysisRow falls back to newest when all failed', () => {
  const rows = [
    { id: 'a', created_at: '2025-01-01T00:00:00Z', signals: { success: false } },
    { id: 'b', created_at: '2025-01-02T00:00:00Z', signals: { success: false } },
  ];
  const p = pickPreferredAnalysisRow(rows);
  assert.equal(p.id, 'b');
});

test('pickNewestSuccessfulAnalysisRow returns null if none successful', () => {
  const rows = [{ id: 'a', created_at: '2025-01-01T00:00:00Z', signals: { success: false } }];
  assert.equal(pickNewestSuccessfulAnalysisRow(rows), null);
});

test('resolveCanonicalScoringPayloadForPreferredAnalysis prefers ai row', () => {
  const analysis = { id: 'x', scores: { fit_score: 1 } };
  const ai = {
    id: 'ai1',
    scores: { fit_score: 88, confidence: 'high' },
    recommended_offer: 'Fix My App',
    model_version: 'm',
    created_at: 't',
  };
  const s = resolveCanonicalScoringPayloadForPreferredAnalysis(analysis, ai);
  assert.equal(s.fit_score, 88);
  assert.equal(s.ai_score_id, 'ai1');
});

test('resolveCanonicalScoringPayloadForPreferredAnalysis no ai -> null', () => {
  const analysis = {
    id: 'x',
    scores: { fit_score: 40, confidence: 'low' },
    recommended_offer: 'Fix My App',
  };
  const s = resolveCanonicalScoringPayloadForPreferredAnalysis(analysis, null);
  assert.equal(s, null);
});

test('resolveScoringPayloadWithLegacyCompat legacy fallback', () => {
  const analysis = {
    id: 'x',
    scores: { fit_score: 40, confidence: 'low' },
    recommended_offer: 'Fix My App',
  };
  const s = resolveScoringPayloadWithLegacyCompat(analysis, null);
  assert.equal(s.source, 'legacy_analysis_row');
  assert.equal(s.fit_score, 40);
});
