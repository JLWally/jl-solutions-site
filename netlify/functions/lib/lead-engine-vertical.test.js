'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inferIndustryProfile } = require('./lead-engine-industry-inference');
const { computeDeterministicOfferSelection, OFFERS } = require('./lead-engine-offer-deterministic');
const { resolveDemoIndustryForLead } = require('./lead-engine-demo-templates');
const { buildNormalizedVerticalSignals } = require('./lead-engine-vertical-signals');

function miniSignals(pageTitle, h1, meta, extra) {
  return {
    success: true,
    pages: [
      {
        url: 'https://example.com/',
        role: 'home',
        page_title: pageTitle,
        h1,
        meta_description: meta,
        forms_count: 1,
        ctas: [],
        booking_links: [],
        ...extra,
      },
    ],
    aggregate: {
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
    ux_hints: ['missing_clear_cta'],
    psi: { primary_scores: { performance_score: 70, best_practices_score: 80 } },
  };
}

test('inferIndustryProfile: pool company', () => {
  const lead = { company_name: 'Crystal Clear Pools', website_url: 'https://crystalpools.example' };
  const sig = miniSignals('Pool cleaning & repair', 'Weekly pool service', 'Swimming pool maintenance and repair');
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'pool_service');
  assert.ok(['medium', 'high'].includes(r.confidence));
});

test('inferIndustryProfile: lawn care', () => {
  const lead = { company_name: 'Green Stripe Lawn', website_url: 'https://greenstripe.example' };
  const sig = miniSignals('Lawn care', 'Mowing and fertilization', 'Professional landscaping and irrigation');
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'lawn_care');
});

test('inferIndustryProfile: events / venue', () => {
  const lead = { company_name: 'Harbor Events', website_url: 'https://harborevents.example' };
  const sig = miniSignals('Corporate events', 'Wedding venue & catering', 'Plan your wedding or corporate event');
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'events_venues');
});

test('inferIndustryProfile: mental health clinic', () => {
  const lead = { company_name: 'Riverside Counseling', website_url: 'https://riverside.example' };
  const sig = miniSignals('Therapy', 'Counseling & psychotherapy', 'Book a therapy session; anxiety and depression support');
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'mental_health');
});

test('inferIndustryProfile: autism services', () => {
  const lead = { company_name: 'Bright Path ABA', website_url: 'https://brightpath.example' };
  const sig = miniSignals('ABA therapy', 'Autism services for families', 'BCBA-led ABA therapy and intake');
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'autism_services');
});

test('inferIndustryProfile: veteran-owned consulting', () => {
  const lead = {
    company_name: 'Veteran Owned Consulting LLC',
    website_url: 'https://voconsult.example',
  };
  const sig = miniSignals('Consulting', 'Advisory for growing teams', 'Veteran-owned business consulting');
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'veteran_owned_services');
});

test('inferIndustryProfile: government contractor', () => {
  const lead = { company_name: 'Federal Solutions Partners', website_url: 'https://fedsol.example' };
  const sig = miniSignals(
    'GovCon advisory',
    'Government contracting support',
    'SAM.gov registration, RFP response, and FAR compliance'
  );
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'gov_contractor');
});

test('inferIndustryProfile: unknown / generic', () => {
  const lead = { company_name: 'Acme Co', website_url: 'https://acme.example' };
  const sig = miniSignals('Welcome', 'Hello', 'We are a company');
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'unknown');
  assert.equal(r.confidence, 'low');
});

test('inferIndustryProfile: B2B SaaS beats weak local-service fallback', () => {
  const lead = { company_name: 'Nimbus ERP', website_url: 'https://nimbus.example' };
  const sig = miniSignals(
    'Enterprise software',
    'B2B platform for organizations',
    'Request a demo — locally owned team serving national clients with SOC 2 compliance'
  );
  const r = inferIndustryProfile({ lead, signals: sig });
  assert.equal(r.profile_id, 'b2b_enterprise');
  assert.equal(r.parent_id, 'b2b_regulated');
});

test('buildNormalizedVerticalSignals: B2B and compliance flags', () => {
  const sig = miniSignals(
    'Platform',
    'Contact sales',
    'FedRAMP-authorized SaaS for enterprise customers; HIPAA BAA available',
    {}
  );
  const n = buildNormalizedVerticalSignals(sig);
  assert.equal(n.b2b_or_enterprise_cues, true);
  assert.equal(n.compliance_sensitive_language, true);
});

test('resolveDemoIndustryForLead uses vertical_intelligence when embedded', () => {
  const lead = { company_name: 'X', niche: 'hvac' };
  const sig = {
    success: true,
    vertical_intelligence: {
      industry_inference: { profile_id: 'pool_service', display_label: 'Pool' },
    },
    pages: [],
  };
  assert.equal(resolveDemoIndustryForLead(lead, sig), 'pool_service');
});

test('offer selection: mental health weak intake → AI Intake or Scheduling (signal-led)', () => {
  const lead = { company_name: 'Calm Harbor Therapy', website_url: 'https://calmharbor.example' };
  const sig = miniSignals(
    'Therapy practice',
    'Schedule a counseling session',
    'New patient intake and insurance verification',
    { forms_count: 0 }
  );
  sig.aggregate.forms_count_total = 0;
  sig.aggregate.has_contact_form_like = false;
  sig.ux_hints = ['missing_contact_form', 'missing_clear_cta', 'no_obvious_booking_path'];
  const out = computeDeterministicOfferSelection(lead, sig);
  assert.equal(out.industry_inference.profile_id, 'mental_health');
  assert.ok(
    [OFFERS.AI_INTAKE, OFFERS.SCHEDULING, OFFERS.WEBSITE].includes(out.selected_offer),
    'selected ' + out.selected_offer
  );
});

test('buildNormalizedVerticalSignals sets cross-vertical flags', () => {
  const sig = miniSignals(
    'Clinic',
    'Patient portal',
    'HIPAA-compliant new patient intake and appointment request',
    {}
  );
  sig.aggregate.forms_count_total = 2;
  const n = buildNormalizedVerticalSignals(sig);
  assert.equal(n.compliance_sensitive_language, true);
  assert.equal(n.appointment_or_intake_language, true);
});
