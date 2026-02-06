# Set Up Payments on jlsolutions.io

This guide walks you through configuring Stripe payments for TrailCrafter on **jlsolutions.io**.

## Prerequisites

- Stripe account ([stripe.com](https://stripe.com))
- TrailCrafter deployed (e.g., Netlify at trailcrafter.netlify.app, proxied at jlsolutions.io/apps/trailcrafter)

---

## Step 1: Create Stripe Products & Prices

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create **subscription** products (TrailCrafter plans):

   | Product | Price | Billing | Price ID (copy after creating) |
   |---------|-------|---------|--------------------------------|
   | Basic   | $9.99 | Monthly | `price_xxxxx`                  |
   | Pro     | $19.99| Monthly | `price_xxxxx`                  |
   | Premium | $39.99| Monthly | `price_xxxxx`                  |
   | Manage my app | $99 | Monthly | `price_xxxxx` (optional)   |

3. Create **one-time** products (app services), if you want fixed Stripe products instead of dynamic amounts:

   | Product | Price | Type | Price ID (optional) |
   |---------|-------|------|----------------------|
   | Fix my app | $199 | One-time | `STRIPE_SERVICE_FIX_PRICE_ID` |
   | Create an app | $2,499 | One-time | `STRIPE_SERVICE_CREATE_PRICE_ID` |
   | AI automation | $499 | One-time | `STRIPE_SERVICE_AI_PRICE_ID` |

   If you don’t set these, the app uses built-in amounts ($199, $2,499, $499) and creates checkout dynamically.

---

## Step 2: Configure Environment Variables

Add these to your **Netlify** (or hosting) environment variables:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_live_xxxx` or `sk_test_xxxx` | [Stripe API Keys](https://dashboard.stripe.com/apikeys) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxxx` or `pk_test_xxxx` | Same as above |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxx` | Created in Step 3 |
| `STRIPE_BASIC_PRICE_ID` | `price_xxxxx` | From Step 1 |
| `STRIPE_PRO_PRICE_ID` | `price_xxxxx` | From Step 1 |
| `STRIPE_PREMIUM_PRICE_ID` | `price_xxxxx` | From Step 1 |
| `STRIPE_MANAGE_PRICE_ID` | `price_xxxxx` | Optional; “Manage my app” subscription (defaults to Pro price if unset) |
| `STRIPE_SERVICE_FIX_PRICE_ID` | `price_xxxxx` | Optional; one-time Fix my app (else uses $199) |
| `STRIPE_SERVICE_CREATE_PRICE_ID` | `price_xxxxx` | Optional; one-time Create an app (else $2,499) |
| `STRIPE_SERVICE_AI_PRICE_ID` | `price_xxxxx` | Optional; one-time AI automation (else $499) |
| `NEXT_PUBLIC_CALENDLY_URL` | Your existing Calendly link (e.g. `https://calendly.com/you/30min`) | Free consultation — “Book your free call” links here. Optional. |
| `NEXT_PUBLIC_APP_URL` | `https://jlsolutions.io/apps/trailcrafter` | Your app base URL |

**Netlify:** Site settings → Environment variables → Add variable / Edit

---

## Step 3: Add Stripe Webhook for jlsolutions.io

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL:**  
   `https://jlsolutions.io/apps/trailcrafter/api/webhooks/stripe`  
   (or `https://trailcrafter.netlify.app/api/webhooks/stripe` if you use the direct Netlify URL)
4. **Events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in your environment variables.

---

## Step 4: Allow jlsolutions.io in Stripe

1. Go to [Stripe Dashboard → Settings → Branding](https://dashboard.stripe.com/settings/branding) (optional)
2. Under [Developers → Webhooks](https://dashboard.stripe.com/webhooks), your endpoint should show as active.

Stripe Checkout works with any domain. Ensure `NEXT_PUBLIC_APP_URL` is correct so success/cancel redirects go to jlsolutions.io.

---

## Step 5: Redeploy

After updating environment variables:

1. Netlify: **Site overview → Trigger deploy → Deploy site**
2. Or push a new commit to trigger a deploy

---

## Step 6: Test the Flow

**Subscription plans (trails):**
1. Visit `https://jlsolutions.io/apps/trailcrafter/subscribe`
2. Click **Subscribe Now** on a plan
3. You should be redirected to Stripe Checkout
4. Use test card `4242 4242 4242 4242` in test mode
5. After payment, you should land on the dashboard with `?success=true`

**App services (fix / create / AI / manage):**
1. Visit `https://jlsolutions.io/apps/trailcrafter/services`
2. Click a service CTA (e.g. “Get a quote” for Fix my app)
3. You’re taken to `/subscribe?service=fix` (or manage/create/ai)
4. Click “Pay securely” → Stripe Checkout (one-time or subscription for Manage)
5. **Free consultation:** set `NEXT_PUBLIC_CALENDLY_URL` to your existing Calendly (or booking) link; “Book your free call” will open it.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid plan" error | Ensure `STRIPE_BASIC_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID` are set and correct |
| Webhook signature verification failed | Confirm `STRIPE_WEBHOOK_SECRET` matches the webhook’s signing secret in Stripe |
| Success URL goes to wrong domain | Set `NEXT_PUBLIC_APP_URL=https://jlsolutions.io/apps/trailcrafter` |
| Checkout works but subscription not saved | Check webhook endpoint URL, events, and database logs |

---

## Test vs Live Mode

- **Test mode**: Use `sk_test_...` and `pk_test_...` keys. Test cards: [Stripe test cards](https://stripe.com/docs/testing)
- **Live mode**: Switch to `sk_live_...` and `pk_live_...` when you’re ready for real payments. Create a separate webhook for live mode.
