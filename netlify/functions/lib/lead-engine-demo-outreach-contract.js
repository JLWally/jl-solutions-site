'use strict';

/**
 * Single source of truth for lead_engine_leads.demo_outreach_status (DB CHECK + API + list filters).
 * List query param `unset` is a filter keyword only — not stored in the database.
 */
const DEMO_OUTREACH_STATUS_VALUES = [
  'drafted',
  'copied',
  'sent_manual',
  'followup_due',
  'send_failed',
  'replied',
  'interested',
  'not_interested',
];

const DEMO_OUTREACH_STATUS_SET = new Set(DEMO_OUTREACH_STATUS_VALUES);

function allowedDemoOutreachStatusesHumanList() {
  return DEMO_OUTREACH_STATUS_VALUES.join(', ');
}

/**
 * @param {unknown} raw - request body `status` before normalization
 * @returns {{ ok: true, value: null|string } | { ok: false, error: string, code: string, details: string }}
 */
function validateDemoOutreachStatusForWrite(raw) {
  if (raw === '' || raw === undefined || raw === null) {
    return { ok: true, value: null };
  }
  const s = String(raw).trim().toLowerCase();
  if (!DEMO_OUTREACH_STATUS_SET.has(s)) {
    return {
      ok: false,
      error: 'Invalid demo outreach status',
      code: 'INVALID_DEMO_OUTREACH_STATUS',
      details: `status must be one of: ${allowedDemoOutreachStatusesHumanList()}, or empty/null to clear.`,
    };
  }
  return { ok: true, value: s };
}

module.exports = {
  DEMO_OUTREACH_STATUS_VALUES,
  DEMO_OUTREACH_STATUS_SET,
  allowedDemoOutreachStatusesHumanList,
  validateDemoOutreachStatusForWrite,
};
