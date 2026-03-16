# Referral Sign-In, Sign-Up & Dashboard  - Quick Start

Get sign-in, sign-up, and the referral dashboard working in under an hour.

---

## 1. Create a Supabase project (≈5 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. **New project** → choose org → set name (e.g. `jlsolutions`), database password, region → **Create**.
3. Wait for the project to be ready (green status).

---

## 2. Create the database tables (≈2 min)

1. In the Supabase project, open **SQL Editor**.
2. Click **New query**.
3. Open the file **`supabase/schema.sql`** from this repo and copy its **entire** contents.
4. Paste into the SQL Editor and click **Run** (or Cmd/Ctrl+Enter).
5. You should see “Success. No rows returned.”  
   This creates: `profiles`, `referral_codes`, `referrals`, `consultations`, RLS policies, and a trigger that creates a profile when someone signs up.

---

## 3. Get your Supabase keys

1. In Supabase, go to **Settings** (gear) → **API**.
2. Copy and keep handy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under “Project API keys”)

---

## 4. Configure Auth redirects (≈1 min)

1. In Supabase, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your live site, e.g. `https://jlsolutions.io` (or `http://localhost:8888` for local).
3. Under **Redirect URLs**, add:
   - `https://jlsolutions.io/**`
   - `http://localhost:8888/**`
4. Save.

---

## 5. Set Netlify environment variables (≈2 min)

1. In [Netlify](https://app.netlify.com), open your site.
2. Go to **Site configuration** → **Environment variables** (or **Build & deploy** → **Environment**).
3. Add:

   | Key                 | Value                    | Scopes  |
   |---------------------|--------------------------|---------|
   | `SUPABASE_URL`      | Your Project URL         | All     |
   | `SUPABASE_ANON_KEY` | Your anon public key     | All     |

4. Save.

---

## 6. Redeploy so the config is live

1. In Netlify, go to **Deploys**.
2. Click **Trigger deploy** → **Deploy site** (or push a new commit).
3. Wait for the deploy to finish.  
   The referral pages read config from `/.netlify/functions/referral-config`, which uses these env vars.

---

## 7. Test sign-up and sign-in

1. Open **Sign up**: `https://jlsolutions.io/referral/signup.html`
2. Fill in name, email, password; choose **Sales Agent** → **Create Account**.
3. If you see “Confirm your email”, check Supabase **Authentication** → **Users** and confirm the user (or turn off “Confirm email” in Auth → Providers → Email for testing).
4. Open **Sign in**: `https://jlsolutions.io/referral/login.html`  
   Sign in with the same email and password.
5. You should be redirected to **Referral dashboard**: `https://jlsolutions.io/referral-dashboard/`
6. On the dashboard, use **Generate New Code** to create your first referral code.

---

## Troubleshooting

| Problem | What to do |
|--------|-------------|
| “Referral dashboard is not configured” | Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Netlify and **trigger a new deploy**. |
| “No tables” / sign-up or sign-in fails | Run the **entire** `supabase/schema.sql` in Supabase **SQL Editor** (step 2). |
| Sign-up error about “row-level security” or “permission denied” | In Supabase SQL Editor run: `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);` (if not already in your schema). |
| “Invalid login” or session issues | In Supabase **Authentication** → **URL Configuration**, ensure **Site URL** and **Redirect URLs** match your site (step 4). |
| Email confirmation blocking login | For testing: **Authentication** → **Providers** → **Email** → turn off “Confirm email”. For production, keep it on and use Supabase’s email or a custom SMTP. |

---

## Optional: Stripe and consultations

- For **payments** and referral payouts: set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and optionally `STRIPE_PRICE_ID` in Netlify (see `PAYMENTS_HOOKUP.md`).
- For **server-side referral creation** (e.g. webhooks): add `SUPABASE_SERVICE_ROLE_KEY` in Netlify (keep secret).  
Sign-in, sign-up, and the dashboard work with only `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
