# JL Solutions: Referral Dashboard, Payments & Consultation Setup

This guide covers the referral system, Stripe payments, and consultation form for jl-site-restore.

## Overview

- **Referral Dashboard** – Sales agents log in to view referrals, commissions, and stats
- **Payment System** – Stripe Checkout for paid services; referrals tracked on completion
- **Free Consultation Form** – Enhanced form with referral code support; submissions stored in Supabase
- **Sales Agent Signup** – New agents register and get unique referral codes

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. In **Settings → API**, copy:
   - Project URL
   - `anon` (public) key
   - `service_role` key (keep secret – server-side only)

4. Add to Netlify **Site settings → Environment variables**:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...            # Used by referral-config (public); needed for login/signup/dashboard
   SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Server-side only (consultation, referrals, stripe-webhook)
   ```
   The referral portal (login, signup, dashboard) loads config from `/.netlify/functions/referral-config`, which returns `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Without these, users see "Supabase not configured".

5. In Supabase **Authentication → URL Configuration**:
   - Site URL: `https://jlsolutions.io` (or your domain)
   - Redirect URLs: add `https://jlsolutions.io/**` and `http://localhost:8888/**` for local dev

## 2. Stripe Setup

1. Create/use a [Stripe](https://stripe.com) account
2. Get API keys from **Developers → API keys**:
   - Publishable key
   - Secret key

3. Create a product/price in **Products** (e.g. "Consultation Package" or "Service Retainer")

4. Add to Netlify environment variables:
   ```
   STRIPE_SECRET_KEY=sk_...
   STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_PRICE_ID=price_...   # Your default paid product
   STRIPE_WEBHOOK_SECRET=whsec_...  # From webhook setup below
   ```

5. Create a webhook in **Developers → Webhooks**:
   - Endpoint: `https://jlsolutions.io/.netlify/functions/stripe-webhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

## 3. Netlify Configuration

Ensure `netlify.toml` exists with:

```toml
[build]
  publish = "."
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"
  external_node_modules = ["@supabase/supabase-js"]
```

Run `npm install` in the project root before deploying (adds Stripe, Supabase for functions).

## 4. Create First Admin User

1. Sign up at `/referral/login.html` (or signup)
2. In Supabase **Table Editor → profiles**, set your user's `role` to `admin`
3. Admins can view all consultations and manage referrals

## 5. Sales Agent Flow

1. Agent signs up at `/referral/signup.html` (chooses "Sales Agent")
2. After signup, they land on `/referral-dashboard/` with a unique referral code
3. They share the code (e.g. `AGENT-JOHN`) with clients
4. Clients use it in the consultation form or at checkout
5. When a client pays, the referral is recorded and commission is calculated

## 6. File Structure

```
netlify/functions/
  stripe-checkout.js   – Creates Stripe Checkout session
  stripe-webhook.js    – Handles payment completion, records referrals
  consultation.js      – Saves consultation to Supabase
  referrals.js         – API for referral stats and creating codes

referral-dashboard/    – Referral dashboard (login required)
referral/
  login.html           – Login for referral users
  signup.html          – Signup (client or sales agent)

pay/                   – Payment page (Stripe Checkout)
js/
  supabase-client.js   – Supabase client init
  referral-auth.js     – Auth helpers for referral dashboard
  referral-config.example.js – Copy to referral-config.js with your Supabase keys
```

## 7. Supabase Config (Client-Side)

Add your Supabase URL and anon key for referral pages:

1. Copy `js/referral-config.example.js` to `js/referral-config.js`
2. Fill in your Supabase project URL and anon key
3. Add `<script src="/js/referral-config.js"></script>` before `supabase-client.js` on:
   - `referral/login.html`
   - `referral/signup.html`
   - `referral-dashboard/index.html`

Or replace `SUPABASE_URL_PLACEHOLDER` and `SUPABASE_ANON_KEY_PLACEHOLDER` in those files with your values.

## 8. Consultation Form

The `book-consultation.html` form has a **Referral Code** field. Submissions go to:
- Netlify Forms (existing), and/or
- Supabase `consultations` table via the `consultation` Netlify function (if enabled)

Referral codes are validated and linked to the submitting agent when stored.

## 9. Payment Page

Visit `/pay/` to process payments. Clients can enter a referral code; when the payment completes via Stripe webhook, the referral is recorded and commission is calculated for the sales agent.
