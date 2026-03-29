'use strict';

function summarizeBatchOutcomes(outcomes) {
  const summary = { total: 0, succeeded: 0, skipped: 0, failed: 0 };
  for (const row of outcomes || []) {
    summary.total += 1;
    if (row.outcome === 'succeeded') summary.succeeded += 1;
    else if (row.outcome === 'skipped') summary.skipped += 1;
    else summary.failed += 1;
  }
  return summary;
}

module.exports = { summarizeBatchOutcomes };

