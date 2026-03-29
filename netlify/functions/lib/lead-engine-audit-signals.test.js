'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('node-html-parser');
const {
  extractPageSignals,
  extractCtas,
  discoverSecondaryPageUrls,
  deriveUxHints,
  mergeAggregates,
  buildCompactSummary,
  buildSuccessSignalBundle,
  BOOKING_RE,
} = require('./lead-engine-audit-signals');

const SAMPLE_HTML = `<!DOCTYPE html><html><head>
<title>Acme Plumbing</title>
<meta name="description" content="Trusted local plumbing since 1999">
</head><body>
<h1>We fix leaks fast</h1>
<form action="/submit"><input type="text" name="q"></form>
<a href="/contact-us">Contact</a>
<a href="mailto:help@acme.test">Email us</a>
<a href="tel:+15551234567">Call</a>
<a href="/schedule-service" class="cta">Schedule service</a>
<button type="button">Get quote</button>
<p>Read our testimonials from happy customers. We are licensed and insured.</p>
<script src="https://js.intercom.io/widget.js"></script>
<a href="https://facebook.com/acme">FB</a>
</body></html>`;

test('BOOKING_RE matches schedule path', () => {
  assert.equal(BOOKING_RE.test('/book-now'), true);
  assert.equal(BOOKING_RE.test('nothing'), false);
});

test('extractPageSignals captures title meta h1 forms ctas booking', () => {
  const base = 'https://acme.test/';
  const s = extractPageSignals(SAMPLE_HTML, base);
  assert.equal(s.page_title, 'Acme Plumbing');
  assert.ok(s.meta_description.includes('1999'));
  assert.equal(s.h1, 'We fix leaks fast');
  assert.equal(s.forms_count, 1);
  assert.ok(s.ctas.length >= 2);
  assert.ok(s.booking_links.length >= 1);
  assert.equal(s.mailto_count, 1);
  assert.equal(s.tel_count, 1);
  assert.ok(s.trust_markers.includes('testimonial'));
  assert.ok(s.trust_markers.includes('licensed'));
  assert.ok(s.chat_widget_hints.some((h) => h.includes('intercom')));
  assert.ok(s.social_links.includes('facebook'));
});

test('extractPageSignals flags first-party chatbot.js in HTML', () => {
  const html = `<!DOCTYPE html><html><head><title>T</title></head><body><h1>H</h1><script src="/js/chatbot.js" defer></script></body></html>`;
  const s = extractPageSignals(html, 'https://jl.example/');
  assert.ok(s.chat_widget_hints.includes('chatbot.js'));
});

test('extractCtas respects max and skips hash links', () => {
  const root = parse(
    '<a href="#x">Skip</a><a href="/a">Real A</a><a href="/b">Real B</a>',
    { lowerCaseTagName: true }
  );
  const ctas = extractCtas(root, 'https://x.com/', 2);
  assert.equal(ctas.length, 2);
  assert.ok(ctas.every((c) => c.href.startsWith('http')));
});

test('discoverSecondaryPageUrls same origin only', () => {
  const html =
    '<a href="/contact">c</a><a href="https://evil.com/contact">e</a><a href="/book">b</a>';
  const urls = discoverSecondaryPageUrls(html, 'https://site.example/', 2);
  assert.ok(urls.every((u) => u.startsWith('https://site.example')));
  assert.equal(urls.length, 2);
});

test('mergeAggregates sums forms and detects booking', () => {
  const pages = [
    { forms_count: 1, booking_links: [], mailto_count: 0, tel_count: 0 },
    { forms_count: 0, booking_links: [{ href: 'x' }], mailto_count: 1, tel_count: 0 },
  ];
  const a = mergeAggregates(pages);
  assert.equal(a.forms_count_total, 1);
  assert.equal(a.booking_detected, true);
  assert.equal(a.has_mailto, true);
});

test('deriveUxHints flags missing pieces', () => {
  const pages = [
    {
      page_title: '',
      meta_description: '',
      h1: null,
      forms_count: 0,
      ctas: [],
      booking_links: [],
      mailto_count: 0,
      tel_count: 0,
      has_email_in_text: false,
      has_phone_in_text: false,
    },
  ];
  const agg = mergeAggregates(pages);
  const hints = deriveUxHints(pages, agg);
  assert.ok(hints.includes('missing_clear_title'));
  assert.ok(hints.includes('missing_meta_description'));
  assert.ok(hints.includes('missing_h1'));
  assert.ok(hints.includes('missing_contact_form'));
});

test('buildCompactSummary and buildSuccessSignalBundle', () => {
  const bundle = buildSuccessSignalBundle('https://x.com/', [
    {
      url: 'https://x.com/',
      role: 'home',
      signals: extractPageSignals(SAMPLE_HTML, 'https://acme.test/'),
    },
  ]);
  assert.equal(bundle.success, true);
  const sum = buildCompactSummary(bundle);
  assert.equal(sum.success, true);
  assert.ok(sum.page_title);
});
