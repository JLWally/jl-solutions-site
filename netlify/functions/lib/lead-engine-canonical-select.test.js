'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPreferredAnalysisByLead,
  buildLatestAiScoreByAnalysis,
  pickLatestAiScoreForPreferredAnalysis,
} = require('./lead-engine-canonical-select');

test('buildPreferredAnalysisByLead picks newest successful', () => {
  const rows = [
    { id: 'a1', lead_id: 'l1', created_at: '2025-01-01T00:00:00Z', signals: { success: false } },
    { id: 'a2', lead_id: 'l1', created_at: '2025-01-02T00:00:00Z', signals: { success: true } },
    { id: 'a3', lead_id: 'l2', created_at: '2025-01-03T00:00:00Z', signals: { success: false } },
  ];
  const byLead = buildPreferredAnalysisByLead(rows);
  assert.equal(byLead.get('l1').id, 'a2');
  assert.equal(byLead.get('l2').id, 'a3');
});

test('buildLatestAiScoreByAnalysis keeps newest-first first row', () => {
  const aiRowsNewestFirst = [
    { id: 's2', analysis_id: 'a1', created_at: '2025-01-02T00:00:00Z' },
    { id: 's1', analysis_id: 'a1', created_at: '2025-01-01T00:00:00Z' },
  ];
  const byAnalysis = buildLatestAiScoreByAnalysis(aiRowsNewestFirst);
  assert.equal(byAnalysis.get('a1').id, 's2');
});

test('pickLatestAiScoreForPreferredAnalysis', () => {
  const byAnalysis = new Map([['a1', { id: 's1' }]]);
  assert.equal(pickLatestAiScoreForPreferredAnalysis({ id: 'a1' }, byAnalysis).id, 's1');
  assert.equal(pickLatestAiScoreForPreferredAnalysis({ id: 'a2' }, byAnalysis), null);
});

