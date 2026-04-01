const Stripe = require('stripe');
const { getStripeSecretKey } = require('./lib/stripe-env');

function getStripe() {
  const key = getStripeSecretKey();
  if (!key || !key.startsWith('sk_')) return null;
  return new Stripe(key);
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Stripe is not configured' }),
    };
  }

  const sessionId = (event.queryStringParameters && event.queryStringParameters.session_id) || '';
  if (!sessionId || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing or invalid session_id' }),
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid';
    const email =
      (session.customer_details && session.customer_details.email) ||
      session.customer_email ||
      '';
    const meta = session.metadata || {};
    const amountCents = session.amount_total;
    const currency = (session.currency || 'usd').toUpperCase();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        paid,
        payment_status: session.payment_status,
        customer_email: email,
        amount_total: amountCents,
        currency,
        metadata: meta,
        client_reference_id: session.client_reference_id || null,
      }),
    };
  } catch (err) {
    console.error('[stripe-session-summary]', err);
    const msg = (err.raw && err.raw.message) || err.message || 'Could not load session';
    const status = /No such checkout/i.test(msg) ? 404 : 500;
    return {
      statusCode: status,
      headers,
      body: JSON.stringify({ error: msg }),
    };
  }
};
