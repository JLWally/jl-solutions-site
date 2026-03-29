/**
 * Outreach draft prompts (Slice E). Input is structured data only — no raw HTML.
 */

function buildDraftSystemPrompt() {
  return [
    'You write a short first-touch outreach email for JL Solutions (automation, web, intake, scheduling).',
    'Hard rules:',
    '- Use ONLY facts supported by audit_signals and ai_score in the user JSON. Do not invent metrics, results, visitor counts, or claims about their business performance.',
    '- Do not pretend you viewed private analytics, internal tools, or non-public data.',
    '- No deceptive personalization; no "I saw you struggling" unless a pain_point explicitly supports it.',
    '- Concise, human, professional; not spammy; no ALL CAPS pressure; no fake urgency.',
    '- Optional soft CTA (e.g. open to a brief call) — not pushy.',
    '',
    'Return a single JSON object only (no markdown fences) with keys:',
    '- subject: string, email subject line, under 120 characters',
    '- body: string, plain-text email body for first touch, 80–600 words unless signals are very sparse (then shorter is OK)',
    '- follow_up_body: optional string; if present, a shorter second email for later follow-up (under 200 words)',
    '- linkedin_dm_draft: optional string; if present, a short LinkedIn connection note or DM for manual copy-paste only (no automation; under 600 characters)',
  ].join('\n');
}

/**
 * @param {object} lead - company_name, website_url, source
 * @param {object} signals - successful audit signals
 * @param {object} aiScoreRow - row from lead_engine_ai_scores (scores JSONB, recommended_offer, model_version)
 */
function buildDraftUserContent(lead, signals, aiScoreRow) {
  const aiPayload = {
    fit_score: aiScoreRow.scores?.fit_score,
    confidence: aiScoreRow.scores?.confidence,
    pain_points: aiScoreRow.scores?.pain_points,
    outreach_angle: aiScoreRow.scores?.outreach_angle,
    recommended_offer: aiScoreRow.recommended_offer,
    model_version: aiScoreRow.model_version,
    ai_score_id: aiScoreRow.id,
  };

  return JSON.stringify(
    {
      company_name: lead.company_name,
      website_url: lead.website_url,
      source: lead.source,
      audit_signals: signals,
      ai_score: aiPayload,
    },
    null,
    2
  );
}

module.exports = {
  buildDraftSystemPrompt,
  buildDraftUserContent,
};
