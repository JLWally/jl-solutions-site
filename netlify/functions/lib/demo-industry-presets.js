/**
 * Default service lists per industry for the smart demo generator.
 * Merged with user-provided services on save.
 */
const PRESETS = {
  hvac: {
    label: 'HVAC',
    defaultServices: [
      'Emergency repair',
      'Maintenance / tune-up',
      'System replacement',
      'Ductwork / indoor air quality',
    ],
    defaultIssueOptions: [
      'Not cooling',
      'Not heating',
      'System won’t turn on',
      'Strange noise',
      'Leak or water issue',
      'Need inspection',
    ],
  },
  plumbing: {
    label: 'Plumbing',
    defaultServices: [
      'Leak / burst',
      'Drain / sewer',
      'Water heater',
      'Fixture install',
    ],
    defaultIssueOptions: [
      'Active leak or burst',
      'Drain clog or backup',
      'No hot water',
      'Toilet / fixture problem',
      'Water heater issue',
      'Need estimate',
    ],
  },
  roofing: {
    label: 'Roofing',
    defaultServices: [
      'Storm damage inspection',
      'Repair',
      'Replacement estimate',
      'Gutters',
    ],
    defaultIssueOptions: [
      'Leak or water stain',
      'Storm / wind damage',
      'Missing or damaged shingles',
      'Gutters',
      'Inspection only',
      'Replacement quote',
    ],
  },
  'home-services': {
    label: 'Home services / cleaning',
    defaultServices: [
      'Recurring cleaning',
      'Deep clean / move-out',
      'Post-construction',
      'One-time booking',
    ],
    defaultIssueOptions: [
      'Recurring service',
      'One-time deep clean',
      'Move-in / move-out',
      'Post-construction clean',
      'Special request',
      'Quote first',
    ],
  },
  electrical: {
    label: 'Electrical',
    defaultServices: [
      'Emergency service',
      'Panel / upgrade',
      'Lighting install',
      'EV charger',
    ],
    defaultIssueOptions: [
      'Power out / breaker tripping',
      'Outlet or switch problem',
      'Lighting install',
      'Panel upgrade',
      'EV charger',
      'Safety inspection',
    ],
  },
  healthcare: {
    label: 'Healthcare / clinics',
    defaultServices: [
      'New patient intake',
      'Appointment request',
      'Referral',
      'Billing question',
    ],
    defaultIssueOptions: [
      'New patient',
      'Follow-up visit',
      'Referral',
      'Billing / insurance',
      'Records request',
      'Other',
    ],
  },
  professional: {
    label: 'Professional services',
    defaultServices: [
      'Consultation request',
      'Project quote',
      'Ongoing retainer',
      'Speaking / media',
    ],
    defaultIssueOptions: [
      'Initial consultation',
      'Project scope / quote',
      'Ongoing engagement',
      'Urgent deadline',
      'General question',
      'Other',
    ],
  },
  cleaning: {
    label: 'Cleaning',
    defaultServices: [
      'House Cleaning',
      'Deep Cleaning',
      'Move-In/Out',
      'Commercial Cleaning',
      'Recurring Service',
    ],
    defaultIssueOptions: [
      'One-time clean',
      'Recurring service',
      'Urgent clean',
      'Estimate request',
    ],
  },
  generic: {
    label: 'General / other',
    defaultServices: [
      'Service request',
      'Quote / estimate',
      'Support',
      'Other',
    ],
    defaultIssueOptions: [
      'Service request',
      'Quote or estimate',
      'Support question',
      'Scheduling',
      'Not sure yet',
      'Other',
    ],
  },
};

function listIndustryKeys() {
  return Object.keys(PRESETS);
}

function getPreset(key) {
  const k = String(key || 'generic').toLowerCase().replace(/\s+/g, '-');
  return PRESETS[k] || PRESETS.generic;
}

/**
 * Normalize services: unique, non-empty, capped.
 */
function normalizeServices(userList, industryKey, max = 12) {
  const preset = getPreset(industryKey);
  const base = Array.isArray(userList)
    ? userList.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const seen = new Set();
  const out = [];
  for (const s of base) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  if (out.length === 0) {
    return preset.defaultServices.slice(0, max);
  }
  return out;
}

/**
 * Normalize issue / symptom options for multi-step demo (wizard step 2).
 */
function normalizeIssueOptions(userList, industryKey, max = 12) {
  const preset = getPreset(industryKey);
  const fallback = preset.defaultIssueOptions || PRESETS.generic.defaultIssueOptions;
  const base = Array.isArray(userList)
    ? userList.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const seen = new Set();
  const out = [];
  for (const s of base) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  if (out.length === 0) {
    return fallback.slice(0, max);
  }
  return out;
}

module.exports = {
  PRESETS,
  getPreset,
  listIndustryKeys,
  normalizeServices,
  normalizeIssueOptions,
};
