'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHubspotContactPayload } = require('./lead-engine-crm-hubspot');

test('buildHubspotContactPayload maps compact fields', () => {
  const payload = buildHubspotContactPayload({
    lead: {
      id: 'lead-1',
      contact_email: 'prospect@example.com',
      company_name: 'Acme Co',
      website_url: 'https://acme.example',
      status: 'analyzed',
    },
    analysisRow: {
      signals: {
        success: true,
        page_title: 'Acme',
        pages_fetched: 2,
        booking_detected: true,
      },
    },
    aiScoreRow: {
      scores: { fit_score: 77 },
      recommended_offer: 'Fix My App',
    },
    outreachSummary: {
      latest_sent: { sent_at: '2025-03-30T12:00:00.000Z' },
    },
  });

  assert.equal(payload.properties.email, 'prospect@example.com');
  assert.equal(payload.properties.company, 'Acme Co');
  assert.equal(payload.properties.website, 'https://acme.example');
  assert.equal(payload.properties.lifecyclestage, 'lead');
  assert.match(payload.properties.description, /Lead Engine ID: lead-1/);
  assert.match(payload.properties.description, /Fit score: 77\/100/);
  assert.match(payload.properties.description, /Recommended offer: Fix My App/);
});

