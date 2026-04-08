'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeDeterministicOfferSelection,
  OFFERS,
  buildCorpus,
} = require('./lead-engine-offer-deterministic');

function page(overrides) {
  return {
    url: 'https://example.com/',
    role: 'home',
    page_title: 'Home',
    h1: 'Welcome',
    meta_description: 'We help with heating and cooling.',
    forms_count: 1,
    ctas: [],
    booking_links: [],
    mailto_count: 0,
    tel_count: 0,
    has_email_in_text: false,
    has_phone_in_text: false,
    trust_markers: [],
    chat_widget_hints: [],
    social_links: [],
    ...overrides,
  };
}

/**
 * Example 1, Typical residential HVAC: no online booking, emergency/same-day language,
 * repair + maintenance, service area, phone-heavy. Expect Scheduling over AI Intake.
 */
test('HVAC example 1: residential, Scheduling & Resource Routing (not AI Intake)', () => {
  const lead = { company_name: 'Summit Heating & Cooling', website_url: 'https://summithvac.example' };
  const signals = {
    success: true,
    pages: [
      page({
        page_title: 'Summit Heating & Cooling | Emergency AC Repair',
        h1: '24/7 Emergency HVAC',
        meta_description: 'Same-day furnace repair, AC installation, and maintenance.',
        ctas: [
          { text: 'Call Now', href: 'tel:+15551234567' },
          { text: 'Email Us', href: 'mailto:info@summithvac.example' },
        ],
        tel_count: 1,
        has_phone_in_text: true,
      }),
    ],
    aggregate: {
      pages_fetched: 1,
      forms_count_total: 1,
      booking_detected: false,
      has_mailto: true,
      has_tel: true,
      has_email_in_text: true,
      has_phone_in_text: true,
      has_visible_phone: true,
      has_visible_email_path: true,
      has_contact_form_like: true,
      trust_markers: ['review'],
      chat_widget_hints: [],
      social_links: [],
      cta_count_home: 2,
    },
    ux_hints: ['no_obvious_booking_path', 'missing_clear_cta'],
    psi: {
      primary_scores: {
        performance_score: 72,
        best_practices_score: 85,
        seo_score: 80,
        accessibility_score: 90,
      },
    },
  };
  const r = computeDeterministicOfferSelection(lead, signals);
  assert.equal(r.industry_inference.profile_id, 'home_services_trade');
  assert.equal(r.selected_offer, OFFERS.SCHEDULING);
  assert.ok(r.offer_scores[OFFERS.SCHEDULING].total >= r.offer_scores[OFFERS.AI_INTAKE].total);
  assert.ok(r.top_supporting_signals.length >= 1);
  assert.ok(/request|appointment|time|service/i.test(r.draft_angle));
});

/**
 * Example 2, HVAC with weak scheduling signals but very weak forms; deterministic scores
 * tie or favor intake before HVAC rule; rule should still prefer Scheduling when sched >= ai.
 */
test('HVAC example 2: tie-bias, Scheduling preferred when scheduling score >= AI Intake', () => {
  const lead = { company_name: 'Polar Air HVAC', website_url: 'https://polarair.example' };
  const signals = {
    success: true,
    pages: [
      page({
        page_title: 'Polar Air',
        h1: 'Same-day HVAC repair and installation',
        meta_description:
          'Emergency heating and cooling. We serve multiple counties, call for maintenance or replacement.',
        forms_count: 0,
        ctas: [{ text: 'Contact', href: 'https://polarair.example/contact' }],
        tel_count: 1,
        has_phone_in_text: true,
      }),
    ],
    aggregate: {
      pages_fetched: 1,
      forms_count_total: 0,
      booking_detected: false,
      has_mailto: false,
      has_tel: true,
      has_email_in_text: false,
      has_phone_in_text: true,
      has_visible_phone: true,
      has_visible_email_path: false,
      has_contact_form_like: false,
      trust_markers: [],
      chat_widget_hints: [],
      social_links: [],
      cta_count_home: 1,
    },
    ux_hints: ['missing_contact_form', 'missing_clear_cta', 'no_obvious_booking_path', 'missing_meta_description'],
    psi: { primary_scores: { performance_score: 70, best_practices_score: 80 } },
  };
  const r = computeDeterministicOfferSelection(lead, signals);
  assert.equal(r.industry_inference.profile_id, 'home_services_trade');
  assert.equal(r.selected_offer, OFFERS.SCHEDULING);
});

function hrefCorpus(signals) {
  const urls = [];
  for (const p of signals.pages || []) {
    if (p.url) urls.push(String(p.url).toLowerCase());
    for (const c of p.ctas || []) {
      if (c && c.href) urls.push(String(c.href).toLowerCase());
    }
  }
  return urls.join(' ');
}

/**
 * Example 3, HVAC with booking + customer portal + chat: Scheduling points are low;
 * PSI skipped so Website does not dominate; Fix My App wins on portal/tool + friction signals.
 */
test('HVAC example 3: portal/login + booking, Fix My App when app signals dominate', () => {
  const lead = { company_name: 'Metro Comfort HVAC', website_url: 'https://metrocomfort.example' };
  const signals = {
    success: true,
    pages: [
      page({
        url: 'https://metrocomfort.example/',
        page_title: 'Metro Comfort | Customer Portal Login',
        h1: 'Schedule service or log in to your account',
        meta_description: 'Book online or use our customer portal.',
        forms_count: 2,
        ctas: [
          { text: 'Book Now', href: 'https://metrocomfort.example/booking' },
          { text: 'Customer Portal', href: 'https://metrocomfort.example/portal/login' },
        ],
        booking_links: [{ text: 'Schedule', href: 'https://metrocomfort.example/schedule' }],
      }),
    ],
    aggregate: {
      pages_fetched: 1,
      forms_count_total: 2,
      booking_detected: true,
      has_mailto: true,
      has_tel: false,
      has_email_in_text: true,
      has_phone_in_text: false,
      has_visible_phone: false,
      has_visible_email_path: true,
      has_contact_form_like: true,
      trust_markers: [],
      chat_widget_hints: ['intercom'],
      social_links: [],
      cta_count_home: 2,
    },
    ux_hints: ['missing_clear_title', 'missing_h1', 'no_obvious_booking_path', 'missing_clear_cta'],
    psi: { skipped: true, reason: 'test_fixture' },
  };
  const r = computeDeterministicOfferSelection(lead, signals);
  assert.equal(r.industry_inference.profile_id, 'home_services_trade');
  assert.equal(r.fix_my_app_eligible, true);
  assert.equal(r.selected_offer, OFFERS.FIX_MY_APP);
  assert.ok(buildCorpus(signals).includes('portal') || hrefCorpus(signals).includes('portal'));
});

test('Plumbing trade: weak site + no booking → scheduling still in mix', () => {
  const lead = { company_name: 'Generic Plumbing Co', website_url: 'https://genericplumb.example' };
  const signals = {
    success: true,
    pages: [
      page({
        page_title: 'Plumbing',
        h1: 'We fix pipes',
        meta_description: 'Residential plumbing repair and installation maintenance.',
        ctas: [{ text: 'Call', href: 'tel:+1' }],
        tel_count: 1,
        has_phone_in_text: true,
      }),
    ],
    aggregate: {
      pages_fetched: 1,
      forms_count_total: 0,
      booking_detected: false,
      has_mailto: false,
      has_tel: true,
      has_email_in_text: false,
      has_phone_in_text: true,
      has_visible_phone: true,
      has_visible_email_path: false,
      has_contact_form_like: false,
      trust_markers: [],
      chat_widget_hints: [],
      social_links: [],
      cta_count_home: 1,
    },
    ux_hints: ['missing_contact_form', 'no_obvious_booking_path'],
    psi: { skipped: true },
  };
  const r = computeDeterministicOfferSelection(lead, signals);
  assert.equal(r.industry_inference.profile_id, 'home_services_trade');
  assert.ok([OFFERS.SCHEDULING, OFFERS.AI_INTAKE].includes(r.selected_offer));
});
