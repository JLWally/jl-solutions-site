# Pipeline native signals — setup and wiring

Operational guide for **`/.netlify/functions/lead-engine-pipeline-native-signal`**: Resend webhooks (delivery evidence) and authenticated JSON (CRM, Calendly, n8n, manual forwarders). All successful captures write **`lead_outcome`** rows on `lead_engine_events` with **`capture_kind: native_pipeline`** and attribution (`lead_source`, `scout_query_id`, `source_place_id`) when resolvable from the lead.

## Environment variables (Netlify → Functions)

| Variable | Purpose |
|----------|---------|
| **`RESEND_WEBHOOK_SECRET`** | Signing secret from [Resend → Webhooks](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests) for the endpoint. Used with **Svix** verification (`svix-id`, `svix-timestamp`, `svix-signature` headers). |
| **`LEAD_ENGINE_PIPELINE_SIGNAL_SECRET`** | Bearer token for **JSON** POSTs (non-Resend integrations). If unset, JSON ingestion returns **503** (Resend webhooks still work when `RESEND_WEBHOOK_SECRET` is set). |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Required for logging. |

## 1) Resend webhooks (ESP / delivery evidence)

**URL:** `https://<your-site>/.netlify/functions/lead-engine-pipeline-native-signal`

**Configure in Resend:** subscribe to at least:

- `email.delivered` → logs **`email_delivered`**
- `email.bounced` → **`bounced`**
- `email.failed` → **`bounced`** (provider-side failure)
- `email.complained` → **`spam_complaint`**
- `email.suppressed` → **`unsubscribed`** (Resend suppression / list hygiene)
- `email.received` → **`replied`** (inbound metadata only; match lead by sender email)

**Lead matching (in order):**

1. Tags on the outbound message: **`lead_engine_lead_id`**, optional **`lead_engine_outreach_id`** (set automatically on `lead-engine-send` and demo composer send).
2. Else: **`to[0]`** email normalized against `lead_engine_leads.contact_email`.
3. For **`email.received`**: parse **`from`** and match **`contact_email`**.

If no lead matches, the handler returns **200** with `{ ok: true, skipped: true, reason: "no_lead_match" }` so Resend does not retry forever.

**Raw body:** Netlify must pass the **unmodified** POST body to Svix verification. Do not transform the body before verify.

### Delivery idempotency (`email_delivered`)

Resend’s **`email_id`** in webhooks matches the **`id`** returned when sending via the API. For **`email_delivered`** outcomes only, the system sets **`metadata_json.delivery_idempotency_key`** to that id (normalized) and **skips inserting a second row** for the same lead + key. So app-logged delivery (after send) and webhook-logged delivery **do not double count**. Operator **reconcile `mark_sent`** uses optional body **`resendMessageId`** when known; otherwise a per-outreach fallback key dedupes repeated reconcile clicks only (may not dedupe against the webhook if the Resend id was never recorded).

## 2) Authenticated JSON (`Authorization: Bearer <LEAD_ENGINE_PIPELINE_SIGNAL_SECRET>`)

### Generic outcome (n8n, scripts)

```json
{
  "leadId": "uuid",
  "outcome_code": "replied",
  "outreachId": "optional-uuid",
  "note": "optional",
  "context": "optional_short",
  "evidence": { "any": "small structured fields" }
}
```

Allowed `outcome_code` values include: `bounced`, `replied`, `interested`, `meeting_booked`, `not_a_fit`, `converted_opportunity`, `unsubscribed`, `crm_stage_changed`, `spam_complaint`, `email_delivered`.

### Calendly / scheduling forwarder

```json
{
  "mode": "calendly",
  "leadId": "uuid",
  "invitee_email": "used if leadId omitted",
  "event_uri": "https://…",
  "scheduled_at": "2026-04-08T12:00:00Z",
  "event_name": "Strategy call"
}
```

Logs **`meeting_booked`** with `native_source: calendly_pipeline`.

### HubSpot / CRM opportunity or lifecycle (via n8n)

```json
{
  "mode": "hubspot_crm",
  "leadId": "uuid",
  "external_crm_id": "hubspot-contact-id",
  "email": "fallback lookup",
  "lifecyclestage": "opportunity",
  "dealstage": "closedwon",
  "hs_lead_status": "IN_PROGRESS"
}
```

Logs **`crm_stage_changed`** with `native_source: hubspot_pipeline`.

## 3) Unsubscribe confirmations

- **Public link:** already logs **`unsubscribed`** via `lead-engine-unsubscribe` (no secret).
- **Resend:** `email.suppressed` via webhook (above).
- **Manual:** generic JSON with `outcome_code: unsubscribed`.

## 4) Validation UI

- **Lead engine → Validation mode (7d / 30d)** panel calls **`lead-engine-validation-mode`**.
- **MVP validation** report includes a short **native vs manual** outcome line for 24h / 7d.

## 5) Related docs

- [Live validation deployment + 7-day checklist + send no-gos](lead-engine-live-validation-deployment.md)
- [Send pilot readiness checklist](lead-engine-send-pilot-readiness.md) (no auto-send enabled).
- [Trust ladder](lead-engine-trust-ladder.md).
