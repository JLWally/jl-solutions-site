'use strict';

const { pickPreferredAnalysisRow } = require('./lead-engine-analysis-pick');

function buildPreferredAnalysisByLead(analysisRows) {
  const grouped = new Map();
  for (const row of analysisRows || []) {
    if (!grouped.has(row.lead_id)) grouped.set(row.lead_id, []);
    grouped.get(row.lead_id).push(row);
  }
  const out = new Map();
  for (const [leadId, rows] of grouped) {
    out.set(leadId, pickPreferredAnalysisRow(rows));
  }
  return out;
}

function buildLatestAiScoreByAnalysis(aiRows) {
  const out = new Map();
  for (const row of aiRows || []) {
    if (!row || !row.analysis_id) continue;
    if (out.has(row.analysis_id)) continue;
    out.set(row.analysis_id, row);
  }
  return out;
}

function pickLatestAiScoreForPreferredAnalysis(preferredAnalysisRow, latestAiByAnalysis) {
  if (!preferredAnalysisRow || !latestAiByAnalysis) return null;
  return latestAiByAnalysis.get(preferredAnalysisRow.id) || null;
}

module.exports = {
  buildPreferredAnalysisByLead,
  buildLatestAiScoreByAnalysis,
  pickLatestAiScoreForPreferredAnalysis,
};

