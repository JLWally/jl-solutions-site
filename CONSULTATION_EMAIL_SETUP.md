# Fix "Book Consultation" — Emails to You and the Customer

The form sends:
- **You (info@jlsolutions.io):** The lead details
- **Customer:** A confirmation that you received their request

To enable both, add one environment variable in Netlify.

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

- **Book consultation form** → (1) email to info@jlsolutions.io, (2) confirmation to customer → thank-you page  
- **Contact form** → same: lead to you, confirmation to customer  
- **Onboard wizard** → same behavior  
- **Referral dashboard** → consultations with a referral code show up for agents  

---

## If you don’t add `RESEND_API_KEY`

- The form still works for the user (no error).
- Submissions are stored in Netlify Blobs as a backup.
- You will not receive emails until you add the key.

To check the backup: Netlify → **Storage** → **Blobs** → store `consultation-leads` → key `fallback`.

---

## Quick check: Is the key set?

Visit **https://www.jlsolutions.io/.netlify/functions/email-status** (or your domain + `/.netlify/functions/email-status`). It will show `"configured": true` or `false`.

## Not getting emails?

1. **Verify RESEND_API_KEY** – Netlify → **Site configuration** → **Environment variables** (not inside Functions). Add `RESEND_API_KEY` with your full `re_...` key. **Redeploy** after adding.
2. **Check spam** – info@ and customer inbox (Promotions, Spam)
3. **Netlify logs** – Submit the form, then Functions → send-form-email → Logs. Look for `[send-form-email]` messages
4. **Resend dashboard** – [resend.com/emails](https://resend.com/emails) shows sent/failed status

---

## Optional: send from your domain

1. In Resend: **Domains** → **Add domain** → add **jlsolutions.io**.
2. Add the DNS records they show.
3. In Netlify env vars, add:
   - `FORM_FROM_EMAIL=JL Solutions <notifications@jlsolutions.io>`

---

## Resend free tier

- 100 emails/day, 3,000/month at no cost.
