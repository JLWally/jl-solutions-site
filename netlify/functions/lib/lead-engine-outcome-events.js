'use strict';

const LEAD_OUTCOME_EVENT = 'lead_outcome';

const OUTCOME_CODES = [
  'bounced',
  'replied',
  'interested',
  'meeting_booked',
  'not_a_fit',
  'converted_opportunity',
  'unsubscribed',
  'crm_stage_changed',
  'email_delivered',
  'spam_complaint',
];

function isValidOutcomeCode(code) {
  return OUTCOME_CODES.includes(code);
}

function isPositiveOutcome(code) {
  return code === 'replied' || code === 'interested' || code === 'meeting_booked' || code === 'converted_opportunity';
}

function isNativePipelineOutcomeMeta(metadata) {
  const m = metadata && typeof metadata === 'object' ? metadata : {};
  return m.capture_kind === 'native_pipeline';
}

module.exports = {
  LEAD_OUTCOME_EVENT,
  OUTCOME_CODES,
  isValidOutcomeCode,
  isPositiveOutcome,
  isNativePipelineOutcomeMeta,
};
