'use strict';

const { buildCompactSummary } = require('./lead-engine-audit-signals');

const HUBSPOT_BASE = 'https://api.hubapi.com';

function hubspotToken() {
  return (process.env.HUBSPOT_PRIVATE_APP_TOKEN || '').trim();
}

function hasHubspotConfig() {
  return !!hubspotToken();
}

function buildHubspotDescription({ lead, analysisRow, aiScoreRow, outreachSummary }) {
  const sum = buildCompactSummary(analysisRow && analysisRow.signals);
  const sig = analysisRow && analysisRow.signals;
  const psi = sig && sig.psi && sig.psi.primary_scores;
  const lines = [];
  lines.push(`Lead Engine ID: ${lead.id}`);
  lines.push(`Lead status: ${lead.status || 'unknown'}`);
  if (lead.website_url) lines.push(`Website: ${lead.website_url}`);
  if (lead.niche) lines.push(`Niche: ${lead.niche}`);
  if (lead.city || lead.state) {
    lines.push(`Location: ${[lead.city, lead.state].filter(Boolean).join(', ')}`);
  }
  if (lead.lead_score != null) lines.push(`Lead score (snapshot): ${lead.lead_score}/100`);
  if (psi && psi.performance_score != null) {
    lines.push(
      `PSI (home, mobile): perf ${psi.performance_score}/100 · a11y ${psi.accessibility_score}/100 · BP ${psi.best_practices_score}/100 · SEO ${psi.seo_score}/100`
    );
  } else if (lead.page_speed_score != null) {
    lines.push(`PSI performance (snapshot): ${lead.page_speed_score}/100`);
  }
  if (sum && sum.success === true) {
    lines.push(`Audit: success (${sum.pages_fetched || 0} pages)`);
    if (sum.page_title) lines.push(`Audit title: ${sum.page_title}`);
    if (sum.booking_detected) lines.push('Audit booking detected: yes');
  } else if (sum && sum.success === false) {
    lines.push('Audit: failed');
  }
  if (aiScoreRow && aiScoreRow.scores && typeof aiScoreRow.scores === 'object') {
    if (aiScoreRow.scores.fit_score != null) lines.push(`Fit score: ${aiScoreRow.scores.fit_score}/100`);
    if (aiScoreRow.recommended_offer) lines.push(`Recommended offer: ${aiScoreRow.recommended_offer}`);
  }
  if (outreachSummary && outreachSummary.latest_sent && outreachSummary.latest_sent.sent_at) {
    lines.push(`Latest outreach sent at: ${outreachSummary.latest_sent.sent_at}`);
  } else if (outreachSummary && outreachSummary.latest_approved) {
    lines.push('Latest outreach: approved (not sent)');
  } else if (outreachSummary && outreachSummary.latest_draft) {
    lines.push('Latest outreach: draft');
  }
  return lines.join('\n').slice(0, 65000);
}

function buildHubspotContactPayload({ lead, analysisRow, aiScoreRow, outreachSummary }) {
  return {
    properties: {
      email: lead.contact_email,
      company: lead.company_name || '',
      website: lead.website_url || '',
      lifecyclestage: 'lead',
      description: buildHubspotDescription({ lead, analysisRow, aiScoreRow, outreachSummary }),
    },
  };
}

async function hubspotRequest(path, { method = 'GET', body } = {}) {
  const token = hubspotToken();
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.status)) ||
      `HubSpot request failed with status ${res.status}`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function findHubspotContactIdByEmail(email) {
  const data = await hubspotRequest('/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      limit: 1,
      properties: ['email'],
    },
  });
  const row = data && data.results && data.results[0];
  return row && row.id ? String(row.id) : null;
}

async function upsertHubspotContact({ externalCrmId, payload }) {
  let crmId = externalCrmId ? String(externalCrmId).trim() : '';
  if (crmId) {
    const updated = await hubspotRequest(`/crm/v3/objects/contacts/${encodeURIComponent(crmId)}`, {
      method: 'PATCH',
      body: payload,
    });
    return { crmId: String(updated.id), action: 'updated' };
  }

  const email = payload && payload.properties && payload.properties.email;
  const found = await findHubspotContactIdByEmail(email);
  if (found) {
    const updated = await hubspotRequest(`/crm/v3/objects/contacts/${encodeURIComponent(found)}`, {
      method: 'PATCH',
      body: payload,
    });
    return { crmId: String(updated.id), action: 'updated' };
  }

  const created = await hubspotRequest('/crm/v3/objects/contacts', {
    method: 'POST',
    body: payload,
  });
  return { crmId: String(created.id), action: 'created' };
}

module.exports = {
  hasHubspotConfig,
  buildHubspotContactPayload,
  upsertHubspotContact,
};

