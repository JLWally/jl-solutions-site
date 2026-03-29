'use strict';

const { validateBatchLeadIdsBody } = require('./lead-engine-batch-validate');

function validateBatchDraftBody(body) {
  const base = validateBatchLeadIdsBody(body);
  if (!base.ok) return base;

  const rawChannel = body.channel;
  const channel =
    rawChannel == null || String(rawChannel).trim() === ''
      ? 'email'
      : String(rawChannel).trim().toLowerCase();
  if (channel !== 'email') {
    return {
      ok: false,
      errors: [`channel must be "email" in this release (received "${rawChannel}")`],
      code: 'INVALID_CHANNEL',
    };
  }
  return { ok: true, value: { leadIds: base.value.leadIds, channel } };
}

module.exports = { validateBatchDraftBody };

