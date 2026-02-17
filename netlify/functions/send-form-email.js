/**
 * Sends contact and consultation form submissions to info@jlsolutions.io.
 * Set RESEND_API_KEY in Netlify env. From address must be verified in Resend
 * (e.g. use onboarding@resend.dev for testing or verify jlsolutions.io).
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = 'info@jlsolutions.io';
const FROM_EMAIL = process.env.FORM_FROM_EMAIL || 'JL Solutions Website <onboarding@resend.dev>';

function parseBody(event) {
  const contentType = event.headers['content-type'] || '';
  const body = event.body || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(body));
  }
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(body);
    } catch (_) {
      return {};
    }
  }
  return {};
}

function buildContactEmail(data) {
  const name = data.name || '(not provided)';
  const email = data.email || '(not provided)';
  const message = data.message || '(not provided)';
  return {
    subject: `[JL Solutions Contact] From ${name}`,
    html: `
      <h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong></p>
      <pre>${escapeHtml(message)}</pre>
      <p><em>Sent from jlsolutions.io contact form</em></p>
    `,
  };
}

function buildConsultationEmail(data) {
  const name = data.name || '(not provided)';
  const email = data.email || '(not provided)';
  const fields = [
    ['Name', name],
    ['Email', email],
    ['Company', data.company],
    ['Phone', data.phone],
    ['Service', data.service],
    ['Referral Code', data.referralCode],
    ['Selected date/time', data.selectedDateTime],
    ['Challenges', data.challenge],
    ['Goals', data.goals],
  ];
  const rows = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('');
  return {
    subject: `[JL Solutions Consultation] ${name} – ${data.service || 'Consultation'}`,
    html: `
      <h2>New consultation request</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
      <p><em>Sent from jlsolutions.io book consultation form</em></p>
    `,
  };
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const data = parseBody(event);
  const formName = data['form-name'] || data.formName || 'contact';
  const botField = data['bot-field'];
  if (botField) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  }

  let subject, html;
  if (formName === 'consultation') {
    const built = buildConsultationEmail(data);
    subject = built.subject;
    html = built.html;

    const useSimpleAuth = process.env.REFERRAL_USE_SIMPLE_AUTH === 'true' || process.env.REFERRAL_USE_SIMPLE_AUTH === '1';
    const refCode = (data.referralCode || data.referral_code || '').trim().toUpperCase();
    if (useSimpleAuth && refCode && data.email) {
      try {
        const { appendReferral } = require('./referral-blob-append');
        await appendReferral({
          code: refCode,
          referred_email: data.email,
          amount_cents: 0,
          commission_cents: 0,
          status: 'consultation',
          source: 'consultation',
        });
      } catch (e) {
        console.error('[send-form-email] Failed to append consultation referral:', e);
      }
    }
  } else {
    const built = buildContactEmail(data);
    subject = built.subject;
    html = built.html;
  }

  const redirectSuccess = () => ({
    statusCode: 302,
    headers: { Location: '/thank-you.html' },
    body: '',
  });

  if (!RESEND_API_KEY) {
    console.error('[send-form-email] RESEND_API_KEY not set - storing in Blobs as fallback. Add RESEND_API_KEY to Netlify to enable email.');
    try {
      const { getStore } = require('@netlify/blobs');
      const store = getStore('consultation-leads');
      const raw = await store.get('fallback', { type: 'json' });
      const list = raw == null ? [] : (Array.isArray(raw) ? raw : []);
      list.push({
        ...data,
        _storedAt: new Date().toISOString(),
        _formName: formName,
      });
      await store.setJSON('fallback', list);
    } catch (e) {
      console.error('[send-form-email] Blob fallback failed:', e);
    }
    return redirectSuccess();
  }

  try {
    const Resend = require('resend');
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      html,
      replyTo: data.email || undefined,
    });

    if (error) {
      console.error('[send-form-email]', error);
      try {
        const { getStore } = require('@netlify/blobs');
        const store = getStore('consultation-leads');
        const raw = await store.get('fallback', { type: 'json' });
        const list = raw == null ? [] : (Array.isArray(raw) ? raw : []);
        list.push({ ...data, _storedAt: new Date().toISOString(), _formName: formName, _resendError: error.message });
        await store.setJSON('fallback', list);
      } catch (e) {
        console.error('[send-form-email] Blob fallback failed:', e);
      }
      return redirectSuccess();
    }
  } catch (err) {
    console.error('[send-form-email]', err);
    try {
      const { getStore } = require('@netlify/blobs');
      const store = getStore('consultation-leads');
      const raw = await store.get('fallback', { type: 'json' });
      const list = raw == null ? [] : (Array.isArray(raw) ? raw : []);
      list.push({ ...data, _storedAt: new Date().toISOString(), _formName: formName, _error: err.message });
      await store.setJSON('fallback', list);
    } catch (e) {
      console.error('[send-form-email] Blob fallback failed:', e);
    }
    return redirectSuccess();
  }

  return redirectSuccess();
};
