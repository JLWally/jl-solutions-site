# Lead generation system

## Where leads go

- **Free consultation**: When someone clicks "Book your free call" (homepage or subscribe page), they see a short form (name, email, optional message). On submit:
  - Lead is saved to the database.
  - AI generates a one-line summary and suggested action (stored in `aiSummary`).
  - Optional: Slack notification (if `SLACK_WEBHOOK_URL` is set).
  - Optional: Thank-you email via Resend (if `RESEND_API_KEY` is set).
  - Then they are redirected to your Calendly URL (if `NEXT_PUBLIC_CALENDLY_URL` is set), or see a “We’ll be in touch” message.

- **Portal → Leads**: You can view all leads at **Portal → Leads** with filters (all / new / consultation). AI summaries appear shortly after each lead is captured.

## Database

1. **Run the migration** (when `DATABASE_URL` is set in `.env`):
   ```bash
   npx prisma migrate dev --name add_lead_model
   ```
   If you already ran `prisma generate` and only need to push the schema to an existing DB:
   ```bash
   npx prisma db push
   ```

## Optional: automation

| Env variable | Purpose |
|--------------|---------|
| `OPENAI_API_KEY` | Already used elsewhere. Enables AI summary + suggested action for each lead. |
| `SLACK_WEBHOOK_URL` | Incoming webhook URL. Sends a Slack message for each new lead. |
| `RESEND_API_KEY` | Sends a thank-you email to the lead. Set `RESEND_FROM_EMAIL` (e.g. `JL Solutions <hello@jlsolutions.io>`) when you verify your domain in Resend. |
| `NEXT_PUBLIC_CALENDLY_URL` | Your Calendly (or other booking) link. After capture, user is redirected here. |

## API

- **POST /api/leads** – Capture a lead (used by the consultation form). Body: `{ email, name?, source?, message?, referralCode? }`.
- **GET /api/leads** – List leads (used by Portal → Leads). Query: `?limit=50&status=new&source=consultation`.

For production, consider protecting **GET /api/leads** (e.g. API key or portal auth) so only you can list leads.
