# Deploy Sales Funnel to jlsolutions.io

## What’s in this branch

Your **feature/azure-aws-cloud-migration-page** branch (pushed to GitHub) includes:

- **Sales funnel**
  - **Book consultation** – `/book-consultation.html` (form + time slots)
  - Homepage CTA: “Book Free Consultation” in nav, hero CTA, and footer
- **Consultation backend**
  - Netlify function: `netlify/functions/consultation.js`
- **Seller / referral onboarding**
  - **Referral login** – `/referral/login.html`
  - **Referral signup** – `/referral/signup.html`
  - **Referral dashboard** – `/referral-dashboard/` (stats, codes, referrals table)
  - Netlify function: `netlify/functions/referrals.js`
  - JS: `js/referral-auth.js`, `js/supabase-client.js`, `js/referral-config.example.js`
- **Pay**
  - **Pay page** – `/pay/index.html`
  - Netlify: `stripe-checkout.js`, `stripe-webhook.js`
- **Config**
  - `netlify.toml` – `publish = "."`, `functions = "netlify/functions"`
  - Supabase: `supabase/schema.sql`
  - Setup notes: `JLSOLUTIONS_REFERRAL_SETUP.md`

## Why the live site doesn’t have it yet

- **main** uses a different layout (site in `public/`, different `netlify.toml`). Merging would require resolving that structure.
- This branch uses **root as publish** (`publish = "."`) and has all funnel/dashboard/pay and Netlify functions at the root.

## How to put this on jlsolutions.io

**Option A – Deploy this branch from Netlify (recommended)**

1. In **Netlify**: Site → **Site configuration** → **Build & deploy** → **Continuous deployment**.
2. Set **Branch to deploy** to: `main`.
3. Set **Publish directory** to: `.` (or leave blank if the UI uses repo root).
4. Save. Netlify will build and deploy this branch to your production URL (e.g. jlsolutions.io).

**Option B – Make this branch the new main**

1. In GitHub, open a **Pull request**: `feature/azure-aws-cloud-migration-page` → `main`.
2. Resolve conflicts (main’s `public/` vs this branch’s root layout).
3. Merge the PR so `main` matches this branch.
4. In Netlify, keep deploying from `main` and set **Publish directory** to `.` if it’s not already.

## After deploy – quick checks

- **Homepage**: https://www.jlsolutions.io — nav has “Book Consultation”, CTA is “Book Free Consultation”.
- **Consultation**: https://www.jlsolutions.io/book-consultation.html
- **Referral login**: https://www.jlsolutions.io/referral/login.html
- **Referral signup**: https://www.jlsolutions.io/referral/signup.html
- **Referral dashboard**: https://www.jlsolutions.io/referral-dashboard/ (requires auth).
- **Pay**: https://www.jlsolutions.io/pay/

Ensure Netlify env vars and Supabase/Stripe are set per `JLSOLUTIONS_REFERRAL_SETUP.md` and your Netlify dashboard.

## Academy (separate repo)

Academy lives at **[github.com/JLWally/jl-solutions-academy](https://github.com/JLWally/jl-solutions-academy)**. Deploy that repo to **https://academy.jlsolutions.io**. The main site (jlsolutions.io) links to the academy in the nav and footer.
