/**
 * Outreach draft prompts (Slice E). Input is structured data only, no raw HTML.
 */

function buildDraftSystemPrompt() {
  return [
    'You write a short first-touch outreach email for JL Solutions (automation, web, intake, scheduling).',
    'Hard rules:',
    '- Use ONLY facts supported by audit_signals and ai_score in the user JSON. Do not invent metrics, results, visitor counts, or claims about their business performance.',
    '- Do not pretend you viewed private analytics, internal tools, or non-public data.',
    '- No deceptive personalization; no "I saw you struggling" unless a pain_point explicitly supports it.',
    '- Concise, human, professional; not spammy; no ALL CAPS pressure; no fake urgency.',
    '- The pitch must promote EXACTLY ONE offer: ai_score.selected_offer (same as recommended_offer). Do not mention other JL offers (no intake + redesign + app fix in one email).',
    '- Ground the email in ai_score.top_supporting_signals (2–3 bullets worth of substance) and ai_score.draft_angle. Pain points in the email must be a subset of ai_score.pain_points and must align with that single offer.',
    '- CTA must match the selected offer:',
    '  • Scheduling & Resource Routing → invite them to simplify service request + scheduling flow.',
    '  • AI Intake Form Setup → invite them to improve intake / qualification / confirmations.',
    '  • Website Redesign → invite them to improve homepage / conversion / mobile / trust.',
    '  • Fix My App → invite them to fix specific app, portal, or embedded-tool flows.',
    '- Optional soft CTA (e.g. open to a brief call), not pushy.',
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
  const sc = aiScoreRow.scores && typeof aiScoreRow.scores === 'object' ? aiScoreRow.scores : {};
  const aiPayload = {
    fit_score: sc.fit_score,
    confidence: sc.confidence,
    pain_points: sc.pain_points,
    outreach_angle: sc.outreach_angle,
    offer_rationale: sc.offer_rationale || null,
    recommended_offer: aiScoreRow.recommended_offer,
    selected_offer: sc.selected_offer || aiScoreRow.recommended_offer,
    offer_scores: sc.offer_scores || null,
    top_supporting_signals: sc.top_supporting_signals || [],
    draft_angle: sc.draft_angle || null,
    is_hvac_niche: sc.is_hvac_niche,
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
