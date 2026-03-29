/**
 * Sends website form submissions to info@jlsolutions.io (Resend).
 * Supported form-name values: contact, consultation, fix-my-app, newsletter.
 *
 * Set RESEND_API_KEY in Netlify. Use FORM_FROM_EMAIL with a domain verified in Resend
 * (e.g. JL Solutions <notifications@jlsolutions.io>) for production.
 *
 * When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, also inserts a row into
 * public.consultations so you can review submissions in Supabase (Table Editor).
 * This is separate from lead_engine_leads (operator / n8n pipeline).
 */
const { createClient } = require('@supabase/supabase-js');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = 'info@jlsolutions.io';
const FROM_EMAIL = process.env.FORM_FROM_EMAIL || 'JL Solutions Website <onboarding@resend.dev>';

function parseBody(event) {
  const contentType = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
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
  // Some proxies omit Content-Type on form POST; body is still urlencoded.
  if (body && typeof body === 'string' && body.includes('=') && !body.trim().startsWith('{')) {
    try {
      return Object.fromEntries(new URLSearchParams(body));
    } catch (_) {
      /* fall through */
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

function buildFixMyAppEmail(data) {
  const name = data.name || '(not provided)';
  const email = data.email || '(not provided)';
  const fields = [
    ['Name', name],
    ['Email', email],
    ['Company', data.company],
    ['App or Website URL', data.url],
    ["What's broken", data.issue],
    ['Built with', data.tech],
    ['Access', data.access],
    ['Urgency', data.urgency],
    ['Automation bundle interest', data.bundle],
  ];
  const rows = fields
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('');
  return {
    subject: `[JL Solutions Fix My App] ${name}`,
    html: `
      <h2>New Fix My App request</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
      <p><em>Sent from jlsolutions.io services/fix-my-app</em></p>
    `,
  };
}

function buildNewsletterEmail(data) {
  const email = data.email || '(not provided)';
  return {
    subject: `[JL Solutions Newsletter] Signup: ${email}`,
    html: `
      <h2>Insights / newsletter signup</h2>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><em>Sent from jlsolutions.io insights page</em></p>
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

function buildCustomerConfirmation(data) {
  const name = (data.name || 'there').trim().split(' ')[0];
  return {
    subject: 'We received your request - JL Solutions',
    html: `
      <h2>Hi ${escapeHtml(name)},</h2>
      <p>Thank you for reaching out. We received your consultation request and will be in touch within 1-2 business days.</p>
      <p>In the meantime, feel free to reply to this email with any questions.</p>
      <p> - The JL Solutions team</p>
      <p><em>info@jlsolutions.io</em></p>
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

function getServiceSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key || !/^https?:\/\//i.test(url)) return null;
  try {
    return createClient(url, key);
  } catch (e) {
    console.error('[send-form-email] Supabase client init failed:', e.message);
    return null;
  }
}

/**
 * Best-effort mirror into consultations (service role bypasses RLS). Does not block email.
 */
async function persistToConsultationsTable(formName, data) {
  const supabase = getServiceSupabase();
  if (!supabase) return;

  const email = (data.email || '').trim();
  let name = (data.name || '').trim();
  if (!email) {
    console.warn('[send-form-email] Skipping Supabase persist: missing email');
    return;
  }
  if (!name && formName === 'newsletter') name = 'Newsletter subscriber';
  if (!name) {
    console.warn('[send-form-email] Skipping Supabase persist: missing name');
    return;
  }

  let row;
  if (formName === 'consultation') {
    const ref = (data.referralCode || data.referral_code || '').trim().toUpperCase();
    row = {
      name,
      email,
      phone: data.phone ? String(data.phone).trim() : null,
      company: data.company ? String(data.company).trim() : null,
      service: data.service ? String(data.service).trim() : null,
      message: data.challenge ? String(data.challenge) : '',
      challenge: data.challenge ? String(data.challenge) : null,
      goals: data.goals ? String(data.goals) : null,
      referral_code: ref || null,
      selected_datetime: data.selectedDateTime ? String(data.selectedDateTime) : null,
      status: 'new',
      source: 'book_consultation',
    };
  } else if (formName === 'fix-my-app') {
    const issue = data.issue ? String(data.issue).trim() : '';
    row = {
      name,
      email,
      company: data.company ? String(data.company).trim() : null,
      service: 'fix-my-app',
      message: issue,
      challenge: issue || null,
      status: 'new',
      source: 'fix_my_app',
    };
  } else if (formName === 'newsletter') {
    row = {
      name,
      email,
      message: 'Insights index newsletter form',
      status: 'new',
      source: 'newsletter_insights',
    };
  } else {
    row = {
      name,
      email,
      message: data.message ? String(data.message) : '',
      status: 'new',
      source: 'contact_page',
    };
  }

  const { error } = await supabase.from('consultations').insert(row);
  if (error) {
    console.error('[send-form-email] consultations insert failed:', error.message || error);
  } else {
    console.log('[send-form-email] Stored submission in consultations (source=%s)', row.source);
  }
}

exports.handler = async (event) => {
  console.log('[send-form-email] Invoked', event.httpMethod, 'form:', event.body ? 'has body' : 'no body');
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

  await persistToConsultationsTable(formName, data);

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
  } else if (formName === 'fix-my-app') {
    const built = buildFixMyAppEmail(data);
    subject = built.subject;
    html = built.html;
  } else if (formName === 'newsletter') {
    const built = buildNewsletterEmail(data);
    subject = built.subject;
    html = built.html;
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
    console.error('[send-form-email] RESEND_API_KEY not set. Add it in Netlify: Site configuration → Environment variables → RESEND_API_KEY = your Resend key. Storing in Blobs as fallback.');
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

    console.log('[send-form-email] Sending to', TO_EMAIL, 'subject:', subject);
    // 1. Send lead to info@jlsolutions.io
    const { error: err1 } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      html,
      replyTo: data.email || undefined,
    });

    if (err1) {
      console.error('[send-form-email] Resend error (to info@):', JSON.stringify(err1));
      try {
        const { getStore } = require('@netlify/blobs');
        const store = getStore('consultation-leads');
        const raw = await store.get('fallback', { type: 'json' });
        const list = raw == null ? [] : (Array.isArray(raw) ? raw : []);
        list.push({ ...data, _storedAt: new Date().toISOString(), _formName: formName, _resendError: err1.message });
        await store.setJSON('fallback', list);
      } catch (e) {
        console.error('[send-form-email] Blob fallback failed:', e);
      }
      return redirectSuccess();
    }

    console.log('[send-form-email] Delivered to', TO_EMAIL, 'form=', formName);

    // 2. Send confirmation to customer (consultation, contact, fix-my-app, newsletter)
    const customerEmail = (data.email || '').trim();
    if (customerEmail) {
      const cust =
        formName === 'consultation'
          ? buildCustomerConfirmation(data)
          : formName === 'newsletter'
            ? {
                subject: "You're on the list - JL Solutions",
                html: `
          <h2>Thanks for subscribing</h2>
          <p>We’ll send occasional, practical notes on automation and operations.</p>
          <p> - The JL Solutions team</p>
          <p><em>info@jlsolutions.io</em></p>
        `,
              }
            : {
                subject: 'We received your message - JL Solutions',
                html: `
          <h2>Thank you for reaching out</h2>
          <p>We received your message and will get back to you within 1-2 business days.</p>
          <p> - The JL Solutions team</p>
          <p><em>info@jlsolutions.io</em></p>
        `,
              };
      const { error: err2 } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [customerEmail],
        subject: cust.subject,
        html: cust.html,
        replyTo: TO_EMAIL,
      });
      if (err2) {
        console.warn('[send-form-email] Customer confirmation failed (lead was sent):', err2);
      }
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
