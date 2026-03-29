'use strict';

const { UUID_RE } = require('./lead-engine-analyze-validate');

function validateSyncCrmBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }
  const leadId = body.leadId != null ? String(body.leadId).trim() : '';
  if (!leadId) return { ok: false, errors: ['leadId is required'] };
  if (!UUID_RE.test(leadId)) return { ok: false, errors: ['leadId must be a valid UUID'] };
  return { ok: true, value: { leadId } };
}

module.exports = {
  validateSyncCrmBody,
};

