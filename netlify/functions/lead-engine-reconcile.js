/**
 * Slice I+: operator reconciliation / recovery (no CRM).
 * - mark_sent: align DB with Resend after finalize failure or manual fix.
 * - release_send_lock: clear send_started_at when no delivery occurred (duplicate-send risk if misused).
 * - mark_failed: set outreach to cancelled (abandon approved row); requires acknowledgeMarkFailed.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateReconcileBody } = require('./lib/lead-engine-outreach-actions-validate');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const { logNativeLeadOutcome, NATIVE_SOURCES } = require('./lib/lead-engine-native-outcome-log');

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) {
    return g.response;
  }

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const validated = validateReconcileBody(body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const { leadId, outreachId, action, sentAt } = validated.value;
  const operator = g.session.username || 'unknown';

  const { data: row, error: loadErr } = await supabase
    .from('lead_engine_outreach')
    .select('id, lead_id, status, send_started_at, sent_at')
    .eq('id', outreachId)
    .maybeSingle();

  if (loadErr) {
    console.error('[lead-engine-reconcile] load', loadErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load outreach row' }),
    };
  }

  if (!row || row.lead_id !== leadId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Outreach row not found for this lead' }),
    };
  }

  if (action === 'mark_sent') {
    if (row.status === 'sent') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          idempotentReplay: true,
          leadId,
          outreachId,
          status: 'sent',
          message: 'Outreach was already marked sent.',
        }),
      };
    }
    if (row.status !== 'approved') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: `mark_sent requires status approved or sent (current: ${row.status}).`,
          code: 'OUTREACH_NOT_RECONCILABLE',
        }),
      };
    }

    const sentAtIso = sentAt || new Date().toISOString();
    const { data: upd, error: upErr } = await supabase
      .from('lead_engine_outreach')
      .update({
        status: 'sent',
        sent_at: sentAtIso,
        send_started_at: null,
        updated_at: sentAtIso,
      })
      .eq('id', outreachId)
      .eq('lead_id', leadId)
      .eq('status', 'approved')
      .select('id, status, sent_at')
      .maybeSingle();

    if (upErr) {
      console.error('[lead-engine-reconcile] mark_sent', upErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update outreach row' }),
      };
    }
    if (!upd) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Row changed during reconcile; refresh and retry.',
          code: 'RECONCILE_CONFLICT',
        }),
      };
    }

    console.info(
      '[lead-engine-reconcile] mark_sent outreach=%s lead=%s operator=%s',
      outreachId,
      leadId,
      operator
    );
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      outreach_id: outreachId,
      event_type: EVENT_TYPES.RECONCILE_MARK_SENT,
      actor: operator || null,
      message: 'Reconcile action: mark_sent',
    });
    await logNativeLeadOutcome(supabase, {
      leadId,
      outreachId,
      outcome_code: 'email_delivered',
      native_source: NATIVE_SOURCES.OPERATOR_RECONCILE_MARK_SENT,
      context: 'reconcile_mark_sent',
      evidence: { sent_at: upd.sent_at || null },
      actor: operator ? `operator:${operator}` : 'operator:reconcile',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        leadId,
        outreachId,
        status: upd.status,
        sent_at: upd.sent_at,
        message: 'Marked sent (operator recovery).',
      }),
    };
  }

  if (action === 'release_send_lock') {
    if (row.status !== 'approved') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: `release_send_lock requires status approved (current: ${row.status}).`,
          code: 'OUTREACH_NOT_RECONCILABLE',
        }),
      };
    }
    if (!row.send_started_at) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'No active send lock on this row.',
          code: 'NO_SEND_LOCK',
        }),
      };
    }

    const nowIso = new Date().toISOString();
    const { data: upd, error: upErr } = await supabase
      .from('lead_engine_outreach')
      .update({ send_started_at: null, updated_at: nowIso })
      .eq('id', outreachId)
      .eq('lead_id', leadId)
      .eq('status', 'approved')
      .not('send_started_at', 'is', null)
      .select('id, status, send_started_at')
      .maybeSingle();

    if (upErr) {
      console.error('[lead-engine-reconcile] release_send_lock', upErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to clear send lock' }),
      };
    }
    if (!upd) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Row changed during reconcile; refresh and retry.',
          code: 'RECONCILE_CONFLICT',
        }),
      };
    }

    console.info(
      '[lead-engine-reconcile] release_send_lock outreach=%s lead=%s operator=%s',
      outreachId,
      leadId,
      operator
    );
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      outreach_id: outreachId,
      event_type: EVENT_TYPES.RECONCILE_RELEASE_SEND_LOCK,
      actor: operator || null,
      message: 'Reconcile action: release_send_lock',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        leadId,
        outreachId,
        status: upd.status,
        warning:
          'Only use this if the email was not delivered. If Resend already sent, releasing the lock and sending again may duplicate the message.',
      }),
    };
  }

  if (action === 'mark_failed') {
    if (row.status !== 'approved') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: `mark_failed requires status approved (current: ${row.status}).`,
          code: 'OUTREACH_NOT_RECONCILABLE',
        }),
      };
    }

    const nowIso = new Date().toISOString();
    const { data: upd, error: upErr } = await supabase
      .from('lead_engine_outreach')
      .update({
        status: 'cancelled',
        send_started_at: null,
        updated_at: nowIso,
      })
      .eq('id', outreachId)
      .eq('lead_id', leadId)
      .eq('status', 'approved')
      .select('id, status, send_started_at')
      .maybeSingle();

    if (upErr) {
      console.error('[lead-engine-reconcile] mark_failed', upErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to cancel outreach row' }),
      };
    }
    if (!upd) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Row changed during reconcile; refresh and retry.',
          code: 'RECONCILE_CONFLICT',
        }),
      };
    }

    console.info(
      '[lead-engine-reconcile] mark_failed outreach=%s lead=%s operator=%s',
      outreachId,
      leadId,
      operator
    );
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      outreach_id: outreachId,
      event_type: EVENT_TYPES.RECONCILE_MARK_FAILED,
      actor: operator || null,
      message: 'Reconcile action: mark_failed',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        leadId,
        outreachId,
        status: upd.status,
        message:
          'Outreach marked failed (cancelled). Generate a new draft and approve if you still want to send.',
      }),
    };
  }

  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Unknown action' }),
  };
};
