/**
 * POST body for lead-engine-draft (Slice E).
 */
const { validateAnalyzeBody } = require('./lead-engine-analyze-validate');

function validateDraftBody(body) {
  const base = validateAnalyzeBody(body);
  if (!base.ok) {
    return { ok: false, errors: base.errors };
  }

  const rawChannel = body.channel;
  const channel =
    rawChannel == null || String(rawChannel).trim() === ''
      ? 'email'
      : String(rawChannel).trim().toLowerCase();

  if (channel !== 'email') {
    return {
      ok: false,
      errors: [`channel must be "email" in this release (received "${rawChannel}")`],
    };
  }

  return { ok: true, value: { leadId: base.value.leadId, channel } };
}

module.exports = { validateDraftBody };
