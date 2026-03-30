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
      amount,
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
    } = body;

    const priceId = process.env['STRIPE_PRICE_ID'];
    const baseUrl = (process.env['URL'] || 'http://localhost:8888').replace(/\/$/, '');

    const sessionConfig = {
      mode: 'payment',
      automatic_payment_methods: { enabled: true },
      success_url: successUrl || `${baseUrl}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/pay/?canceled=1`,
      metadata: {},
    };

    function setMeta(key, val) {
      if (val == null || val === '') return;
      const s = String(val).trim();
      if (!s) return;
      sessionConfig.metadata[key] = s.length > 500 ? `${s.slice(0, 499)}…` : s;
    }

    if (referralCode) {
      sessionConfig.metadata.referralCode = String(referralCode).trim().toUpperCase();
    }
    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }
    setMeta('customerName', customerName);
    setMeta('company', company);
    setMeta('phone', phone);
    setMeta('service', service);
    setMeta('challenge', challenge);
    setMeta('goals', goals);
    setMeta('paymentSource', paymentSource || 'pay_page');

    if (priceId && !amount) {
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [{ price: priceId, quantity: 1 }];
    } else {
      const amt = Math.round((amount || 0) * 100);
      if (amt <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid amount' }),
        };
      }
      sessionConfig.line_items = [{
        price_data: {
          currency,
          unit_amount: amt,
          product_data: {
            name: description || 'JL Solutions Service',
            description: 'Payment for JL Solutions',
          },
        },
        quantity: 1,
      }];
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionConfig);
    } catch (err) {
      const msg = (err && ((err.raw && err.raw.message) || err.message) || "").toLowerCase();
      if (msg.includes("unknown parameter") && msg.includes("automatic_payment_methods")) {
        const fallbackConfig = { ...sessionConfig };
        delete fallbackConfig.automatic_payment_methods;
        fallbackConfig.payment_method_types = ["card"];
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
