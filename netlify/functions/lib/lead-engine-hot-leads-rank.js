'use strict';

/**
 * Composite "hot" score for operator triage (deterministic, explainable).
 * Higher is better. Not a second ML model.
 */

function hoursSince(iso) {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return (Date.now() - t) / (1000 * 60 * 60);
}

/**
 * @param {object} row — lead row + optional flags
 * @param {object} [opts]
 * @param {boolean} [opts.has_draft]
 * @param {boolean} [opts.icp_blocked]
 * @param {string|null} [opts.icp_tier]
 */
function computeHotLeadScore(row, opts) {
  const o = opts || {};
  let score = 0;
  const reasons = [];

  const fit = row.lead_score != null ? Number(row.lead_score) : null;
  if (fit != null && !Number.isNaN(fit)) {
    score += fit * 0.55;
    reasons.push({ factor: 'fit_score', value: fit, weight: 0.55 });
  }

  if (row.website_url && String(row.website_url).trim()) {
    score += 8;
    reasons.push({ factor: 'website_present', value: true, points: 8 });
  } else {
    score -= 25;
    reasons.push({ factor: 'website_missing', value: true, penalty: 25 });
  }

  if (row.demo_slug) {
    score += 14;
    reasons.push({ factor: 'demo_generated', value: row.demo_slug, points: 14 });
  }

  if (o.has_draft) {
    score += 12;
    reasons.push({ factor: 'draft_generated', value: true, points: 12 });
  }

  const tier = o.icp_tier ? String(o.icp_tier) : '';
  if (tier && !tier.includes('w0_')) {
    score += 6;
    reasons.push({ factor: 'icp_tier', value: tier, points: 6 });
  }
  if (tier && tier.toLowerCase().includes('strong')) {
    score += 8;
    reasons.push({ factor: 'icp_tier_strong_hint', points: 8 });
  }

  const hUpd = hoursSince(row.updated_at);
  const recency = Math.max(0, 36 - hUpd) * 0.45;
  score += recency;
  reasons.push({ factor: 'recency_hours', hours_since_update: Math.round(hUpd * 10) / 10, points: Math.round(recency * 10) / 10 });

  if (row.email_opted_out === true) {
    score -= 200;
    reasons.push({ factor: 'email_opted_out', penalty: 200 });
  }
  if (row.global_email_suppressed === true) {
    score -= 200;
    reasons.push({ factor: 'global_suppressed', penalty: 200 });
  }
  if (o.icp_blocked) {
    score -= 150;
    reasons.push({ factor: 'icp_blocked_prospect', penalty: 150 });
  }

  if (row.status === 'archived') {
    score -= 80;
    reasons.push({ factor: 'lead_archived', penalty: 80 });
  }

  return { score: Math.round(score * 100) / 100, reasons };
}

function rankHotLeads(rows, draftByLeadId, metaByLeadId) {
  const scored = (rows || []).map((r) => {
    const mid = r.id;
    const hasDraft = !!(draftByLeadId && draftByLeadId[mid]);
    const meta = (metaByLeadId && metaByLeadId[mid]) || {};
    const { score, reasons } = computeHotLeadScore(r, {
      has_draft: hasDraft,
      icp_blocked: meta.icp_blocked,
      icp_tier: meta.icp_tier,
    });
    return { ...r, hot_score: score, hot_reasons: reasons };
  });
  scored.sort((a, b) => b.hot_score - a.hot_score);
  return scored;
}

module.exports = {
  computeHotLeadScore,
  rankHotLeads,
};
