'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeBatchOutcomes } = require('./lead-engine-batch-result');

test('summarizeBatchOutcomes counts succeeded/skipped/failed', () => {
  const out = summarizeBatchOutcomes([
    { outcome: 'succeeded' },
    { outcome: 'skipped' },
    { outcome: 'failed' },
    { outcome: 'failed' },
  ]);
  assert.deepEqual(out, { total: 4, succeeded: 1, skipped: 1, failed: 2 });
});

