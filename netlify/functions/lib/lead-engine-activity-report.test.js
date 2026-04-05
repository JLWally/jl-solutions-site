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
    { event_type: 'demo_outreach_sent', actor: 'ops1' },
    { event_type: 'demo_outreach_send_failed', actor: 'ops1' },
    { event_type: 'demo_outreach_drafted', actor: 'ops2' },
    { event_type: 'demo_outreach_followup_due', actor: 'ops2' },
  ]);
  assert.equal(out.totalEvents, 8);
  assert.equal(out.operational.recentSends, 1);
  assert.equal(out.operational.recentApprovals, 1);
  assert.equal(out.operational.recentReconciliations, 1);
  assert.equal(out.operational.recentCrmSyncFailures, 1);
  assert.equal(out.operational.recentDemoOutreachSent, 1);
  assert.equal(out.operational.recentDemoOutreachSendFailed, 1);
  assert.equal(out.operational.recentDemoOutreachDrafted, 1);
  assert.equal(out.operational.recentDemoOutreachFollowupDue, 1);
  assert.equal(out.byActor.ops1, 4);
});

