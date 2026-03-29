/**
 * Sends website form submissions to info@jlsolutions.io (Resend).
 * Supported form-name values: contact, consultation, fix-my-app, newsletter,
 * roi-calculator, ai-intake-demo, onboard-payment, pay-checkout.
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

function getRawBody(event) {
  if (event.body == null || event.body === '') return '';
  const b = event.body;
  if (event.isBase64Encoded && typeof b === 'string') {
    try {
      return Buffer.from(b, 'base64').toString('utf8');
    } catch (e) {
      console.error('[send-form-email] base64 decode failed', e.message);
      return '';
    }
  }
  return typeof b === 'string' ? b : '';
}

function parseBody(event) {
  const body = getRawBody(event);
  const contentType = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
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

function buildRoiCalculatorEmail(data) {
  const name = data.name || '(not provided)';
  const email = data.email || '(not provided)';
  const inputs = [
    ['Team size', data.teamSize],
    ['Avg hourly rate ($)', data.avgSalary],
    ['Manual task hours/week', data.hoursPerWeek],
    ['Error rate (%)', data.errorRate],
    ['Cost per error ($)', data.errorCost],
    ['Errors per week', data.errorsPerWeek],
    ['Expected time savings (%)', data.automationEfficiency],
    ['Expected error reduction (%)', data.errorReduction],
  ];
  const results = [
    ['Annual savings (est.)', data.annualSavings],
    ['Time saved / year', data.timeSavings],
    ['Labor savings / year', data.costSavings],
    ['Error cost reduction / year', data.errorSavings],
  ];
  const rows = (pairs) =>
    pairs
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
      .join('');
  return {
    subject: `[JL Solutions ROI Calculator] ${name}`,
    html: `
      <h2>ROI calculator lead</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Company:</strong> ${escapeHtml(data.company || '(not provided)')}</p>
      <h3>Inputs</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">${rows(inputs)}</table>
      <h3>Results (from their session)</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">${rows(results)}</table>
      <p><em>Sent from jlsolutions.io ROI calculator</em></p>
    `,
  };
}

function buildAiIntakeDemoEmail(data) {
  const name = data.name || '(not provided)';
  const email = data.email || '(not provided)';
  const needLabel = data.demoNeedLabel || data.needLabel || data.demoNeed || '(not provided)';
  const fields = [
    ['Name', name],
    ['Email', email],
    ['Need', needLabel],
    ['Other detail', data.demoOther],
    ['Description', data.demoDesc],
  ];
  const rows = fields
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('');
  return {
    subject: `[JL Solutions AI Intake Demo] ${name}`,
    html: `
      <h2>AI intake demo submission</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
      <p><em>Sent from jlsolutions.io services/ai-intake-form demo</em></p>
    `,
  };
}

function buildOnboardPaymentEmail(data) {
  const name = data.name || '(not provided)';
  const email = data.email || '(not provided)';
  const amt = data.paymentAmount != null ? String(data.paymentAmount) : '(not provided)';
  const desc = data.paymentDescription || '(not provided)';
  const fields = [
    ['Name', name],
    ['Email', email],
    ['Company', data.company],
    ['Phone', data.phone],
    ['Service', data.service],
    ['Challenges', data.challenge],
    ['Goals', data.goals],
    ['Referral code', data.referralCode],
    ['Amount (USD)', amt],
    ['Checkout description', desc],
  ];
  const rows = fields
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('');
  return {
    subject: `[JL Solutions Checkout] ${name} — $${escapeHtml(amt)}`,
    html: `
      <h2>Onboarding wizard — proceeding to Stripe</h2>
      <p>They clicked <strong>Proceed to checkout</strong> with this info:</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
      <p><em>Sent from jlsolutions.io /onboard/ payment step</em></p>
    `,
  };
}

function buildPayCheckoutEmail(data) {
  const name = data.name || '(not provided)';
  const email = data.email || '(not provided)';
  const amt = data.paymentAmount != null ? String(data.paymentAmount) : '(not provided)';
  const fields = [
    ['Name', name],
    ['Email', email],
    ['Amount (USD)', amt],
    ['Referral code', data.referralCode],
  ];
  const rows = fields
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('');
  return {
    subject: `[JL Solutions Pay Page] ${email} — $${escapeHtml(amt)}`,
    html: `
      <h2>Pay page — proceeding to Stripe</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
      <p><em>Sent from jlsolutions.io /pay/</em></p>
    `,
  };
}

function roiPersistMessage(data) {
  return [
    data.annualSavings && `Annual savings: ${data.annualSavings}`,
    data.timeSavings && `Time savings: ${data.timeSavings}`,
    data.costSavings && `Labor savings: ${data.costSavings}`,
    data.errorSavings && `Error savings: ${data.errorSavings}`,
  ]
    .filter(Boolean)
    .join(' | ') || 'ROI calculator submission';
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
  if (!name && formName === 'pay-checkout') name = 'Pay page lead';
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
  } else if (formName === 'roi-calculator') {
    row = {
      name,
      email,
      company: data.company ? String(data.company).trim() : null,
      message: roiPersistMessage(data),
      status: 'new',
      source: 'roi_calculator',
    };
  } else if (formName === 'ai-intake-demo') {
    const need = [data.demoNeedLabel, data.demoOther, data.demoDesc].filter((x) => x && String(x).trim()).join(' — ');
    row = {
      name,
      email,
      service: data.demoNeed ? String(data.demoNeed).trim() : 'ai-intake-demo',
      message: need || 'AI intake demo',
      status: 'new',
      source: 'ai_intake_demo',
    };
  } else if (formName === 'onboard-payment') {
    const ref = (data.referralCode || data.referral_code || '').trim().toUpperCase();
    row = {
      name,
      email,
      phone: data.phone ? String(data.phone).trim() : null,
      company: data.company ? String(data.company).trim() : null,
      service: data.service ? String(data.service).trim() : null,
      message: `Payment intent: $${data.paymentAmount || '?'} — ${data.paymentDescription || ''}`,
      challenge: data.challenge ? String(data.challenge) : null,
      goals: data.goals ? String(data.goals) : null,
      referral_code: ref || null,
      status: 'new',
      source: 'onboard_payment_intent',
    };
  } else if (formName === 'pay-checkout') {
    const ref = (data.referralCode || data.referral_code || '').trim().toUpperCase();
    row = {
      name,
      email,
      message: `Pay page checkout: $${data.paymentAmount || '?'}${ref ? ` (ref ${ref})` : ''}`,
      referral_code: ref || null,
      status: 'new',
      source: 'pay_page_intent',
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
  const rawLen = getRawBody(event).length;
  console.log(
    '[send-form-email] Invoked',
    event.httpMethod,
    'bodyLen:',
    rawLen,
    'base64:',
    !!event.isBase64Encoded
  );
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
  if (String(botField || '').trim() !== '') {
    console.log('[send-form-email] Honeypot filled; skipping send');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  }
  console.log('[send-form-email] formName=', formName, 'keys=', Object.keys(data).join(','));

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
  } else if (formName === 'roi-calculator') {
    const built = buildRoiCalculatorEmail(data);
    subject = built.subject;
    html = built.html;
  } else if (formName === 'ai-intake-demo') {
    const built = buildAiIntakeDemoEmail(data);
    subject = built.subject;
    html = built.html;
  } else if (formName === 'onboard-payment') {
    const built = buildOnboardPaymentEmail(data);
    subject = built.subject;
    html = built.html;
  } else if (formName === 'pay-checkout') {
    const built = buildPayCheckoutEmail(data);
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
      const first = escapeHtml((data.name || 'there').trim().split(' ')[0]);
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
            : formName === 'onboard-payment' || formName === 'pay-checkout'
              ? {
                  subject: 'Next step: complete payment - JL Solutions',
                  html: `
          <h2>Hi ${first},</h2>
          <p>We received your details. Complete checkout on the next screen, or return to our site to try again if something went wrong.</p>
          <p>Reply to this email or write to <em>info@jlsolutions.io</em> anytime.</p>
          <p> - The JL Solutions team</p>
        `,
                }
              : formName === 'roi-calculator'
                ? {
                    subject: 'We received your ROI calculator submission - JL Solutions',
                    html: `
          <h2>Hi ${first},</h2>
          <p>Thanks for using our ROI calculator. We saved your results and may follow up to help you turn estimates into a plan.</p>
          <p> - The JL Solutions team</p>
          <p><em>info@jlsolutions.io</em></p>
        `,
                  }
                : formName === 'ai-intake-demo'
                  ? {
                      subject: 'Thanks for trying our AI intake demo - JL Solutions',
                      html: `
          <h2>Hi ${first},</h2>
          <p>We received your demo submission. If you’d like a production-ready intake flow, we’re happy to help.</p>
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
