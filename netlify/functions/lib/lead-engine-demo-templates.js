/**
 * Lead engine ↔ smart demo: vertical profile → demo lists, CTA mapping.
 * Industry is inferred from audit + lead fields; offers are scored separately (signal-based).
 */
'use strict';

const { getPreset, listIndustryKeys } = require('./demo-industry-presets');
const { inferIndustryProfile } = require('./lead-engine-industry-inference');
const { resolveProfileIdFromNiche, getProfile } = require('./industry-profiles');

const OFFER_TO_CTA = {
  'ai-intake': 'ai-intake',
  ai_intake: 'ai-intake',
  scheduling: 'scheduling',
  'scheduling-routing': 'scheduling',
  'lead-engine': 'lead-engine',
  lead_engine: 'lead-engine',
  'fix-app': 'fix-app',
  fix_app: 'fix-app',
  custom: 'custom',
};

function normalizeLeadBusinessName(lead) {
  const raw =
    (lead.business_name && String(lead.business_name).trim()) ||
    (lead.company_name && String(lead.company_name).trim()) ||
    '';
  const cleaned = raw.replace(/\s+/g, ' ').trim() || 'Your business';
  return cleaned.slice(0, 120);
}

/**
 * Stable slug per lead, avoids collisions and supports idempotent upserts.
 * @param {string} leadId
 */
function leadEngineDemoSlug(leadId) {
  return `le-${String(leadId).toLowerCase()}`;
}

/**
 * @param {string|null|undefined} offer
 */
function mapRecommendedOfferToCtaService(offer) {
  if (offer == null || offer === '') return 'ai-intake';
  const k = String(offer)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
  if (OFFER_TO_CTA[k]) return OFFER_TO_CTA[k];
  const compact = k.replace(/-/g, '_');
  if (OFFER_TO_CTA[compact]) return OFFER_TO_CTA[compact];
  return 'ai-intake';
}

/**
 * @param {string} profileId - industry-profiles id
 * @returns {{ services: string[], issues: string[] }}
 */
function getServicesAndIssuesForDemoIndustry(profileId) {
  const valid = new Set(listIndustryKeys());
  const key = valid.has(profileId) ? profileId : 'unknown';
  const preset = getPreset(key);
  return {
    services: (preset.defaultServices || []).slice(),
    issues: (preset.defaultIssueOptions || []).slice(),
  };
}

/** Appended to email drafts when a personalized demo exists */
function buildOutreachDemoFooter(pathUrl, absoluteUrl) {
  const link = absoluteUrl || pathUrl;
  return `\n\n---\nPersonalized intake demo (preview): ${link}\n`;
}

/**
 * Resolve demo preset key (industry-profiles id) for personalized demo content.
 * @param {object} lead - niche, company_name, business_name, website_url
 * @param {object|null} signals - optional audit bundle (with or without vertical_intelligence)
 * @returns {string} profile id for getPreset()
 */
function resolveDemoIndustryForLead(lead, signals) {
  const valid = new Set(listIndustryKeys());

  if (signals && signals.vertical_intelligence && signals.vertical_intelligence.industry_inference) {
    const pid = signals.vertical_intelligence.industry_inference.profile_id;
    if (pid && valid.has(pid)) return pid;
  }

  const fromSignals = signals && signals.success === true ? inferIndustryProfile({ lead, signals }) : null;
  if (fromSignals && fromSignals.profile_id && valid.has(fromSignals.profile_id)) {
    return fromSignals.profile_id;
  }

  const fromNiche = resolveProfileIdFromNiche(lead && lead.niche != null ? String(lead.niche) : '');
  if (fromNiche && valid.has(fromNiche)) return fromNiche;

  const blob = [
    normalizeLeadBusinessName(lead),
    lead && lead.company_name,
    lead && lead.business_name,
    lead && lead.website_url,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let bestId = 'unknown';
  let bestHits = 0;
  for (const id of listIndustryKeys()) {
    if (id === 'unknown') continue;
    const prof = getProfile(id);
    const kws = (prof.inference && prof.inference.keywords) || [];
    let hits = 0;
    for (const kw of kws) {
      if (blob.includes(String(kw).toLowerCase())) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestId = id;
    }
  }
  if (bestHits >= 1 && valid.has(bestId)) return bestId;

  return 'unknown';
}

module.exports = {
  normalizeLeadBusinessName,
  leadEngineDemoSlug,
  mapRecommendedOfferToCtaService,
  getServicesAndIssuesForDemoIndustry,
  resolveDemoIndustryForLead,
  buildOutreachDemoFooter,
};
