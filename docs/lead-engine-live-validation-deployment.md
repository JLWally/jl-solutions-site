# Live validation deployment — checklist

Use this for the first **production** rollout of pipeline webhooks and validation-mode monitoring. Does **not** enable auto-send.

## A. Environment variables (Netlify → Site → Environment variables → Functions)

| Variable | Required | Notes |
|----------|----------|--------|
| **`RESEND_WEBHOOK_SECRET`** | Yes, for ESP evidence | From Resend dashboard → **Webhooks** → your endpoint → **Signing secret** (Svix). Not the API key. |
| **`LEAD_ENGINE_PIPELINE_SIGNAL_SECRET`** | Yes, for JSON forwarders | Long random string. Used as `Authorization: Bearer …` for n8n / Calendly / HubSpot-shaped POSTs. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Yes | Already required for lead engine. |
| `LEAD_ENGINE_ENABLED`, `LEAD_ENGINE_SECRET`, `LEAD_ENGINE_OPERATORS` | Yes | Operator UI + APIs. |

After changes: **redeploy** the site so Functions pick up new env.

## B. Webhook URL setup (Resend)

1. In Resend: **Webhooks → Add endpoint**.  
   **URL:** `https://<your-production-domain>/.netlify/functions/lead-engine-pipeline-native-signal`  
   (Same path as local under Netlify dev, with your live host.)

2. Enable event types (minimum for validation):  
   `email.delivered`, `email.bounced`, `email.failed`, `email.complained`, `email.suppressed`, and optionally `email.received`.

3. Copy the **signing secret** into **`RESEND_WEBHOOK_SECRET`** in Netlify.

4. **Do not** require Bearer auth on this URL for Resend — verification is **Svix headers** (`svix-id`, `svix-timestamp`, `svix-signature`). JSON callers use a **separate** Bearer secret (`LEAD_ENGINE_PIPELINE_SIGNAL_SECRET`).

## C. Verification steps (after deploy)

1. **Health:** Sign in to `/lead-engine/`, open **Validation mode (7d / 30d)** → **Refresh**. Expect `ok: true` JSON (or fix Supabase/auth).

2. **Send path + idempotency:** Send one real test message from the lead engine (or demo composer) to an address you control. Confirm:
   - One **`email_delivered`** `lead_outcome` from **`resend_send`** / **`demo_outreach_composer`** in Supabase `lead_engine_events`.
   - When Resend fires **`email.delivered`**, a **second** row should **not** appear for the same Resend message id (`metadata_json.delivery_idempotency_key` dedupes app vs webhook).

3. **Webhook-only:** In Resend dashboard, **resend** a test webhook or use their delivery logs; confirm `lead_outcome` rows for `native_source: resend_webhook` when a matching lead exists (tags or `contact_email`).

4. **Pipeline JSON:** `curl` (replace host and secrets):  
   `curl -sS -X POST -H "Authorization: Bearer $LEAD_ENGINE_PIPELINE_SIGNAL_SECRET" -H "Content-Type: application/json" -d '{"leadId":"<uuid>","outcome_code":"replied","note":"test"}' "https://<host>/.netlify/functions/lead-engine-pipeline-native-signal"`  
   Expect `200` and `ok: true`.

5. **Misconfig:** Temporarily wrong `RESEND_WEBHOOK_SECRET` → Resend deliveries should get **400** verification errors (check Netlify function logs).

---

## D. 7-day validation checklist (use Validation mode dashboard)

Run **daily** for seven days (UTC). Open **Lead engine → Validation mode (7d / 30d)** and **Refresh**. Record notes in your ops log.

| Day | Check | Pass criteria |
|-----|--------|----------------|
| 1 | **Native vs manual outcomes (7d)** | Counts non-zero if mail/CRM activity exists; native share grows as webhooks fire. |
| 1 | **Learning snapshot** | `outcomes_native_7d` reflects webhook + send path without obvious double-count spikes for single sends. |
| 2 | **Top / worst queries** | At least one query has `outcomes ≥ 3` if volume exists; rates interpretable. |
| 2 | **By source** | `positive_rate_by_source` populated for active `lead_source` values. |
| 3 | **Hot lead usefulness** | `usefulness_ratio` = good/(good+bad) defined; track trend (not a fixed threshold here). |
| 3 | **Guardrail transitions** | `guardrail_transitions` events appear only when automation tick changes health (expected low volume). |
| 4 | **Recovery playbook** | `non_healthy_scopes` and action tallies match expectation when sources/queries are throttled/paused. |
| 4 | **Guardrail drift** | Drift rows should **trend down** after tick applies (persisted catches up to computed). |
| 5 | **30d window** | Compare 7d vs 30d blocks for stability; no silent zero native outcomes if email is flowing. |
| 6 | **MVP validation panel** | **Lead outcomes (native vs manual)** 24h/7d lines align with Validation mode native totals (same model). |
| 7 | **Review** | Document anomalies: high `no_lead_match` skips (tags/email), missing `spam_complaint` if complaints exist, CRM forwarder gaps. |

---

## E. Send pilot — exact **no-go** conditions

Do **not** start any send pilot (including expanded manual send policy) while **any** of these is true:

1. **`allow_auto_send`** is not explicitly set to `true` in policy **and** code review has not approved a pilot branch that honors it (today: must remain **false** for unsupervised send).

2. **Resend webhooks** are not configured **or** `email.delivered` / `email.bounced` / `email.complained` are not observed in **`lead_outcome`** for real traffic within the validation window (no visibility = no-go).

3. **Chronic webhook skips:** Sustained `no_lead_match` for a majority of delivery events (missing tags or wrong `contact_email`) — attribution broken.

4. **Bounce or spam complaint rate** exceeds your written threshold **without** a documented response (suppression, list hygiene, pause). *(Define numeric thresholds in ops runbook; until defined, treat “unknown rate” as no-go.)*

5. **Guardrails:** Any **required** scout/source scope stuck in **`paused`** for the pilot cohort’s queries without operator override and written rationale.

6. **Kill switch untested:** No verified path to disable automation tick / pause queries / force guardrail healthy in **production** within agreed time.

7. **Compliance:** CAN-SPAM footer, physical address, and unsubscribe path not verified on **production** sends.

8. **Legal / stakeholder sign-off** missing for automated or high-volume send (per your org).

---

## Related

- [Pipeline signals (env + payloads)](lead-engine-pipeline-signals.md) — includes **delivery idempotency** (Resend `email_id` = send API `id`).
- [Send pilot readiness (expanded)](lead-engine-send-pilot-readiness.md).
- [Trust ladder](lead-engine-trust-ladder.md).
