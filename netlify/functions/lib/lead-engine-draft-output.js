/**
 * Parse and validate OpenAI JSON for outreach drafts (Slice E).
 */

const { stripMarkdownFence } = require('./lead-engine-score-output');

const MAX_SUBJECT = 200;
const MIN_BODY = 20;
const MAX_BODY = 12000;
const MAX_FOLLOW_UP = 4000;
const MAX_LINKEDIN_DM = 600;

function parseDraftModelJsonText(text) {
  const s = stripMarkdownFence(text);
  return JSON.parse(s);
}

function validateDraftOutput(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: ['Model output must be a JSON object'] };
  }

  const subject = String(obj.subject == null ? '' : obj.subject).trim();
  if (!subject) errors.push('subject is required');
  else if (subject.length > MAX_SUBJECT) errors.push(`subject must be at most ${MAX_SUBJECT} characters`);

  const body = String(obj.body == null ? '' : obj.body).trim();
  if (!body) errors.push('body is required');
  else if (body.length < MIN_BODY) errors.push(`body must be at least ${MIN_BODY} characters`);
  else if (body.length > MAX_BODY) errors.push(`body must be at most ${MAX_BODY} characters`);

  let follow_up_body = null;
  if (obj.follow_up_body != null && String(obj.follow_up_body).trim() !== '') {
    follow_up_body = String(obj.follow_up_body).trim();
    if (follow_up_body.length > MAX_FOLLOW_UP) {
      errors.push(`follow_up_body must be at most ${MAX_FOLLOW_UP} characters`);
    }
  }

  let linkedin_dm_draft = null;
  if (obj.linkedin_dm_draft != null && String(obj.linkedin_dm_draft).trim() !== '') {
    linkedin_dm_draft = String(obj.linkedin_dm_draft).trim();
    if (linkedin_dm_draft.length > MAX_LINKEDIN_DM) {
      errors.push(`linkedin_dm_draft must be at most ${MAX_LINKEDIN_DM} characters`);
    }
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      subject,
      body,
      follow_up_body,
      linkedin_dm_draft,
    },
  };
}

function composeDraftBody(mainBody, followUp) {
  if (!followUp) return mainBody;
  return `${mainBody}\n\n---\nOptional follow-up:\n${followUp}`;
}

function parseAndValidateDraftModelText(text) {
  let parsed;
  try {
    parsed = parseDraftModelJsonText(text);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON from model: ${e.message || 'parse error'}`] };
  }
  return validateDraftOutput(parsed);
}

module.exports = {
  parseDraftModelJsonText,
  validateDraftOutput,
  composeDraftBody,
  parseAndValidateDraftModelText,
  MAX_SUBJECT,
  MAX_BODY,
  MAX_LINKEDIN_DM,
};
