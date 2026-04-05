'use strict';

/**
 * After a successful custom-demo composer send, set demo_followup_due_at from template variant.
 *
 * Product defaults (business days = Mon–Fri UTC, counting starts the calendar day after send):
 * - Initial-style templates (initial, shorter, more direct) → +3 business days
 * - Follow-up 1 → +4 business days (second nudge window)
 * - Follow-up 2 → clear due date (no further automated follow-up slot from this path)
 * - Unknown / empty variant → treat as initial (+3)
 */
const INITIAL_LIKE = new Set(['initial', 'shorter', 'direct']);

function isWeekendUtc(d) {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** Advance UTC calendar day until `count` weekdays have been stepped past (send day not counted). */
function addBusinessDaysUtc(start, count) {
  const d = new Date(start.getTime());
  let remaining = count;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekendUtc(d)) remaining -= 1;
  }
  return d.toISOString();
}

/**
 * @param {string} [templateVariant]
 * @param {Date} [now]
 * @returns {{ dueAt: string|null, clearDue: boolean }}
 */
function computeDemoFollowupDueAfterSend(templateVariant, now = new Date()) {
  const v = templateVariant != null ? String(templateVariant).trim().toLowerCase() : '';
  if (v === 'followup_2') {
    return { dueAt: null, clearDue: true };
  }
  if (v === 'followup_1') {
    return { dueAt: addBusinessDaysUtc(now, 4), clearDue: false };
  }
  if (INITIAL_LIKE.has(v) || v === '') {
    return { dueAt: addBusinessDaysUtc(now, 3), clearDue: false };
  }
  return { dueAt: addBusinessDaysUtc(now, 3), clearDue: false };
}

module.exports = {
  computeDemoFollowupDueAfterSend,
  addBusinessDaysUtc,
  INITIAL_LIKE,
};
