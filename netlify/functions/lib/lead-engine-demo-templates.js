/**
 * Lead engine ↔ smart demo: niche → industry, template lists, CTA mapping.
 * Align with demo-industry-presets.js (especially `cleaning`) when changing copy.
 */
const { getPreset, listIndustryKeys } = require('./demo-industry-presets');

const industryTemplates = {
  hvac: {
    services: [
      'AC Repair',
      'Heating Repair',
      'Installation',
      'Maintenance',
      'Emergency Service',
    ],
    issues: [
      'Not cooling',
      'Not heating',
      'System won’t turn on',
      'Strange noise',
      'Leak or water issue',
    ],
  },
  plumbing: {
    services: [
      'Leak Repair',
      'Drain Cleaning',
      'Water Heater',
      'Installation',
      'Emergency Service',
    ],
    issues: ['Leak', 'Clog', 'No hot water', 'Low pressure', 'Pipe issue'],
  },
  cleaning: {
    services: [
      'House Cleaning',
      'Deep Cleaning',
      'Move-In/Out',
      'Commercial Cleaning',
      'Recurring Service',
    ],
    issues: ['One-time clean', 'Recurring service', 'Urgent clean', 'Estimate request'],
  },
};

/** Map lead niche / site vertical to demo-industry-presets key */
const nicheToDemoIndustry = {
  hvac: 'hvac',
  'hvac-plumbing': 'hvac',
  'air-conditioning': 'hvac',
  heating: 'hvac',
  plumbing: 'plumbing',
  plumber: 'plumbing',
  cleaning: 'cleaning',
  'home-cleaning': 'cleaning',
  maid: 'cleaning',
  janitorial: 'cleaning',
  'home-services': 'home-services',
  roofing: 'roofing',
  electrical: 'electrical',
  healthcare: 'healthcare',
  professional: 'professional',
  generic: 'generic',
};

const KEYWORD_RULES = [
  { re: /\b(hvac|heating|cooling|furnace|air conditioning|a\/c|ac repair|heat pump)\b/i, key: 'hvac' },
  { re: /\b(plumb|drain|sewer|water heater|pipe|leak repair)\b/i, key: 'plumbing' },
  { re: /\b(clean|maid|janitorial|housekeeping|sanitize|pressure wash)\b/i, key: 'cleaning' },
];

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
 * Stable slug per lead — avoids collisions and supports idempotent upserts.
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
 * @param {string} industryKey
 * @returns {{ services: string[], issues: string[] }}
 */
function getServicesAndIssuesForDemoIndustry(industryKey) {
  const key = String(industryKey || 'generic').toLowerCase();
  if (industryTemplates[key]) {
    return {
      services: industryTemplates[key].services.slice(),
      issues: industryTemplates[key].issues.slice(),
    };
  }
  const preset = getPreset(key);
  return {
    services: (preset.defaultServices || []).slice(),
    issues: (preset.defaultIssueOptions || []).slice(),
  };
}

/**
 * @param {object} lead — expects niche, company_name, business_name, website_url optional
 * @returns {string} industry key present in demo-industry-presets
 */
/** Appended to email drafts when a personalized demo exists */
function buildOutreachDemoFooter(pathUrl, absoluteUrl) {
  const link = absoluteUrl || pathUrl;
  return `\n\n---\nPersonalized intake demo (preview): ${link}\n`;
}

function resolveDemoIndustryForLead(lead) {
  const valid = new Set(listIndustryKeys());
  const nicheRaw = lead.niche != null ? String(lead.niche).trim() : '';
  if (nicheRaw) {
    const parts = nicheRaw.split(/[,;/|]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (const p of parts) {
      const mapped = nicheToDemoIndustry[p];
      if (mapped && valid.has(mapped)) return mapped;
    }
    const slug = nicheRaw.toLowerCase().replace(/\s+/g, '-');
    if (nicheToDemoIndustry[slug] && valid.has(nicheToDemoIndustry[slug])) {
      return nicheToDemoIndustry[slug];
    }
    const hay = nicheRaw.toLowerCase();
    for (const { re, key } of KEYWORD_RULES) {
      if (re.test(hay) && valid.has(key)) return key;
    }
  }

  const blob = [
    normalizeLeadBusinessName(lead),
    lead.company_name,
    lead.business_name,
    lead.website_url,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const { re, key } of KEYWORD_RULES) {
    if (re.test(blob) && valid.has(key)) return key;
  }

  return 'generic';
}

module.exports = {
  industryTemplates,
  nicheToDemoIndustry,
  normalizeLeadBusinessName,
  leadEngineDemoSlug,
  mapRecommendedOfferToCtaService,
  getServicesAndIssuesForDemoIndustry,
  resolveDemoIndustryForLead,
  buildOutreachDemoFooter,
};
