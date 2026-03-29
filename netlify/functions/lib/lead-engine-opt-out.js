/**
 * Lead-level email opt-out (Slice F). Token is stored on the lead row; do not expose in list API.
 *
 * **Send path (Slice H):** `lead-engine-send` re-checks `email_opted_out` after acquiring a send lock
 * so a concurrent unsubscribe cannot slip through.
 *
 * **Future:** A global suppression list keyed by normalized email could be checked here and in send;
 * not implemented in this slice.
 */

function isLeadEmailSendBlocked(lead) {
  if (!lead || typeof lead !== 'object') return true;
  return lead.email_opted_out === true;
}

function classifyEmailSendBlock({ leadOptedOut, globallySuppressed }) {
  if (leadOptedOut) return { blocked: true, code: 'LEAD_OPTED_OUT' };
  if (globallySuppressed) return { blocked: true, code: 'GLOBAL_EMAIL_SUPPRESSED' };
  return { blocked: false, code: null };
}

module.exports = { isLeadEmailSendBlocked, classifyEmailSendBlock };
