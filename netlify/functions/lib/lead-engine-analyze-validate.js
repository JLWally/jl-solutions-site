/**
 * POST body validation for lead-engine-analyze (Slice C).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateAnalyzeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }
  const leadId = body.leadId != null ? String(body.leadId).trim() : '';
  if (!leadId) {
    return { ok: false, errors: ['leadId is required'] };
  }
  if (!UUID_RE.test(leadId)) {
    return { ok: false, errors: ['leadId must be a valid UUID'] };
  }
  return { ok: true, value: { leadId } };
}

module.exports = { validateAnalyzeBody, UUID_RE };
