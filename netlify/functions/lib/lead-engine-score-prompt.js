/**
 * Deterministic prompt text for lead scoring (Slice D). Reviewable and narrow.
 * Model input is structured JSON only (audit signals), not raw HTML.
 * Offer is chosen deterministically before the model runs; the model explains it.
 */

const OFFER_LINE = [
  '"Website Redesign"',
  '"Fix My App"',
  '"AI Intake Form Setup"',
  '"Scheduling & Resource Routing"',
].join(' | ');

/**
 * @param {{ selected_offer: string, offer_scores?: object, industry_inference?: object }} deterministic
 */
function buildScoreSystemPrompt(deterministic) {
  const sel = deterministic && deterministic.selected_offer ? deterministic.selected_offer : 'Scheduling & Resource Routing';
  return [
    'You score B2B service-fit for JL Solutions using ONLY the structured audit_signals JSON provided.',
    'Rules:',
    '- Do not claim anything that is not supported by audit_signals or the given company_name / website_url / source.',
    '- If audit_signals.psi is present, you may use its primary_scores / pages summaries for performance, accessibility, SEO, and best-practices signals (do not invent numeric scores not present in psi).',
    '- If audit_signals.success is false, or pages are empty, or signals are very sparse, set confidence to "low" and use a conservative fit_score.',
    '- pain_points: at most 5 short strings. Each MUST directly support the pre-selected offer below (scheduling friction, intake gaps, site/CTA issues, or broken app flows, match the offer). Do not list unrelated problems.',
    '- outreach_angle: one short internal sentence; factual tone; must align with the pre-selected offer; no fake metrics or visitor counts.',
    '- vertical_intelligence (if present) describes an inferred business vertical for context only; offers are chosen from website signals, not from the vertical label alone.',
    '',
    'IMPORTANT: Offer selection is already decided by deterministic signal scoring (booking, forms, performance, portal/tool hints, etc.). You do NOT choose a different offer.',
    `- The pre-selected offer is: "${sel}"`,
    '- Set recommended_offer to exactly this same string (character-for-character match).',
    '- offer_rationale: 2–4 sentences explaining why this pre-selected offer fits the audit_signals (no alternative offers; no "you could also").',
    '',
    `Return a single JSON object with exactly these keys (no markdown, no prose outside JSON):`,
    `- fit_score: integer 0-100`,
    `- confidence: one of "low" | "medium" | "high"`,
    `- pain_points: array of at most 5 short strings`,
    `- outreach_angle: string`,
    `- recommended_offer: exactly one of: ${OFFER_LINE} (must equal the pre-selected offer above)`,
    `- offer_rationale: string`,
  ].join('\n');
}

/**
 * User message: minimal structured context for the model.
 * @param {object} lead
 * @param {object} signals
 * @param {object} [deterministic] - from computeDeterministicOfferSelection
 */
function buildScoreUserContent(lead, signals, deterministic) {
  const payload = {
    company_name: lead.company_name,
    website_url: lead.website_url,
    source: lead.source,
    audit_signals: signals,
  };
  if (deterministic) {
    payload.deterministic_offer_selection = {
      selected_offer: deterministic.selected_offer,
      offer_scores: deterministic.offer_scores,
      top_supporting_signals: deterministic.top_supporting_signals,
      draft_angle: deterministic.draft_angle,
      fix_my_app_eligible: deterministic.fix_my_app_eligible,
      scheduling_context_weight: deterministic.scheduling_context_weight,
      industry_inference: deterministic.industry_inference,
      normalized_signals: deterministic.normalized_signals,
    };
  }
  return JSON.stringify(payload, null, 2);
}

const ALLOWED_OFFERS = [
  'Website Redesign',
  'Fix My App',
  'AI Intake Form Setup',
  'Scheduling & Resource Routing',
];

module.exports = {
  buildScoreSystemPrompt,
  buildScoreUserContent,
  ALLOWED_OFFERS,
};
