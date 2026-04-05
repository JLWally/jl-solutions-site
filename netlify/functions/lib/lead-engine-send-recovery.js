/**
 * Internal send recovery hints (no CRM). Classifies approved rows with send_started_at.
 */

const { isStaleSendClaim } = require('./lead-engine-send-state');

/**
 * @param {{ status?: string, send_started_at?: string|null }|null|undefined} approvedRow, latest approved outreach compact row
 * @returns {null | { stale_lock: boolean, active_lock: boolean, reasons: string[] }}
 */
function describeApprovedSendRecovery(approvedRow) {
  if (!approvedRow || approvedRow.status !== 'approved') return null;
  if (approvedRow.send_started_at == null || approvedRow.send_started_at === '') return null;

  const stale = isStaleSendClaim(approvedRow.send_started_at);
  const reasons = stale
    ? ['stale_send_lock', 'verify_resend_then_mark_sent_or_release']
    : ['send_in_progress_or_unfinalized'];

  return {
    stale_lock: stale,
    active_lock: !stale,
    reasons,
  };
}

module.exports = {
  describeApprovedSendRecovery,
};
