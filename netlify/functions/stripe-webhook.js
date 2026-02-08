const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
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

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;

      if (!supabase) {
        console.warn('[stripe-webhook] Supabase not configured, skipping referral record');
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
      }

      const referralCode = session.metadata?.referralCode;
      const amountTotal = session.amount_total || 0;
      const customerEmail = session.customer_details?.email || session.customer_email || '';

      if (referralCode && customerEmail) {
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
      }
    }
  } catch (err) {
    console.error('[stripe-webhook]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
