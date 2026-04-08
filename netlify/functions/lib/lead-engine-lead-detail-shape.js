/**
 * Slice G: compact shapes for lead-engine-lead-detail (testable).
 */

const { buildCompactSummary } = require('./lead-engine-audit-signals');

function shapeAnalysisListItem(row) {
  const sum = buildCompactSummary(row.signals);
  return {
    id: row.id,
    created_at: row.created_at,
    success: !!(row.signals && row.signals.success === true),
    summary: sum,
  };
}

function shapeScoreListItem(row) {
  const sc = row.scores && typeof row.scores === 'object' ? row.scores : {};
  return {
    id: row.id,
    analysis_id: row.analysis_id,
    created_at: row.created_at,
    recommended_offer: row.recommended_offer || null,
    selected_offer: sc.selected_offer || row.recommended_offer || null,
    offer_scores: sc.offer_scores || null,
    top_supporting_signals: sc.top_supporting_signals || null,
    offer_rationale: sc.offer_rationale || null,
    draft_angle: sc.draft_angle || null,
    fit_score: sc.fit_score != null ? sc.fit_score : null,
    confidence: sc.confidence || null,
    vertical_intel: sc.vertical_intel || null,
  };
}

function shapeOutreachListItem(row) {
  const o = {
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    sent_at: row.sent_at || null,
    approved_by: row.approved_by || null,
    draft_subject: row.draft_subject ? String(row.draft_subject).slice(0, 120) : null,
    draft_body: row.draft_body != null ? String(row.draft_body) : '',
  };
  if (row.send_started_at) o.send_started_at = row.send_started_at;
  return o;
}

module.exports = {
  shapeAnalysisListItem,
  shapeScoreListItem,
  shapeOutreachListItem,
};
