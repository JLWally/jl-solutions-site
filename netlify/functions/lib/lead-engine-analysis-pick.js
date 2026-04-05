/**
 * Canonical “which audit / score” logic for lead engine (Slice H).
 *
 * **List / display:** `pickPreferredAnalysisRow`, newest successful audit by `created_at`;
 * if none, the newest row (so operators still see failed runs).
 *
 * **Score / draft:** `pickNewestSuccessfulAnalysisRow`, newest successful only; `null` if none.
 *
 * **Scoring payload:** Prefer `lead_engine_ai_scores` for the preferred audit’s id; else legacy
 * columns on `lead_engine_analysis` (pre–Slice D data only). See `resolveScoringPayloadForPreferredAnalysis`.
 */

/**
 * @param {object[]} rows analysis rows (any order)
 * @returns {object|null}
 */
function pickPreferredAnalysisRow(rows) {
  if (!rows || !rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  const ok = sorted.find((r) => r.signals && r.signals.success === true);
  return ok || sorted[0];
}

/**
 * @param {object[]} rows analysis rows (any order)
 * @returns {object|null}
 */
function pickNewestSuccessfulAnalysisRow(rows) {
  if (!rows || !rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  return sorted.find((r) => r.signals && r.signals.success === true) || null;
}

/** Latest row from `lead_engine_ai_scores` for API display (Slice D+). */
function buildScoringPayloadFromAiRow(aiRow) {
  if (!aiRow || !aiRow.scores || typeof aiRow.scores !== 'object') return null;
  if (aiRow.scores.fit_score == null && !aiRow.recommended_offer) return null;
  return {
    fit_score: aiRow.scores.fit_score,
    confidence: aiRow.scores.confidence,
    pain_points: aiRow.scores.pain_points || [],
    outreach_angle: aiRow.scores.outreach_angle,
    recommended_offer: aiRow.recommended_offer || null,
    model_version: aiRow.model_version || null,
    ai_score_id: aiRow.id,
    scored_at: aiRow.created_at,
  };
}

/**
 * Legacy: scores written on `lead_engine_analysis` before `lead_engine_ai_scores` existed.
 * Do not use for new writes; list UI only for old rows without an ai_scores row.
 */
function buildScoringPayloadLegacyAnalysisRow(analysisRow) {
  if (!analysisRow || !analysisRow.scores || typeof analysisRow.scores !== 'object') {
    return null;
  }
  if (analysisRow.scores.fit_score == null && !analysisRow.recommended_offer) return null;
  return {
    fit_score: analysisRow.scores.fit_score,
    confidence: analysisRow.scores.confidence,
    pain_points: analysisRow.scores.pain_points || [],
    outreach_angle: analysisRow.scores.outreach_angle,
    recommended_offer: analysisRow.recommended_offer || null,
    model_version: analysisRow.model_version || null,
    source: 'legacy_analysis_row',
  };
}

function resolveCanonicalScoringPayloadForPreferredAnalysis(
  preferredAnalysisRow,
  latestAiScoreRowForThatAnalysis
) {
  const fromAi = buildScoringPayloadFromAiRow(latestAiScoreRowForThatAnalysis);
  if (fromAi) return fromAi;
  return null;
}

/**
 * Temporary compatibility path: legacy scores on lead_engine_analysis for pre-Slice D rows.
 * Canonical source is lead_engine_ai_scores.
 */
function resolveScoringPayloadWithLegacyCompat(
  preferredAnalysisRow,
  latestAiScoreRowForThatAnalysis
) {
  const fromAi = resolveCanonicalScoringPayloadForPreferredAnalysis(
    preferredAnalysisRow,
    latestAiScoreRowForThatAnalysis
  );
  if (fromAi) return fromAi;
  return buildScoringPayloadLegacyAnalysisRow(preferredAnalysisRow);
}

module.exports = {
  pickPreferredAnalysisRow,
  pickNewestSuccessfulAnalysisRow,
  buildScoringPayloadFromAiRow,
  buildScoringPayloadLegacyAnalysisRow,
  resolveCanonicalScoringPayloadForPreferredAnalysis,
  resolveScoringPayloadWithLegacyCompat,
  // Back-compat export name used by older slices.
  resolveScoringPayloadForPreferredAnalysis: resolveScoringPayloadWithLegacyCompat,
};
