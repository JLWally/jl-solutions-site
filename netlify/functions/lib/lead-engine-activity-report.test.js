'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildActivitySummary } = require('./lead-engine-activity-report');

test('buildActivitySummary aggregates key counters', () => {
  const out = buildActivitySummary([
    { event_type: 'send_succeeded', actor: 'ops1' },
    { event_type: 'draft_approved', actor: 'ops1' },
    { event_type: 'reconcile_mark_sent', actor: 'ops2' },
    { event_type: 'crm_sync_failed', actor: 'ops2' },
  ]);
  assert.equal(out.totalEvents, 4);
  assert.equal(out.operational.recentSends, 1);
  assert.equal(out.operational.recentApprovals, 1);
  assert.equal(out.operational.recentReconciliations, 1);
  assert.equal(out.operational.recentCrmSyncFailures, 1);
  assert.equal(out.byActor.ops1, 2);
});

