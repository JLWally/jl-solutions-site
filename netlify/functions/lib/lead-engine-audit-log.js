'use strict';

const EVENT_TYPES = {
  MANUAL_INGEST_CREATED: 'manual_ingest_created',
  CSV_IMPORT_COMMIT_INSERTED: 'csv_import_commit_inserted',
  ANALYZE_SUCCESS: 'analyze_success',
  ANALYZE_FAILURE: 'analyze_failure',
  SCORE_SUCCESS: 'score_success',
  SCORE_FAILURE: 'score_failure',
  DRAFT_GENERATED: 'draft_generated',
  DRAFT_FAILED: 'draft_failed',
  DRAFT_APPROVED: 'draft_approved',
  SEND_ATTEMPTED: 'send_attempted',
  SEND_SUCCEEDED: 'send_succeeded',
  RECONCILE_MARK_SENT: 'reconcile_mark_sent',
  RECONCILE_RELEASE_SEND_LOCK: 'reconcile_release_send_lock',
  RECONCILE_MARK_FAILED: 'reconcile_mark_failed',
  UNSUBSCRIBED: 'unsubscribed',
  GLOBAL_SUPPRESSION_CREATED: 'global_suppression_created',
  CRM_SYNC_SUCCEEDED: 'crm_sync_succeeded',
  CRM_SYNC_FAILED: 'crm_sync_failed',
  DEMO_GENERATED: 'demo_generated',
  /** Custom-demo composer one-click send (/internal/outreach) */
  DEMO_OUTREACH_SENT: 'demo_outreach_sent',
  DEMO_OUTREACH_SEND_FAILED: 'demo_outreach_send_failed',
  DEMO_OUTREACH_DRAFTED: 'demo_outreach_drafted',
  DEMO_OUTREACH_FOLLOWUP_DUE: 'demo_outreach_followup_due',
};

async function logLeadEngineEvent(supabase, event) {
  if (!supabase || !event || !event.event_type) {
    return { ok: false, error: new Error('Invalid audit event payload') };
  }
  const row = {
    lead_id: event.lead_id || null,
    outreach_id: event.outreach_id || null,
    analysis_id: event.analysis_id || null,
    ai_score_id: event.ai_score_id || null,
    event_type: String(event.event_type),
    actor: event.actor || null,
    message: event.message || null,
    metadata_json:
      event.metadata_json && typeof event.metadata_json === 'object'
        ? event.metadata_json
        : null,
  };
  const { error } = await supabase.from('lead_engine_events').insert(row);
  if (error) return { ok: false, error };
  return { ok: true };
}

module.exports = {
  EVENT_TYPES,
  logLeadEngineEvent,
};

