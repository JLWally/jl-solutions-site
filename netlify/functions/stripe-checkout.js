const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Stripe is not configured' }),
    };
  }

  try {
    const { amount, currency = 'usd', referralCode, customerEmail, successUrl, cancelUrl, description } = JSON.parse(event.body || '{}');

    const priceId = process.env.STRIPE_PRICE_ID;
    const baseUrl = process.env.URL || 'http://localhost:8888';

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: successUrl || `${baseUrl}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/book-consultation.html`,
      metadata: {},
    };

    if (referralCode) {
      sessionConfig.metadata.referralCode = referralCode;
    }
    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

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

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error('[stripe-checkout]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Checkout failed' }),
    };
  }
};
