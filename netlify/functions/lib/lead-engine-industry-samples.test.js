'use strict';

/**
 * Phase 6: document-style checks — diverse companies, signal-grounded offers, clean demo presets.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { inferIndustryProfile } = require('./lead-engine-industry-inference');
const { computeDeterministicOfferSelection, OFFERS } = require('./lead-engine-offer-deterministic');
const { getDemoPreset, listProfilesForOperator } = require('./industry-profiles');
const { resolveDemoIndustryForLead } = require('./lead-engine-demo-templates');

function signalsFor(title, h1, meta, aggOverrides) {
  return {
    success: true,
    pages: [
      {
        url: 'https://example.com/',
        role: 'home',
        page_title: title,
        h1,
        meta_description: meta,
        forms_count: 1,
        ctas: [],
        booking_links: [],
      },
    ],
    aggregate: Object.assign(
      {
        pages_fetched: 1,
        forms_count_total: 1,
        booking_detected: false,
        trust_markers: [],
        chat_widget_hints: [],
        cta_count_home: 1,
        has_visible_phone: false,
        has_mailto: false,
        has_tel: false,
        has_email_in_text: false,
        has_phone_in_text: false,
        has_contact_form_like: true,
        social_links: [],
      },
      aggOverrides || {}
    ),
    ux_hints: ['missing_clear_cta'],
    psi: { primary_scores: { performance_score: 70, best_practices_score: 80 } },
  };
}

test('listProfilesForOperator returns stable metadata rows', () => {
  const rows = listProfilesForOperator();
  assert.ok(rows.length >= 10);
  const pool = rows.find((r) => r.id === 'pool_service');
  assert.ok(pool);
  assert.equal(pool.parentId, 'local_service');
});

const SAMPLES = [
  {
    name: 'pool',
    lead: { company_name: 'Aqua Blue Pools', website_url: 'https://aquablue.example' },
    sig: signalsFor('Pool service', 'Weekly pool cleaning', 'Swimming pool repair and maintenance'),
    expectProfile: 'pool_service',
  },
  {
    name: 'lawn',
    lead: { company_name: 'Green Lawn Co', website_url: 'https://greenlawn.example' },
    sig: signalsFor('Lawn care', 'Mowing and fertilization', 'Professional landscaping and irrigation systems'),
    expectProfile: 'lawn_care',
  },
  {
    name: 'events',
    lead: { company_name: 'Harbor Events', website_url: 'https://harbor.example' },
    sig: signalsFor('Wedding venue', 'Corporate events & catering', 'Plan your wedding or corporate event with us'),
    expectProfile: 'events_venues',
  },
  {
    name: 'mental_health',
    lead: { company_name: 'Calm Harbor Therapy', website_url: 'https://calm.example' },
    sig: signalsFor('Therapy', 'Counseling and psychotherapy', 'Book a therapy session; anxiety support'),
    expectProfile: 'mental_health',
  },
  {
    name: 'autism',
    lead: { company_name: 'Bright Path ABA', website_url: 'https://bright.example' },
    sig: signalsFor('ABA therapy', 'Autism services for families', 'BCBA-led ABA therapy and intake'),
    expectProfile: 'autism_services',
  },
  {
    name: 'veteran',
    lead: {
      company_name: 'Veteran Owned Consulting LLC',
      website_url: 'https://voc.example',
    },
    sig: signalsFor('Consulting', 'Advisory for teams', 'Veteran-owned business consulting and training'),
    expectProfile: 'veteran_owned_services',
  },
  {
    name: 'govcon',
    lead: { company_name: 'Federal Solutions Partners', website_url: 'https://fedsol.example' },
    sig: signalsFor('GovCon', 'Government contracting', 'SAM.gov, RFP response, and FAR compliance support'),
    expectProfile: 'gov_contractor',
  },
  {
    name: 'nonprofit',
    lead: { company_name: 'River Community Foundation', website_url: 'https://riverfdn.example' },
    sig: signalsFor('Our nonprofit', 'Donate and volunteer', '501(c)(3) charity serving local families'),
    expectProfile: 'nonprofit',
  },
  {
    name: 'unknown_generic',
    lead: { company_name: 'Acme Co', website_url: 'https://acme.example' },
    sig: signalsFor('Welcome', 'Hello', 'We are a company'),
    expectProfile: 'unknown',
  },
];

for (const s of SAMPLES) {
  test('sample: ' + s.name + ' inference + demo preset + offer', () => {
    const inf = inferIndustryProfile({ lead: s.lead, signals: s.sig });
    assert.equal(inf.profile_id, s.expectProfile, 'profile for ' + s.name);
    const demoKey = resolveDemoIndustryForLead(s.lead, s.sig);
    const preset = getDemoPreset(demoKey);
    assert.ok(preset.label);
    assert.ok(preset.defaultServices.length);
    const offer = computeDeterministicOfferSelection(s.lead, s.sig);
    assert.ok(offer.selected_offer);
    assert.ok(Object.values(OFFERS).includes(offer.selected_offer));
    assert.ok(offer.industry_inference.profile_id);
  });
}
