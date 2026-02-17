# Fix "Book Consultation" — Email to info@jlsolutions.io

The consultation form sends leads to **info@jlsolutions.io** and shows them in your referral dashboard. To enable email, add one environment variable in Netlify.

---

## Quick fix (about 5 minutes)

### 1. Get a Resend API key

1. Go to **[resend.com](https://resend.com)** and sign up (free).
2. Go to **API Keys** → **Create API Key** → give it a name (e.g. `jlsolutions`) → **Add**.
3. Copy the key (starts with `re_`).

### 2. Add it in Netlify

1. Go to **[app.netlify.com](https://app.netlify.com)** → your site.
2. **Site configuration** → **Environment variables** → **Add a variable**.
3. Set:
   - **Key:** `RESEND_API_KEY`
   - **Value:** your Resend API key (paste the `re_...` value)
4. Save.

### 3. Redeploy

- **Deploys** → **Trigger deploy** → **Deploy site**.

---

## What changes when it’s set up

- **Book consultation form** → email to info@jlsolutions.io → redirect to thank-you page  
- **Contact form** → same behavior  
- **Onboard wizard** → same behavior  
- **Referral dashboard** → consultations with a referral code show up for agents  

---

## If you don’t add `RESEND_API_KEY`

- The form still works for the user (no error).
- Submissions are stored in Netlify Blobs as a backup.
- You will not receive emails until you add the key.

To check the backup: Netlify → **Storage** → **Blobs** → store `consultation-leads` → key `fallback`.

---

## Optional: send from your domain

1. In Resend: **Domains** → **Add domain** → add **jlsolutions.io**.
2. Add the DNS records they show.
3. In Netlify env vars, add:
   - `FORM_FROM_EMAIL=JL Solutions <notifications@jlsolutions.io>`

---

## Resend free tier

- 100 emails/day, 3,000/month at no cost.
