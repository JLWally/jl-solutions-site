/**
 * Slice H: send claim / idempotency / reconciliation hints (no CRM).
 */

const STALE_SEND_CLAIM_MS = 15 * 60 * 1000;

function isStaleSendClaim(sendStartedAtIso) {
  if (!sendStartedAtIso) return true;
  const t = new Date(sendStartedAtIso).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > STALE_SEND_CLAIM_MS;
}

/**
 * @param {{ status: string, send_started_at?: string|null, sent_at?: string|null }} row
 * @returns {'ready'|'in_progress'|'stale_claim'|'sent'|'not_approved'}
 */
function classifyOutreachSendReadiness(row) {
  if (!row) return 'not_approved';
  if (row.status === 'sent') return 'sent';
  if (row.status !== 'approved') return 'not_approved';
  if (!row.send_started_at) return 'ready';
  if (isStaleSendClaim(row.send_started_at)) return 'stale_claim';
  return 'in_progress';
}

/**
 * Finalize after Resend success; retries reduce transient DB blips.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function finalizeOutreachSentWithRetries(supabase, outreachId, claimedAtIso, sentAtIso, retries = 3) {
  let lastErr = null;
  for (let i = 0; i < retries; i += 1) {
    const { data, error } = await supabase
      .from('lead_engine_outreach')
      .update({
        status: 'sent',
        sent_at: sentAtIso,
        send_started_at: null,
        updated_at: sentAtIso,
      })
      .eq('id', outreachId)
      .eq('status', 'approved')
      .eq('send_started_at', claimedAtIso)
      .select('id, status, sent_at, updated_at')
      .maybeSingle();

    if (!error && data) return { ok: true, data };
    lastErr = error;
    await new Promise((r) => setTimeout(r, 200 * (i + 1)));
  }
  return { ok: false, error: lastErr };
}

/**
 * Claim `send_started_at` on an approved row (atomic duplicate protection).
 */
async function claimApprovedOutreachForSend(supabase, outreachId) {
  const nowIso = new Date().toISOString();
  const { data: row, error: loadErr } = await supabase
    .from('lead_engine_outreach')
    .select('id, status, send_started_at')
    .eq('id', outreachId)
    .maybeSingle();

  if (loadErr) {
    return { kind: 'error', message: 'Failed to load outreach row' };
  }
  if (!row) {
    return { kind: 'error', message: 'Outreach not found' };
  }
  if (row.status === 'sent') {
    return { kind: 'already_sent' };
  }
  if (row.status !== 'approved') {
    return { kind: 'bad_state', status: row.status };
  }

  if (row.send_started_at) {
    if (!isStaleSendClaim(row.send_started_at)) {
      return { kind: 'in_progress' };
    }
    await supabase
      .from('lead_engine_outreach')
      .update({ send_started_at: null, updated_at: nowIso })
      .eq('id', outreachId)
      .eq('status', 'approved');
  }

  const claimedAt = new Date().toISOString();
  const { data: upd, error: upErr } = await supabase
    .from('lead_engine_outreach')
    .update({ send_started_at: claimedAt, updated_at: claimedAt })
    .eq('id', outreachId)
    .eq('status', 'approved')
    .is('send_started_at', null)
    .select('id')
    .maybeSingle();

  if (upErr) {
    return { kind: 'error', message: 'Failed to claim send lock' };
  }
  if (!upd) {
    const { data: r2 } = await supabase
      .from('lead_engine_outreach')
      .select('id, status, send_started_at')
      .eq('id', outreachId)
      .maybeSingle();
    if (r2 && r2.status === 'sent') {
      return { kind: 'already_sent' };
    }
    if (r2 && r2.send_started_at && !isStaleSendClaim(r2.send_started_at)) {
      return { kind: 'in_progress' };
    }
    return { kind: 'error', message: 'Send lock busy; retry shortly.' };
  }

  return { kind: 'claimed', claimedAt };
}

async function releaseSendClaim(supabase, outreachId) {
  const nowIso = new Date().toISOString();
  await supabase
    .from('lead_engine_outreach')
    .update({ send_started_at: null, updated_at: nowIso })
    .eq('id', outreachId)
    .eq('status', 'approved');
}

module.exports = {
  STALE_SEND_CLAIM_MS,
  isStaleSendClaim,
  classifyOutreachSendReadiness,
  finalizeOutreachSentWithRetries,
  claimApprovedOutreachForSend,
  releaseSendClaim,
};
