# Contact & Consultation Emails → info@jlsolutions.io

Contact and consultation form submissions are sent to **info@jlsolutions.io** via the serverless function `send-form-email`.

## Netlify environment variables

1. In **Netlify**: Site → **Site configuration** → **Environment variables**.
2. Add:
   - **RESEND_API_KEY** – Your [Resend](https://resend.com) API key (required for sending).
   - **FORM_FROM_EMAIL** (optional) – Sender address, e.g. `JL Solutions <notifications@jlsolutions.io>`. Default is `JL Solutions Website <onboarding@resend.dev>` (Resend’s test domain).

## Resend setup

1. Sign up at [resend.com](https://resend.com).
2. Create an API key and set it as `RESEND_API_KEY` in Netlify.
3. To send from **@jlsolutions.io**, add and verify the domain in Resend, then set:
   - `FORM_FROM_EMAIL=JL Solutions <notifications@jlsolutions.io>`  
   (or another verified address you prefer).

## Forms that send to info@jlsolutions.io

- **Contact form** (`/contact.html`) – name, email, message.
- **Book consultation form** (`/book-consultation.html`) – name, email, company, phone, service, challenge, goals, referral code, selected time.

Both POST to `/.netlify/functions/send-form-email`, which sends one email per submission to info@jlsolutions.io and redirects to `/thank-you.html`.
