'use strict';

const {
  PROFILES,
  getProfile,
  resolveProfileIdFromNiche,
  compilePatterns,
} = require('./industry-profiles');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildInferenceCorpus(lead, signals) {
  const parts = [];
  if (lead) {
    if (lead.company_name) parts.push(lead.company_name);
    if (lead.business_name) parts.push(lead.business_name);
    if (lead.website_url) parts.push(lead.website_url);
    if (lead.niche) parts.push(lead.niche);
  }
  const pages = signals && Array.isArray(signals.pages) ? signals.pages : [];
  for (const p of pages) {
    if (p.page_title) parts.push(p.page_title);
    if (p.h1) parts.push(p.h1);
    if (p.meta_description) parts.push(p.meta_description);
    for (const c of p.ctas || []) {
      if (c && c.text) parts.push(c.text);
    }
    for (const b of p.booking_links || []) {
      if (b && b.text) parts.push(b.text);
    }
  }
  return norm(parts.join(' | '));
}

function scoreProfileMatch(profileId, corpus) {
  const prof = PROFILES[profileId];
  if (!prof || profileId === 'unknown') return 0;
  const inf = prof.inference || {};
  let s = 0;
  for (const kw of inf.keywords || []) {
    const k = String(kw).toLowerCase();
    if (k && corpus.includes(k)) s += 2;
  }
  for (const pat of compilePatterns(inf.patterns || [])) {
    if (pat.test(corpus)) s += 3;
  }
  return s;
}

/** Down-rank weak local-trade fallback when copy clearly reads as B2B, enterprise, or regulated. */
function corpusSuggestsNonLocalService(corpus) {
  if (
    /\b(hipaa|phi|gdpr|fedramp|state\s?ramp|cmmc|nist\s?800|soc\s?2|baa|government\s+contract|govcon|g\s*sa\s+schedule)\b/i.test(
      corpus
    )
  ) {
    return true;
  }
  if (
    /\bb2b\b|\bsaas\b|enterprise\s+(software|solution|platform)|for\s+organizations|for\s+businesses|request\s+a\s+demo|contact\s+sales|book\s+a\s+demo|schedule\s+a\s+demo/i.test(
      corpus
    )
  ) {
    return true;
  }
  return false;
}

function collectCuesForProfile(profileId, corpus) {
  const cues = [];
  const prof = PROFILES[profileId];
  if (!prof || profileId === 'unknown') return cues;
  const inf = prof.inference || {};
  for (const kw of inf.keywords || []) {
    const k = String(kw).toLowerCase();
    if (k && corpus.includes(k)) cues.push(`Keyword: ${kw}`);
  }
  for (const pat of compilePatterns(inf.patterns || [])) {
    if (pat.test(corpus)) cues.push(`Pattern match (${pat.source.slice(0, 36)}…)`);
  }
  return cues;
}

/**
 * @returns {{ profile_id: string, display_label: string, parent_id: string, parent_label: string, confidence: 'low'|'medium'|'high', score: number, matched_cues: string[] }}
 */
function inferIndustryProfile({ lead, signals }) {
  const corpus = buildInferenceCorpus(lead, signals);
  const scores = new Map();

  for (const pid of Object.keys(PROFILES)) {
    if (pid === 'unknown') continue;
    let s = scoreProfileMatch(pid, corpus);
    if (pid === 'local_service_general' && corpusSuggestsNonLocalService(corpus)) {
      s = Math.floor(s * 0.35);
    }
    scores.set(pid, s);
  }

  const nicheResolved = lead && resolveProfileIdFromNiche(lead.niche);
  if (nicheResolved && nicheResolved !== 'unknown') {
    scores.set(nicheResolved, (scores.get(nicheResolved) || 0) + 6);
  }

  let bestId = 'unknown';
  let bestScore = -1;
  for (const [pid, sc] of scores) {
    if (sc > bestScore) {
      bestScore = sc;
      bestId = pid;
    }
  }

  if (bestScore <= 0) {
    bestId = 'unknown';
    bestScore = 0;
  }

  const prof = getProfile(bestId);
  const matched_cues = collectCuesForProfile(bestId, corpus);
  if (nicheResolved && nicheResolved !== 'unknown' && nicheResolved === bestId) {
    matched_cues.unshift('Lead niche field aligns with this vertical');
  }

  let confidence = 'low';
  if (bestScore >= 10) confidence = 'high';
  else if (bestScore >= 4) confidence = 'medium';

  return {
    profile_id: prof.id,
    display_label: prof.displayLabel,
    parent_id: prof.parentId,
    parent_label: prof.parentLabel,
    confidence,
    score: Math.min(100, Math.round(bestScore * 5)),
    matched_cues: [...new Set(matched_cues)].slice(0, 10),
  };
}

module.exports = {
  inferIndustryProfile,
  buildInferenceCorpus,
};
