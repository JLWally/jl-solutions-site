/**
 * Deterministic prompt text for lead scoring (Slice D). Reviewable and narrow.
 * Model input is structured JSON only (audit signals), not raw HTML.
 */

const OFFER_LINE = [
  '"Website Redesign"',
  '"Fix My App"',
  '"AI Intake Form Setup"',
  '"Scheduling & Resource Routing"',
].join(' | ');

/**
 * System instructions: JSON-only response, no invented site facts.
 */
function buildScoreSystemPrompt() {
  return [
    'You score B2B service-fit for JL Solutions using ONLY the structured audit_signals JSON provided.',
    'Rules:',
    '- Do not claim anything that is not supported by audit_signals or the given company_name / website_url / source.',
    '- If audit_signals.psi is present, you may use its primary_scores / pages summaries for performance, accessibility, SEO, and best-practices signals (do not invent numeric scores not present in psi).',
    '- If audit_signals.success is false, or pages are empty, or signals are very sparse, set confidence to "low" and use a conservative fit_score.',
    '- pain_points must each reflect something visible in audit_signals (e.g. ux_hints, aggregate fields, per-page titles/forms/CTAs). If unsure, omit rather than guess.',
    '- outreach_angle: one short internal sentence; factual tone; no fake metrics or visitor counts.',
    '',
    'Offer mapping (pick exactly one recommended_offer string):',
    '- Website Redesign: weak title/meta/h1, missing CTAs/trust, clarity or structure issues, many ux_hints about content/CTAs.',
    '- Fix My App: broken or confusing flows implied by signals (e.g. extreme form/UX friction, contradictory CTAs) — use only when signals support it.',
    '- AI Intake Form Setup: form friction, multiple forms without clear intake, missing structured capture, manual lead handling hints from signals.',
    '- Scheduling & Resource Routing: booking_detected false with service-style site, scheduling/booking ux_hints, contact-routing gaps.',
    '',
    `Return a single JSON object with exactly these keys (no markdown, no prose outside JSON):`,
    `- fit_score: integer 0-100`,
    `- confidence: one of "low" | "medium" | "high"`,
    `- pain_points: array of at most 5 short strings`,
    `- outreach_angle: string`,
    `- recommended_offer: exactly one of: ${OFFER_LINE}`,
  ].join('\n');
}

/**
 * User message: minimal structured context for the model.
 */
function buildScoreUserContent(lead, signals) {
  return JSON.stringify(
    {
      company_name: lead.company_name,
      website_url: lead.website_url,
      source: lead.source,
      audit_signals: signals,
    },
    null,
    2
  );
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
