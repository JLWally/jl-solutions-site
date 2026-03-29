/**
 * Parse and validate OpenAI JSON output for lead scoring (Slice D).
 */

const { ALLOWED_OFFERS } = require('./lead-engine-score-prompt');

const OFFER_CANONICAL = new Map(
  ALLOWED_OFFERS.map((o) => [o.toLowerCase().replace(/\s+/g, ' ').trim(), o])
);

const CONFIDENCE_SET = new Set(['low', 'medium', 'high']);

function stripMarkdownFence(text) {
  let s = String(text || '').trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  }
  return s;
}

function parseScoreModelJsonText(text) {
  const s = stripMarkdownFence(text);
  return JSON.parse(s);
}

function normalizeConfidence(raw) {
  const c = String(raw || '')
    .trim()
    .toLowerCase();
  if (CONFIDENCE_SET.has(c)) return c;
  return null;
}

function normalizeOffer(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!s) return null;
  return OFFER_CANONICAL.get(s.toLowerCase()) || null;
}

function parseFitScore(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false };
  if (!Number.isInteger(n)) return { ok: false };
  if (n < 0 || n > 100) return { ok: false };
  return { ok: true, value: n };
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, errors: string[] }}
 */
function validateScoreOutput(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: ['Model output must be a JSON object'] };
  }

  const fitParsed = parseFitScore(obj.fit_score);
  if (!fitParsed.ok) {
    errors.push('fit_score must be an integer between 0 and 100');
  }
  const fit = fitParsed.ok ? fitParsed.value : null;

  const conf = normalizeConfidence(obj.confidence);
  if (!conf) errors.push('confidence must be low, medium, or high');

  let pain = obj.pain_points;
  if (!Array.isArray(pain)) {
    errors.push('pain_points must be an array');
    pain = [];
  }
  const painClean = pain
    .map((p) => String(p == null ? '' : p).trim())
    .filter(Boolean)
    .slice(0, 5);
  if (pain.length > 0 && painClean.length === 0) {
    errors.push('pain_points entries must be non-empty strings');
  }

  const angle = String(obj.outreach_angle == null ? '' : obj.outreach_angle).trim();
  if (!angle) errors.push('outreach_angle is required');

  const rawOffer = obj.recommended_offer;
  const offerTrim = rawOffer == null ? '' : String(rawOffer).trim();
  let offer = normalizeOffer(rawOffer);
  if (offerTrim && !offer) {
    errors.push(`recommended_offer must be one of: ${ALLOWED_OFFERS.join(', ')} (or omit)`);
  }

  const rationale = String(obj.offer_rationale == null ? '' : obj.offer_rationale).trim();
  if (!rationale) errors.push('offer_rationale is required (2–4 sentences explaining the pre-selected offer)');
  if (rationale.length > 2000) errors.push('offer_rationale is too long');

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fit_score: fit,
      confidence: conf,
      pain_points: painClean,
      outreach_angle: angle,
      recommended_offer: offer,
      offer_rationale: rationale,
    },
  };
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, errors: string[] }}
 */
function parseAndValidateScoreModelText(text) {
  let parsed;
  try {
    parsed = parseScoreModelJsonText(text);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON from model: ${e.message || 'parse error'}`] };
  }
  return validateScoreOutput(parsed);
}

/**
 * Parse model JSON, then force recommended_offer to the deterministic winner before validation
 * (avoids failing the whole score on a mismatched echo).
 */
function parseAndValidateScoreModelTextWithFixedOffer(text, selectedOffer) {
  let parsed;
  try {
    parsed = parseScoreModelJsonText(text);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON from model: ${e.message || 'parse error'}`] };
  }
  if (selectedOffer) parsed.recommended_offer = selectedOffer;
  return validateScoreOutput(parsed);
}

module.exports = {
  stripMarkdownFence,
  parseScoreModelJsonText,
  normalizeConfidence,
  normalizeOffer,
  validateScoreOutput,
  parseAndValidateScoreModelText,
  parseAndValidateScoreModelTextWithFixedOffer,
  CONFIDENCE_SET,
};
