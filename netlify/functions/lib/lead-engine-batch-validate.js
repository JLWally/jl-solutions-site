'use strict';

const { UUID_RE } = require('./lead-engine-analyze-validate');

const MAX_BATCH_SIZE = 20;

function validateBatchLeadIdsBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }
  if (!Array.isArray(body.leadIds)) {
    return { ok: false, errors: ['leadIds must be an array'] };
  }
  const leadIds = body.leadIds
    .map((v) => String(v == null ? '' : v).trim())
    .filter(Boolean);
  if (!leadIds.length) {
    return { ok: false, errors: ['leadIds must include at least one UUID'] };
  }
  if (leadIds.length > MAX_BATCH_SIZE) {
    return {
      ok: false,
      errors: [`leadIds exceeds max batch size (${MAX_BATCH_SIZE})`],
      code: 'BATCH_TOO_LARGE',
    };
  }
  for (const id of leadIds) {
    if (!UUID_RE.test(id)) {
      return { ok: false, errors: [`Invalid leadId: ${id}`] };
    }
  }
  return { ok: true, value: { leadIds: [...new Set(leadIds)] } };
}

module.exports = {
  MAX_BATCH_SIZE,
  validateBatchLeadIdsBody,
};

