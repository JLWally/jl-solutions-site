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

  let operatorIntent = 'new';
  if (body.operatorIntent != null && String(body.operatorIntent).trim() !== '') {
    const raw = String(body.operatorIntent).trim().toLowerCase();
    if (raw === 'regenerate' || raw === 'new') operatorIntent = raw;
    else {
      return { ok: false, errors: ['operatorIntent must be "new" or "regenerate" when provided'] };
    }
  }

  return { ok: true, value: { leadId: base.value.leadId, channel, operatorIntent } };
}

module.exports = { validateDraftBody };
