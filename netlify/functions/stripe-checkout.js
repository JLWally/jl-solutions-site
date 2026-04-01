const Stripe = require('stripe');
const { getStripeSecretKey } = require('./lib/stripe-env');

function stripeKeyConfigError(key) {
  if (!key) return null;
  if (key.startsWith('pk_')) {
    return 'Publishable key in STRIPE_SECRET_KEY. Use the Secret key (sk_test_… or sk_live_…) from Developers → API keys.';
  }
  if (key.startsWith('rk_')) {
    return 'Restricted keys cannot create Checkout sessions. Use a standard secret key (sk_…).';
  }
  if (!key.startsWith('sk_')) {
    return 'STRIPE_SECRET_KEY should start with sk_test_ or sk_live_. Check for typos or extra characters.';
  }
  return null;
}

function getStripe() {
  const key = getStripeSecretKey();
  if (!key) return null;
  const cfgErr = stripeKeyConfigError(key);
  if (cfgErr) return { configError: cfgErr };
  return new Stripe(key);
}

/** USD amounts for strategy_session (must match labels on the legacy checkout UI if used). */
function getStrategyAmountUsd(key) {
  const map = {
    strategy_60: Number(process.env.PAY_STRATEGY_60_USD || '350'),
    strategy_audit: Number(process.env.PAY_STRATEGY_AUDIT_USD || '750'),
    strategy_technical: Number(process.env.PAY_STRATEGY_TECH_USD || '950'),
  };
  const n = map[key];
  return Number.isFinite(n) && n > 0 ? n : null;
}

const SUBMIT_MESSAGES = {
  invoice:
    'You are paying an approved invoice. If anything looks wrong, contact JL Solutions before completing payment.',
  deposit: 'This deposit reserves your project slot and kicks off onboarding.',
  strategy_session:
    'After payment, we will send your next steps and booking details by email.',
  custom: 'Complete this payment only if JL Solutions already confirmed this amount with you.',
};

function sanitizeClientReferenceId(raw) {
  if (raw == null || raw === '') return undefined;
  const s = String(raw).trim().slice(0, 200);
  return s || undefined;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripeOrErr = getStripe();
  if (!stripeOrErr) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          'Stripe is not configured. Set STRIPE_SECRET_KEY in Netlify (or .env for netlify dev). Alternate names: STRIPE_TEST_SECRET_KEY, STRIPE_LIVE_SECRET_KEY.',
      }),
    };
  }
  if (stripeOrErr.configError) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: stripeOrErr.configError }),
    };
  }
  const stripe = stripeOrErr;

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }
    const {
      amount: amountIn,
      currency = 'usd',
      referralCode,
      customerEmail,
      successUrl,
      cancelUrl,
      description,
      customerName,
      company,
      phone,
      service,
      challenge,
      goals,
      paymentSource,
      paymentType,
      strategySessionKey,
      clientReferenceId,
      billingAddressCollection,
      invoiceNumber,
      projectName,
      sessionTypeLabel,
      helpWith,
      notes,
      customDescription,
    } = body;

    const email = customerEmail != null ? String(customerEmail).trim() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid customer email is required' }),
      };
    }

    const pt = paymentType != null ? String(paymentType).trim() : '';
    const validTypes = ['invoice', 'deposit', 'strategy_session', 'custom'];
    if (pt && !validTypes.includes(pt)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payment type' }),
      };
    }

    if (pt === 'invoice') {
      if (!invoiceNumber || !String(invoiceNumber).trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invoice number is required' }),
        };
      }
    }
    if (pt === 'deposit') {
      if (!projectName || !String(projectName).trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Project name is required' }),
        };
      }
    }
    if (pt === 'custom') {
      if (!customDescription || !String(customDescription).trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Payment description is required' }),
        };
      }
    }
    if (pt === 'strategy_session') {
      const st = sessionTypeLabel != null ? String(sessionTypeLabel).trim() : '';
      const nm = customerName != null ? String(customerName).trim() : '';
      const hw = helpWith != null ? String(helpWith).trim() : '';
      if (!st || !nm || !hw) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Session type, name, and help topic are required' }),
        };
      }
    }

    let amount = amountIn;
    if (pt === 'strategy_session') {
      const key = strategySessionKey != null ? String(strategySessionKey).trim() : '';
      const preset = getStrategyAmountUsd(key);
      if (!preset) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid strategy session selection' }),
        };
      }
      amount = preset;
    }

    const priceId = process.env['STRIPE_PRICE_ID'];
    const baseUrl = (process.env['URL'] || 'http://localhost:8888').replace(/\/$/, '');

    const sessionConfig = {
      mode: 'payment',
      automatic_payment_methods: { enabled: true },
      success_url: successUrl || `${baseUrl}/thank-you.html?from=checkout&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/get-started`,
      metadata: {},
    };

    const billing = billingAddressCollection === 'required' ? 'required' : 'auto';
    sessionConfig.billing_address_collection = billing;

    const ref = sanitizeClientReferenceId(clientReferenceId);
    if (ref) sessionConfig.client_reference_id = ref;

    function setMeta(key, val) {
      if (val == null || val === '') return;
      const s = String(val).trim();
      if (!s) return;
      sessionConfig.metadata[key] = s.length > 500 ? `${s.slice(0, 499)}…` : s;
    }

    if (referralCode) {
      sessionConfig.metadata.referralCode = String(referralCode).trim().toUpperCase();
    }
    sessionConfig.customer_email = email;

    setMeta('customerName', customerName);
    setMeta('company', company);
    setMeta('phone', phone);
    setMeta('service', service);
    setMeta('challenge', challenge);
    setMeta('goals', goals);
    setMeta('paymentSource', paymentSource || 'pay_page');
    if (pt) setMeta('paymentType', pt);
    setMeta('invoiceNumber', invoiceNumber);
    setMeta('projectName', projectName);
    setMeta('sessionTypeLabel', sessionTypeLabel);
    setMeta('helpWith', helpWith);
    setMeta('notes', notes);
    setMeta('customDescription', customDescription);
    if (strategySessionKey) setMeta('strategySessionKey', String(strategySessionKey).trim());

    let lineTitle = 'JL Solutions';
    let lineDescription = 'Payment for JL Solutions';
    if (pt === 'invoice') {
      const inv = invoiceNumber != null ? String(invoiceNumber).trim() : '';
      lineTitle = inv ? `Invoice ${inv}` : 'Invoice payment';
      lineDescription = inv ? `Invoice ${inv} — JL Solutions` : 'Invoice payment — JL Solutions';
    } else if (pt === 'deposit') {
      const pn = projectName != null ? String(projectName).trim() : '';
      lineTitle = pn ? `Project deposit: ${pn}` : 'Project deposit';
      lineDescription = 'Project deposit — JL Solutions';
    } else if (pt === 'strategy_session') {
      const st = sessionTypeLabel != null ? String(sessionTypeLabel).trim() : '';
      lineTitle = st ? `Strategy session: ${st}` : 'Paid strategy session';
      lineDescription = 'Strategy session — JL Solutions';
    } else if (pt === 'custom') {
      const cd = customDescription != null ? String(customDescription).trim() : '';
      lineTitle = cd ? cd.slice(0, 120) : 'Custom payment';
      lineDescription = cd ? cd.slice(0, 500) : 'Custom payment — JL Solutions';
    } else if (description) {
      lineTitle = String(description).trim().slice(0, 120) || lineTitle;
      lineDescription = String(description).trim().slice(0, 500) || lineDescription;
    }

    setMeta('payDescription', lineDescription);

    const submitMsg = pt && SUBMIT_MESSAGES[pt] ? SUBMIT_MESSAGES[pt] : SUBMIT_MESSAGES.custom;
    sessionConfig.custom_text = {
      submit: { message: submitMsg },
    };

    if (priceId && !amount && pt !== 'strategy_session') {
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [{ price: priceId, quantity: 1 }];
    } else {
      const amt = Math.round((Number(amount) || 0) * 100);
      if (amt <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid amount' }),
        };
      }
      sessionConfig.line_items = [
        {
          price_data: {
            currency,
            unit_amount: amt,
            product_data: {
              name: lineTitle,
              description: lineDescription,
            },
          },
          quantity: 1,
        },
      ];
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionConfig);
    } catch (err) {
      const msg = (err && ((err.raw && err.raw.message) || err.message) || '').toLowerCase();
      if (msg.includes('unknown parameter') && msg.includes('automatic_payment_methods')) {
        const fallbackConfig = { ...sessionConfig };
        delete fallbackConfig.automatic_payment_methods;
        fallbackConfig.payment_method_types = ['card'];
        session = await stripe.checkout.sessions.create(fallbackConfig);
      } else {
        throw err;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error('[stripe-checkout]', err);
    let msg =
      (err.raw && err.raw.message) ||
      err.message ||
      'Checkout failed';
    if (/Invalid API Key|No API key provided|api_key_expired/i.test(msg)) {
      msg =
        'Stripe rejected STRIPE_SECRET_KEY. In Dashboard (match Test/Live to your keys), copy the Secret key, set it in Netlify for Production with Functions scope, redeploy. For local dev use project-root .env and restart netlify dev.';
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: msg }),
    };
  }
};
