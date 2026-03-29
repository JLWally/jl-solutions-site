# Stripe setup for JL Solutions (Netlify)

This site uses **Stripe Checkout** via `netlify/functions/stripe-checkout.js` and **webhooks** via `netlify/functions/stripe-webhook.js`.

## 1. Stripe Dashboard

1. Create or open your [Stripe Dashboard](https://dashboard.stripe.com/) account.
2. Start in **Test mode** until flows are verified, then switch to **Live mode** and repeat keys/webhooks for production.

## 2. API secret key

1. Go to **Developers → API keys**.
2. Copy the **Secret key** (`sk_test_...` or `sk_live_...`). Never use the **Publishable** key (`pk_...`) or a **Restricted** key (`rk_...`) in `STRIPE_SECRET_KEY` — Checkout creation requires a standard secret key.
3. In **Netlify**: **Site configuration → Environment variables** → add:
   - `STRIPE_SECRET_KEY` = your secret key.

If Stripe returns **Invalid API Key**, roll a new secret key in the Dashboard (old keys can be revoked), paste it into project-root `.env` with no spaces or quotes, and restart `netlify dev`. The function also reads `STRIPE_SECRET_KEY` directly from `.env` on disk if environment injection fails.

For local runs, create `.env` in the **project root** (same folder as `netlify.toml`) and run **`netlify dev`** from that folder so functions see the file. Netlify CLI does not load `.env` if you only open the HTML with another static server.

If you keep separate variables (e.g. `STRIPE_TEST_SECRET_KEY` and `STRIPE_LIVE_SECRET_KEY`), the checkout function uses the **first non-empty** of: `STRIPE_SECRET_KEY`, `STRIPE_TEST_SECRET_KEY`, `STRIPE_SECRET_KEY_TEST`, `STRIPE_LIVE_SECRET_KEY`, `STRIPE_SECRET_KEY_LIVE`. For one environment, still prefer a single `STRIPE_SECRET_KEY`.

## 3. Webhook endpoint

1. In Stripe: **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL** (replace with your site):
   - Production: `https://YOUR_SUBDOMAIN.netlify.app/.netlify/functions/stripe-webhook`
   - Local testing: use Stripe CLI (below) instead of a public URL.
3. **Events to send**: at minimum **`checkout.session.completed`**.
4. After creating the endpoint, open it and click **Reveal** under **Signing secret** (`whsec_...`).
5. In Netlify environment variables, add:
   - `STRIPE_WEBHOOK_SECRET` = that signing secret.

Without `STRIPE_WEBHOOK_SECRET`, Stripe cannot verify webhook calls and the function will return 400.

## 4. Optional: fixed price (`STRIPE_PRICE_ID`)

`stripe-checkout.js` supports:

- **Custom amount** (what `/pay/` sends): `line_items` are built from `amount` in dollars.
- **Catalog price**: if you set `STRIPE_PRICE_ID` and omit `amount`, Checkout uses that Price.

Add `STRIPE_PRICE_ID=price_xxx` in Netlify only if you use that mode.

## 5. Success and cancel URLs

The pay page sends:

- `successUrl`: `/thank-you.html?session_id={CHECKOUT_SESSION_ID}&from=pay`
- `cancelUrl`: `/pay/?canceled=1`

No extra Stripe Dashboard configuration is required for those; they are passed when creating the Checkout Session.

## 6. Local testing with Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook
```

Use the **webhook signing secret** the CLI prints as `STRIPE_WEBHOOK_SECRET` in your local `.env` while testing.

## 7. After payment (webhook)

On `checkout.session.completed`, the webhook can:

- Record **referrals** (if `referralCode` is in session metadata and Supabase or simple referral auth is configured).
- Insert a **consultation** row in Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set (see `supabase/` and `V1_REVENUE_SETUP.sql` if applicable).

Checkout still **succeeds for the customer** if Supabase insert fails; errors are logged.

## Checklist

- [ ] `STRIPE_SECRET_KEY` in Netlify (test + live as needed)
- [ ] Webhook endpoint added; event `checkout.session.completed`
- [ ] `STRIPE_WEBHOOK_SECRET` in Netlify matches that endpoint
- [ ] Test payment in Test mode, confirm redirect to thank-you page
- [ ] Confirm webhook deliveries in Stripe **Developers → Webhooks → [endpoint] → Attempts**
