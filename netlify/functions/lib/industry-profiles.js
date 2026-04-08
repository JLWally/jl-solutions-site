'use strict';

/**
 * Config-driven industry / vertical profiles for lead engine (audit, scoring, demos).
 * — Inference uses keywords + regex patterns against a text corpus (never hardcode per-lead if/else elsewhere).
 * — Offer selection uses signal buckets in lead-engine-offer-deterministic; profiles only supply small scheduling-context weights.
 * — Demo defaults come from profile.demo.
 */

const PARENT_GROUPS = {
  local_service: { id: 'local_service', label: 'Local / field services' },
  b2b_regulated: { id: 'b2b_regulated', label: 'B2B / enterprise / regulated' },
  events: { id: 'events', label: 'Events & venues' },
  healthcare: { id: 'healthcare', label: 'Healthcare & clinical' },
  public_sector: { id: 'public_sector', label: 'Public sector / GovCon' },
  professional: { id: 'professional', label: 'Professional & consulting' },
  nonprofit: { id: 'nonprofit', label: 'Nonprofits' },
  unknown: { id: 'unknown', label: 'Mixed or unknown organization type' },
};

/**
 * @typedef {object} IndustryProfile
 * @property {string} id
 * @property {string} displayLabel
 * @property {string} parentId
 * @property {string} parentLabel
 * @property {number} schedulingContextWeight 1.0 = neutral; >1 slightly favors scheduling offer in tie-breaks only
 * @property {{ keywords?: string[], patterns?: string[] }} inference
 * @property {{ label: string, defaultServices: string[], defaultIssueOptions: string[] }} demo
 * @property {string} [operatorNotes] Short operator-facing note (UI / runbooks); not used in automated scoring.
 * @property {object} [signalHints] Optional documentation of common signals for this vertical (intake, scheduling, trust).
 */

/** @type {Record<string, IndustryProfile>} */
const PROFILES = {
  home_services_trade: {
    id: 'home_services_trade',
    displayLabel: 'Home trade (HVAC, plumbing, electrical, roofing)',
    parentId: 'local_service',
    parentLabel: PARENT_GROUPS.local_service.label,
    schedulingContextWeight: 1.45,
    operatorNotes:
      'Strong dispatch / booking signals are common. Offer selection still follows audit signals, not the label alone.',
    inference: {
      keywords: [
        'hvac',
        'heating',
        'cooling',
        'furnace',
        'air conditioning',
        'heat pump',
        'plumb',
        'drain',
        'water heater',
        'electrician',
        'electrical service',
        'roofing',
        'roofer',
        'gutter',
      ],
      patterns: [
        '\\bh\\.?v\\.?a\\.?c\\.?\\b',
        '\\bair\\s*conditioning\\b',
        '\\bheat\\s*pump\\b',
        '\\bmini[-\\s]?split\\b',
      ],
    },
    demo: {
      label: 'Home services',
      defaultServices: [
        'Emergency repair',
        'Scheduled service',
        'Installation / replacement',
        'Maintenance plan',
        'Estimate / inspection',
      ],
      defaultIssueOptions: [
        'Urgent repair',
        'Routine maintenance',
        'New install / replacement',
        'Estimate only',
        'Warranty / follow-up',
        'Other',
      ],
    },
  },

  pool_service: {
    id: 'pool_service',
    displayLabel: 'Pool & spa service',
    parentId: 'local_service',
    parentLabel: PARENT_GROUPS.local_service.label,
    schedulingContextWeight: 1.35,
    inference: {
      keywords: [
        'pool service',
        'pool cleaning',
        'pool repair',
        'swimming pool',
        'pool maintenance',
        'hot tub',
        'spa service',
      ],
      patterns: ['\\b(pool|aquatic)\\b.*\\b(clean|repair|service|maintain)\\b', '\\bswimming\\s+pool\\b'],
    },
    demo: {
      label: 'Pool service',
      defaultServices: [
        'Weekly maintenance',
        'Opening / closing',
        'Equipment repair',
        'Leak detection',
        'Renovation / resurfacing',
      ],
      defaultIssueOptions: [
        'Green water / chemistry',
        'Pump or filter issue',
        'Heater problem',
        'Leak',
        'Seasonal opening',
        'Quote for upgrade',
      ],
    },
  },

  lawn_care: {
    id: 'lawn_care',
    displayLabel: 'Lawn & landscape',
    parentId: 'local_service',
    parentLabel: PARENT_GROUPS.local_service.label,
    schedulingContextWeight: 1.32,
    inference: {
      keywords: [
        'lawn care',
        'landscaping',
        'mowing',
        'fertiliz',
        'irrigation',
        'sod',
        'mulch',
        'tree service',
      ],
      patterns: ['\\b(lawn|turf|landscape)\\b.*\\b(care|service|maintain)\\b'],
    },
    demo: {
      label: 'Lawn care',
      defaultServices: [
        'Recurring mowing',
        'Fertilization & weed control',
        'Aeration & overseed',
        'Landscape install',
        'Irrigation service',
      ],
      defaultIssueOptions: [
        'Recurring service',
        'One-time cleanup',
        'New landscape project',
        'Irrigation repair',
        'Estimate',
      ],
    },
  },

  seasonal_service: {
    id: 'seasonal_service',
    displayLabel: 'Seasonal & weather-driven services',
    parentId: 'local_service',
    parentLabel: PARENT_GROUPS.local_service.label,
    schedulingContextWeight: 1.25,
    operatorNotes:
      'Peaks and routes differ by season; scheduling language may be intermittent. Prefer signal-based offers over stereotypes.',
    inference: {
      keywords: [
        'snow removal',
        'holiday lighting',
        'seasonal',
        'spring cleanup',
        'fall cleanup',
        'christmas lights',
      ],
      patterns: ['\\bseasonal\\b.*\\b(service|package|plan)\\b'],
    },
    demo: {
      label: 'Seasonal service',
      defaultServices: [
        'Seasonal package',
        'On-call / storm response',
        'Recurring route',
        'Install / takedown',
        'Consultation',
      ],
      defaultIssueOptions: [
        'Book this season',
        'Storm / urgent',
        'Recurring plan',
        'Estimate',
        'Not sure yet',
      ],
    },
  },

  events_venues: {
    id: 'events_venues',
    displayLabel: 'Events, venues & catering',
    parentId: 'events',
    parentLabel: PARENT_GROUPS.events.label,
    schedulingContextWeight: 1.15,
    inference: {
      keywords: [
        'event planner',
        'wedding',
        'venue',
        'catering',
        'corporate events',
        'party rental',
        'dj service',
        'photobooth',
      ],
      patterns: ['\\b(event|wedding|venue|catering)\\b.*\\b(plan|rent|book|hire)\\b'],
    },
    demo: {
      label: 'Events',
      defaultServices: [
        'Private event',
        'Corporate event',
        'Wedding',
        'Venue rental',
        'Catering package',
      ],
      defaultIssueOptions: [
        'Date inquiry',
        'Guest count TBD',
        'Catering add-on',
        'Venue tour',
        'Custom package',
      ],
    },
  },

  healthcare_clinic: {
    id: 'healthcare_clinic',
    displayLabel: 'Healthcare / clinic',
    parentId: 'healthcare',
    parentLabel: PARENT_GROUPS.healthcare.label,
    schedulingContextWeight: 1.05,
    inference: {
      keywords: [
        'clinic',
        'medical center',
        'primary care',
        'family medicine',
        'patient portal',
        'hipaa',
        'new patient',
        'appointment request',
      ],
      patterns: ['\\bprimary\\s+care\\b', '\\bpatient\\s+portal\\b', '\\bmedical\\s+center\\b'],
    },
    demo: {
      label: 'Healthcare / clinics',
      defaultServices: [
        'New patient intake',
        'Appointment request',
        'Referral',
        'Billing / insurance question',
        'Records request',
      ],
      defaultIssueOptions: [
        'New patient',
        'Follow-up visit',
        'Referral',
        'Billing / insurance',
        'Records',
        'Other',
      ],
    },
  },

  autism_services: {
    id: 'autism_services',
    displayLabel: 'Autism & developmental services',
    parentId: 'healthcare',
    parentLabel: PARENT_GROUPS.healthcare.label,
    schedulingContextWeight: 1.05,
    inference: {
      keywords: [
        'autism',
        'aba therapy',
        'developmental disability',
        'special needs',
        'asd ',
        ' asd',
        'bcba',
      ],
      patterns: ['\\bautism\\b', '\\baba\\b.*\\b(therapy|center|services)\\b'],
    },
    demo: {
      label: 'Autism services',
      defaultServices: [
        'Intake & eligibility',
        'Therapy scheduling',
        'Insurance / authorization',
        'Family resources',
        'School coordination',
      ],
      defaultIssueOptions: [
        'New family inquiry',
        'Schedule / reschedule',
        'Insurance question',
        'Eligibility screening',
        'Other',
      ],
    },
  },

  mental_health: {
    id: 'mental_health',
    displayLabel: 'Mental health practice',
    parentId: 'healthcare',
    parentLabel: PARENT_GROUPS.healthcare.label,
    schedulingContextWeight: 1.02,
    inference: {
      keywords: [
        'counseling',
        'psychotherapy',
        'psychiatrist',
        'therapist',
        'mental health',
        'anxiety',
        'depression',
      ],
      patterns: ['\\b(therapy|counseling)\\s+(session|appointment|intake)\\b'],
    },
    demo: {
      label: 'Mental health',
      defaultServices: [
        'Initial consultation',
        'Ongoing therapy',
        'Medication management',
        'Group program',
        'Crisis resources',
      ],
      defaultIssueOptions: [
        'New client',
        'Returning client',
        'Insurance / billing',
        'Sliding scale question',
        'Other',
      ],
    },
  },

  gov_contractor: {
    id: 'gov_contractor',
    displayLabel: 'Government contracting',
    parentId: 'public_sector',
    parentLabel: PARENT_GROUPS.public_sector.label,
    schedulingContextWeight: 1.0,
    inference: {
      keywords: [
        'government contracting',
        'govcon',
        'gsa',
        'dod',
        'federal contractor',
        'state contract',
        'rfp',
        'sba',
        '8(a)',
        'sdvosb',
        'wosb',
        'sam.gov',
      ],
      patterns: [
        '\\b(far|dfars)\\b',
        '\\bgovernment\\s+contract',
        '\\b(defense|federal|state|municipal)\\s+contract',
      ],
    },
    demo: {
      label: 'GovCon / B2G',
      defaultServices: [
        'Capability briefing',
        'Past performance request',
        'Teaming inquiry',
        'RFP response support',
        'Compliance question',
      ],
      defaultIssueOptions: [
        'New opportunity',
        'Teaming',
        'Past performance',
        'Security / compliance',
        'General inquiry',
      ],
    },
  },

  veteran_owned_services: {
    id: 'veteran_owned_services',
    displayLabel: 'Veteran-owned business',
    parentId: 'professional',
    parentLabel: PARENT_GROUPS.professional.label,
    schedulingContextWeight: 1.05,
    inference: {
      keywords: [
        'veteran owned',
        'veteran-owned',
        'sdvosb',
        'vosb',
        'service-disabled veteran',
        'military veteran',
      ],
      patterns: ['\\bveteran[-\\s]?owned\\b', '\\bsdvosb\\b'],
    },
    demo: {
      label: 'Professional services',
      defaultServices: [
        'Discovery call',
        'Project scoping',
        'Retainer / engagement',
        'Proposal request',
        'Partnership inquiry',
      ],
      defaultIssueOptions: [
        'Initial consultation',
        'Project quote',
        'Ongoing support',
        'Urgent deadline',
        'General question',
      ],
    },
  },

  nonprofit: {
    id: 'nonprofit',
    displayLabel: 'Nonprofit',
    parentId: 'nonprofit',
    parentLabel: PARENT_GROUPS.nonprofit.label,
    schedulingContextWeight: 1.0,
    inference: {
      keywords: [
        'nonprofit',
        'non-profit',
        '501(c)(3)',
        'foundation',
        'charity',
        'donate',
        'volunteer',
      ],
      patterns: ['\\b501\\(c\\)\\(3\\)\\b'],
    },
    demo: {
      label: 'Nonprofit',
      defaultServices: [
        'Program inquiry',
        'Volunteer signup',
        'Donation question',
        'Partnership',
        'Client intake',
      ],
      defaultIssueOptions: [
        'Get help / services',
        'Volunteer',
        'Donate',
        'Partner with us',
        'Media / press',
      ],
    },
  },

  b2b_enterprise: {
    id: 'b2b_enterprise',
    displayLabel: 'B2B / enterprise technology & services',
    parentId: 'b2b_regulated',
    parentLabel: PARENT_GROUPS.b2b_regulated.label,
    schedulingContextWeight: 1.0,
    operatorNotes:
      'Often “request demo / contact sales” instead of consumer booking. Compliance and intake signals may favor AI Intake.',
    inference: {
      keywords: [
        'b2b',
        'enterprise',
        'saas',
        'software platform',
        'for organizations',
        'for businesses',
        'corporate clients',
        'digital transformation',
        'managed services',
        'systems integrator',
        'request a demo',
        'contact sales',
        'book a demo',
        'schedule a demo',
      ],
      patterns: [
        '\\benterprise\\s+(software|solution|platform)\\b',
        '\\bsaas\\b',
        '\\bfor\\s+enterprise\\b',
        '\\b(msp|mssp)\\b',
      ],
    },
    demo: {
      label: 'B2B services',
      defaultServices: [
        'Product demo / briefing',
        'Security & compliance question',
        'Integration / API inquiry',
        'Pricing / licensing',
        'Support escalation',
      ],
      defaultIssueOptions: [
        'Request a demo',
        'Talk to sales',
        'Technical evaluation',
        'Partner / reseller',
        'Existing customer',
        'Other',
      ],
    },
  },

  professional_services: {
    id: 'professional_services',
    displayLabel: 'Professional services',
    parentId: 'professional',
    parentLabel: PARENT_GROUPS.professional.label,
    schedulingContextWeight: 1.0,
    inference: {
      keywords: [
        'consulting',
        'advisory',
        'accounting',
        'cpa',
        'law firm',
        'legal services',
        'architecture',
        'engineering firm',
      ],
      patterns: ['\\bconsulting\\s+firm\\b', '\\badvisory\\s+services\\b'],
    },
    demo: {
      label: 'Professional services',
      defaultServices: [
        'Consultation request',
        'Project quote',
        'Ongoing retainer',
        'Workshop / training',
      ],
      defaultIssueOptions: [
        'Initial consultation',
        'Project scope / quote',
        'Ongoing engagement',
        'Urgent deadline',
        'General question',
      ],
    },
  },

  local_service_general: {
    id: 'local_service_general',
    displayLabel: 'Local service (general)',
    parentId: 'local_service',
    parentLabel: PARENT_GROUPS.local_service.label,
    /** Neutral: this bucket is only a weak inference fallback — do not tilt offers toward dispatch. */
    schedulingContextWeight: 1.0,
    inference: {
      keywords: [
        'free estimate',
        'service area',
        'zip codes we serve',
        'locally owned',
        'trusted since',
      ],
      patterns: ['\\blocally\\s+owned\\s+and\\s+operated\\b'],
    },
    demo: {
      label: 'Local services',
      defaultServices: [
        'Service request',
        'Quote / estimate',
        'Emergency / urgent',
        'Maintenance plan',
      ],
      defaultIssueOptions: [
        'Book service',
        'Get a quote',
        'Emergency',
        'Question about pricing',
        'Not sure yet',
      ],
    },
  },

  unknown: {
    id: 'unknown',
    displayLabel: 'General / unknown',
    parentId: 'unknown',
    parentLabel: PARENT_GROUPS.unknown.label,
    schedulingContextWeight: 1.0,
    operatorNotes:
      'Low inference confidence — verify vertical from the site and niche field. Demos and offers stay generic and signal-driven.',
    inference: { keywords: [], patterns: [] },
    demo: {
      label: 'Your organization',
      defaultServices: [
        'General inquiry',
        'Request information',
        'Partnership or vendor',
        'Support',
        'Compliance / privacy question',
      ],
      defaultIssueOptions: [
        'New inquiry',
        'Existing relationship',
        'Quote or proposal',
        'Support',
        'Media / other',
        'Not sure yet',
      ],
    },
  },
};

/** Map lead.niche-style tokens → profile id (operator-entered or CRM). */
const NICHE_ALIASES = {
  home_services: 'home_services_trade',
  seasonal_services: 'seasonal_service',
  snow: 'seasonal_service',
  healthcare_clinics: 'healthcare_clinic',
  government_contractors: 'gov_contractor',
  local_services_general: 'local_service_general',
  hvac: 'home_services_trade',
  'hvac-plumbing': 'home_services_trade',
  'air-conditioning': 'home_services_trade',
  heating: 'home_services_trade',
  plumbing: 'home_services_trade',
  plumber: 'home_services_trade',
  electrical: 'home_services_trade',
  roofing: 'home_services_trade',
  pool: 'pool_service',
  pools: 'pool_service',
  lawn: 'lawn_care',
  landscaping: 'lawn_care',
  cleaning: 'local_service_general',
  'home-cleaning': 'local_service_general',
  'home-services': 'local_service_general',
  events: 'events_venues',
  venue: 'events_venues',
  catering: 'events_venues',
  healthcare: 'healthcare_clinic',
  clinic: 'healthcare_clinic',
  mental_health: 'mental_health',
  autism: 'autism_services',
  govcon: 'gov_contractor',
  government: 'gov_contractor',
  veteran: 'veteran_owned_services',
  nonprofit: 'nonprofit',
  professional: 'professional_services',
  b2b: 'b2b_enterprise',
  enterprise: 'b2b_enterprise',
  saas: 'b2b_enterprise',
  generic: 'unknown',
};

const _regexCache = new Map();

function compilePatterns(patternStrings) {
  const out = [];
  for (const p of patternStrings || []) {
    if (!p || typeof p !== 'string') continue;
    let re = _regexCache.get(p);
    if (!re) {
      try {
        re = new RegExp(p, 'i');
        _regexCache.set(p, re);
      } catch {
        continue;
      }
    }
    out.push(re);
  }
  return out;
}

function getProfile(profileId) {
  return PROFILES[profileId] || PROFILES.unknown;
}

/** Older demos / URLs used shorter keys; map to current profile ids. */
const LEGACY_DEMO_KEY_ALIASES = {
  hvac: 'home_services_trade',
  plumbing: 'home_services_trade',
  electrical: 'home_services_trade',
  roofing: 'home_services_trade',
  home_services: 'home_services_trade',
  seasonal_services: 'seasonal_service',
  seasonal_service: 'seasonal_service',
  healthcare_clinics: 'healthcare_clinic',
  government_contractors: 'gov_contractor',
  professional_services: 'professional_services',
  cleaning: 'local_service_general',
  'home-services': 'local_service_general',
  generic: 'unknown',
};

/** Operator / builder: list configurable profile metadata (no giant inference blobs). */
function listProfilesForOperator() {
  return listProfileIds()
    .map((id) => {
      const p = PROFILES[id];
      if (!p) return null;
      return {
        id: p.id,
        displayLabel: p.displayLabel,
        parentId: p.parentId,
        parentLabel: p.parentLabel,
        schedulingContextWeight: p.schedulingContextWeight,
        operatorNotes: p.operatorNotes || null,
        demoLabel: p.demo && p.demo.label,
        inferenceKeywordCount: (p.inference && p.inference.keywords && p.inference.keywords.length) || 0,
        inferencePatternCount: (p.inference && p.inference.patterns && p.inference.patterns.length) || 0,
      };
    })
    .filter(Boolean);
}

function listProfileIds() {
  return Object.keys(PROFILES);
}

function listDemoPresetKeys() {
  const keys = new Set(listProfileIds());
  for (const k of Object.keys(LEGACY_DEMO_KEY_ALIASES)) keys.add(k);
  return [...keys];
}

/**
 * Demo preset slice (compat with demo-industry-presets shape).
 * @param {string} key
 */
function getDemoPreset(key) {
  const k = String(key || 'unknown').toLowerCase().replace(/\s+/g, '-');
  const id = LEGACY_DEMO_KEY_ALIASES[k] || k;
  const p = getProfile(id);
  return {
    label: p.demo.label,
    defaultServices: p.demo.defaultServices,
    defaultIssueOptions: p.demo.defaultIssueOptions,
  };
}

function resolveProfileIdFromNiche(nicheRaw) {
  if (!nicheRaw || !String(nicheRaw).trim()) return null;
  const parts = String(nicheRaw)
    .split(/[,;/|]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const part of parts) {
    if (NICHE_ALIASES[part]) return NICHE_ALIASES[part];
    const slug = part.replace(/\s+/g, '-');
    if (NICHE_ALIASES[slug]) return NICHE_ALIASES[slug];
  }
  const hay = String(nicheRaw).toLowerCase();
  for (const [alias, pid] of Object.entries(NICHE_ALIASES)) {
    if (hay.includes(alias.replace(/-/g, ' '))) return pid;
  }
  return null;
}

module.exports = {
  PARENT_GROUPS,
  PROFILES,
  NICHE_ALIASES,
  getProfile,
  listProfileIds,
  listDemoPresetKeys,
  getDemoPreset,
  resolveProfileIdFromNiche,
  compilePatterns,
  listProfilesForOperator,
};
