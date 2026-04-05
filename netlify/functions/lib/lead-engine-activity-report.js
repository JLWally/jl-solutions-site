'use strict';

function buildActivitySummary(rows) {
  const byEventType = {};
  const byActor = {};
  let recentSends = 0;
  let recentApprovals = 0;
  let recentReconciliations = 0;
  let recentCrmSyncFailures = 0;
  let recentDemoOutreachSent = 0;
  let recentDemoOutreachSendFailed = 0;
  let recentDemoOutreachDrafted = 0;
  let recentDemoOutreachFollowupDue = 0;

  for (const r of rows || []) {
    const type = String(r.event_type || 'unknown');
    byEventType[type] = (byEventType[type] || 0) + 1;
    const actor = r.actor ? String(r.actor) : 'unknown';
    byActor[actor] = (byActor[actor] || 0) + 1;

    if (type === 'send_succeeded') recentSends += 1;
    if (type === 'draft_approved') recentApprovals += 1;
    if (
      type === 'reconcile_mark_sent' ||
      type === 'reconcile_release_send_lock' ||
      type === 'reconcile_mark_failed'
    ) {
      recentReconciliations += 1;
    }
    if (type === 'crm_sync_failed') recentCrmSyncFailures += 1;
    if (type === 'demo_outreach_sent') recentDemoOutreachSent += 1;
    if (type === 'demo_outreach_send_failed') recentDemoOutreachSendFailed += 1;
    if (type === 'demo_outreach_drafted') recentDemoOutreachDrafted += 1;
    if (type === 'demo_outreach_followup_due') recentDemoOutreachFollowupDue += 1;
  }

  return {
    totalEvents: (rows || []).length,
    byEventType,
    byActor,
    operational: {
      recentSends,
      recentApprovals,
      recentReconciliations,
      recentCrmSyncFailures,
      recentDemoOutreachSent,
      recentDemoOutreachSendFailed,
      recentDemoOutreachDrafted,
      recentDemoOutreachFollowupDue,
    },
  };
}

module.exports = { buildActivitySummary };

