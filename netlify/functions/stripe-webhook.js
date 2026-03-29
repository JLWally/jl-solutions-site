const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { getStripeSecretKey, getStripeWebhookSecret } = require('./lib/stripe-env');

function getStripe() {
  const key = getStripeSecretKey();
  if (!key) return null;
  return new Stripe(key);
}
const useSimpleAuth = process.env.REFERRAL_USE_SIMPLE_AUTH === 'true' || process.env.REFERRAL_USE_SIMPLE_AUTH === '1';

function getSupabase() {
  if (useSimpleAuth) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Service role client for consultations even when referrals use simple auth. */
function getSupabaseConsultations() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function parseAgentsCommission(envStr, code) {
  if (!envStr) return 10;
  const parts = envStr.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const p = part.split(':');
    const c = (p[2] || '').trim().toUpperCase();
    if (c === (code || '').toUpperCase()) {
      return parseFloat(p[3]) || 10;
    }
  }
  return 10;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();
  if (!stripe) {
    console.error('[stripe-webhook] Missing STRIPE_SECRET_KEY (or alternate) in this function environment');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error:
          'Webhook handler needs STRIPE_SECRET_KEY. In Netlify → Environment variables, add it for Production and enable scope “Functions” (not Build-only), then redeploy.',
      }),
    };
  }
  if (!webhookSecret) {
    console.error('[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error:
          'Webhook handler needs STRIPE_WEBHOOK_SECRET (whsec_… from this exact Stripe endpoint). In Netlify set the variable for Production with Functions scope, then redeploy.',
      }),
    };
  }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const supabase = getSupabase();
  const consultationsDb = getSupabaseConsultations();

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const meta = session.metadata || {};
      const referralCode = meta.referralCode;
      const amountTotal = session.amount_total || 0;
      const customerEmail = session.customer_details?.email || session.customer_email || '';

      if (referralCode && customerEmail) {
        if (useSimpleAuth) {
          const { appendReferral } = require('./referral-blob-append');
          const rate = parseAgentsCommission(process.env.REFERRAL_AGENTS, referralCode) / 100;
          const commissionCents = Math.round(amountTotal * rate);
          await appendReferral({
            code: referralCode.toUpperCase(),
            referred_email: customerEmail,
            amount_cents: amountTotal,
            commission_cents: commissionCents,
            status: 'pending',
            source: 'stripe_checkout',
          });
        } else if (supabase) {
          const { data: codeRow } = await supabase
            .from('referral_codes')
            .select('id, user_id, commission_rate')
            .eq('code', referralCode.toUpperCase())
            .eq('is_active', true)
            .single();

          if (codeRow) {
            const commissionRate = (codeRow.commission_rate || 10) / 100;
            const commissionCents = Math.round(amountTotal * commissionRate);

            await supabase.from('referrals').insert({
              referral_code_id: codeRow.id,
              referrer_id: codeRow.user_id,
              referred_email: customerEmail,
              amount_cents: amountTotal,
              commission_cents: commissionCents,
              status: 'pending',
              stripe_session_id: session.id,
              source: 'stripe_checkout',
            });
          }
        } else {
          console.warn('[stripe-webhook] Neither simple auth nor Supabase configured, skipping referral');
        }
      }

      if (consultationsDb && customerEmail) {
        const name = (meta.customerName || '').trim() || 'Customer';
        const amountUsd = (amountTotal / 100).toFixed(2);
        let source = 'stripe_checkout_paid';
        if (meta.paymentSource === 'onboard_wizard') source = 'stripe_onboard_paid';
        else if (meta.paymentSource === 'pay_page') source = 'stripe_pay_paid';

        const { error: consultErr } = await consultationsDb.from('consultations').insert({
          name: name.slice(0, 500),
          email: customerEmail,
          phone: meta.phone || null,
          company: meta.company || null,
          service: meta.service || null,
          challenge: meta.challenge || null,
          goals: meta.goals || null,
          referral_code: meta.referralCode ? String(meta.referralCode).trim().toUpperCase() : null,
          message: `Stripe payment completed. Session ${session.id}. Total $${amountUsd}`,
          status: 'new',
          source,
        });
        if (consultErr) {
          console.warn('[stripe-webhook] consultations insert failed:', consultErr.message || consultErr);
        }
      }
    }
  } catch (err) {
    console.error('[stripe-webhook]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
