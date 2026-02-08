# Hooking Up Payments to the System

The site already has Stripe and referral logic in place. To hook payments to the whole system, configure the following.

## What’s Already Built

- **Stripe Checkout** – `netlify/functions/stripe-checkout.js` creates a session and redirects to Stripe.
- **Stripe Webhook** – `netlify/functions/stripe-webhook.js` on `checkout.session.completed`:
  - Reads `metadata.referralCode` and customer email from the session.
  - Finds the referral code in Supabase and records the sale in `referrals` (amount, commission, status).
- **Pay page** – `/pay/index.html` can send users to Checkout with an optional referral code.
- **Consultation form** – Saves to Supabase and can include a referral code; consultation is free, but you can add a “paid consultation” product in Stripe and link to it from the site.

## Netlify Environment Variables (required for payments + referrals)

| Variable | Used by | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | referral-config, consultation, referrals, stripe-webhook | Supabase project URL |
| `SUPABASE_ANON_KEY` | referral-config (exposed to browser) | Auth + public API for referral portal |
| `SUPABASE_SERVICE_ROLE_KEY` | consultation, referrals, stripe-webhook | Server-side DB writes |
| `STRIPE_SECRET_KEY` | stripe-checkout, stripe-webhook | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | Verify webhook signatures |
| `STRIPE_PRICE_ID` | stripe-checkout (optional) | Default price for checkout |

Add these in **Netlify → Site configuration → Environment variables**.

## Stripe Webhook

1. In Stripe: **Developers → Webhooks → Add endpoint**.
2. URL: `https://www.jlsolutions.io/.netlify/functions/stripe-webhook` (or your live domain).
3. Events: **checkout.session.completed** (and optionally **payment_intent.succeeded**).
4. Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET` in Netlify.

## Connecting the flow

1. **Consultation (free)** – Form posts to `send-form-email` (email to info@jlsolutions.io) and optionally to `consultation` (Supabase). Add a referral code field so the sales agent’s code is stored with the lead.
2. **Paid product** – From any page, link to `/pay/` or call `/.netlify/functions/stripe-checkout` with:
   - `priceId` or use default `STRIPE_PRICE_ID`
   - `referralCode` in metadata (so the webhook can attribute the sale to the right agent).
3. **Pay page** – Ensure `/pay/index.html` passes the referral code (e.g. from query string `?ref=AGENT-ABC`) into the checkout session metadata. The stripe-checkout function should accept `referralCode` and add it to `session.metadata`.
4. **Referral dashboard** – Once Supabase + Stripe webhook are configured, the dashboard shows referrals and commissions from completed checkouts.

## Checking stripe-checkout for referral code

Ensure `stripe-checkout.js` accepts a referral code (query or body) and sets it on the session metadata so the webhook can read it. Example:

```js
// In stripe-checkout: when creating the session
metadata: {
  referralCode: referralCode || '',  // from request
},
```

Then the pay page or any “Buy” link can include `?ref=AGENT-CODE` and pass it into the checkout.

See **JLSOLUTIONS_REFERRAL_SETUP.md** for full Supabase schema and referral tables.
