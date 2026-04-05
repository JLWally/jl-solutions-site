# Live site: revenue automation checklist

Use this after you deploy to Netlify so **paid packages**, **webhooks**, and **post-purchase email** work while you are offline.

## End-to-end flow (what must work)

1. **Visitor** opens **`/get-started`**, picks a productized package, completes the short intake.
2. **Stripe Payment Link** (URLs in **`js/jl-stripe-product-links.js`**) charges the card.
3. **Stripe Dashboard** sends the buyer to **`https://YOUR_DOMAIN/onboarding?service=…`** (success URL on *each* Payment Link).
4. Buyer submits **`package-kickoff`** → **`/.netlify/functions/send-form-email`** → **Resend** emails your team (and the buyer where the template does so).
5. **`checkout.session.completed`** → **`/.netlify/functions/stripe-webhook`** records **referrals** (if `referralCode` metadata exists) and inserts a **consultations** row when **Supabase** is configured.

If any step is wrong, money can still be taken in Stripe but **onboarding, email, or CRM logging** may fail silently from the buyer’s perspective.

## 1. Netlify → Environment variables (Production, Functions scope)

Set these for **Production** and ensure scope includes **Functions** (not Build-only). Redeploy after changes.

| Variable | Why |
|----------|-----|
| **`STRIPE_SECRET_KEY`** | **`sk_live_…`** for real charges. Test keys belong only on branch deploys / local. |
| **`STRIPE_WEBHOOK_SECRET`** | **`whsec_…`** from the **live** webhook endpoint in Stripe (must match the same mode as the secret key). |
| **`RESEND_API_KEY`** | Sends **`package-kickoff`** and form mail; without it, onboarding may report failure. |
| **`FORM_FROM_EMAIL`** | From address; domain must be **verified in Resend** (not `onboarding@resend.dev` for production). |
| **`SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** | **Stripe webhook** writes **`consultations`**; **Supabase referrals** path needs these unless you use simple referral auth (see below). |
| **`URL`** | Usually auto-set by Netlify; if missing, some email links may be wrong in dev. |

Optional but recommended:

| Variable | Why |
|----------|-----|
| **`ONBOARDING_OPS_EMAIL`** | Extra internal recipients for post-purchase intake summary. |
| **`LEAD_ENGINE_PUBLIC_SITE_URL`** | Canonical **https://** site URL for lead-engine links and unsubscribe (should match production). |
| **`LEAD_ENGINE_PHYSICAL_ADDRESS`** | CAN-SPAM line for outreach (you already updated this). |

Referrals:

- **Supabase referrals:** leave **`REFERRAL_USE_SIMPLE_AUTH`** unset; ensure referral tables exist per **`JLSOLUTIONS_REFERRAL_SETUP.md`**.
- **Blob/simple referrals:** **`REFERRAL_USE_SIMPLE_AUTH=true`** plus **`REFERRAL_AGENTS`**, **`REFERRAL_SECRET`** per **`REFERRAL_SIMPLE_AUTH_SETUP.md`**.

## 2. Stripe (Live mode)

### API keys

- Dashboard → **Developers → API keys** → use the **live** secret key in Netlify Production.

### Webhook

1. **Developers → Webhooks → Add endpoint** (or edit existing).
2. **URL:** `https://YOUR_PRODUCTION_DOMAIN/.netlify/functions/stripe-webhook`
3. **Events:** at minimum **`checkout.session.completed`** (already handled in code).
4. Copy the endpoint **Signing secret** → **`STRIPE_WEBHOOK_SECRET`** in Netlify (live endpoint → live `whsec_`).

### Payment Links (productized packages)

For **each** product link in **`js/jl-stripe-product-links.js`**:

1. Open the link in **Stripe Dashboard → Payment Links**.
2. **After payment** → use your own success page.
3. Set the URL exactly (replace domain):

| Link key in code | Success URL path |
|------------------|------------------|
| `ai-intake` | `https://YOUR_DOMAIN/onboarding?service=ai-intake` |
| `fix-my-app` | `https://YOUR_DOMAIN/onboarding?service=fix-app` |
| `scheduling` | `https://YOUR_DOMAIN/onboarding?service=scheduling` |
| `lead-gen` | `https://YOUR_DOMAIN/onboarding?service=lead-engine` |

Wrong `service=` values break package lock and timeline copy on **`/onboarding`**.

### Live vs test

- **Test** Payment Links and **test** keys are fine on **preview** branches; **Production** Netlify should use **live** keys and **live** webhook secret.

## 3. Resend

- Verify your sending **domain** (DNS records Resend provides).
- **`FORM_FROM_EMAIL`** must use that domain (e.g. `JL Solutions <info@yourdomain.com>`).

## 4. Automated verification (local mirror of Netlify env)

From the repo root (with a **`.env`** that mirrors Production, **without committing secrets**):

```bash
npm run verify:live-revenue
```

This only checks **presence** of variables and **mode hints** (e.g. `sk_live_` vs `sk_test_`). It does not call Stripe or Netlify.

## 5. Manual smoke test (before you rely on it overnight)

1. Open **`/get-started`** on **production**.
2. Complete flow for the **cheapest** live product (or use Stripe test mode on a **non-production** deploy first).
3. Confirm redirect to **`/onboarding?service=…`** with the correct package locked.
4. Submit onboarding → confirm **internal email** arrives via Resend.
5. In **Stripe → Webhooks → endpoint → recent deliveries**, confirm **`checkout.session.completed`** returns **200**.
6. In **Supabase** (if used), confirm **`consultations`** (and **`referrals`** when a referral code was attached) updated as expected.

## 6. Related docs

- **`PAYMENTS_HOOKUP.md`** — Stripe checkout + webhook + referral metadata.
- **`JLSOLUTIONS_REFERRAL_SETUP.md`** — Supabase schema for referrals.
- **`REFERRAL_SIMPLE_AUTH_SETUP.md`** — Blob-based referrals without Supabase.
- **`docs/LEAD-ENGINE.md`** — Internal sales ops (separate from self-serve checkout).
