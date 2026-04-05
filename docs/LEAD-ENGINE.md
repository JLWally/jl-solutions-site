# Lead engine (internal)

AI-assisted lead research and outreach **drafts** for JL Solutions operators. This feature is **internal only**, gated by dedicated environment variables and a separate session cookie from the referral dashboard.

## Compliance (non-negotiables)

- No LinkedIn scraping or automation.
- No automated SMS.
- No deceptive personalization; drafts must be factual and reviewable.
- **Slice F** sends **one email per operator action** to `contact_email` via Resend, with a **token unsubscribe** link and **`email_opted_out`** suppression. No bulk or sequences in this slice.
- **Slice H** hardens send reliability (claim-before-Resend, idempotent replay, clearer **Resend vs DB** failure modes), centralizes **latest analysis / scoring** selection in shared helpers, and tightens duplicate-send / in-progress behavior without new channels or AI.
- **Slice I** adds **operator reconciliation**: authenticated **`lead-engine-reconcile`** (`mark_sent`, `release_send_lock`) plus UI actions under **History** so operators can recover from **`RECONCILE_REQUIRED`** or stuck **`send_started_at`** without CRM or direct SQL (SQL remains a last resort).
- **Slice J** adds **global suppression by normalized email** across all leads (trim + lowercase), enforced in send and written on unsubscribe, while keeping lead-level `email_opted_out`.
- **Slice K** adds **manual one-way CRM sync** to HubSpot contacts (`lead-engine-sync-crm`) with persisted sync fields (`external_crm_id`, `crm_source`, `sync_status`, `last_synced_at`, `sync_error`).
- Store only data needed for review and outreach preparation.

## Architecture (this repo)

- **UI:** Static HTML under `/lead-engine/` (Bootstrap, same patterns as `referral-dashboard/`). The browser **never** calls Supabase directly for lead data.
- **API:** Netlify Functions at `/.netlify/functions/lead-engine-*`.
- **Data:** **Supabase only** for lead engine rows (no Netlify Blobs). Functions use **`SUPABASE_SERVICE_ROLE_KEY`** (bypasses RLS).
- **Auth:** HMAC-signed cookie `lead_engine_session`, signed with `LEAD_ENGINE_SECRET`. Operators are listed in `LEAD_ENGINE_OPERATORS` (separate from `REFERRAL_AGENTS`).
- **Shared crypto:** `netlify/functions/lib/hmac-session.js` implements sign/verify only; **secrets and allowlists stay feature-specific**.
- **HTML parsing (Slice C):** `node-html-parser` in Netlify Functions only — used for deterministic signal extraction (not a crawler).
- **AI scoring (Slice D):** OpenAI **Responses** API (`/v1/responses`), same transport style as `netlify/functions/chatbot.js`, wrapped in `lib/lead-engine-openai-responses.js` / `lib/lead-engine-openai-score.js`.
- **Outreach drafts (Slice E):** OpenAI Responses via `lib/lead-engine-openai-draft.js`; inserts **`lead_engine_outreach`** rows (`status = draft`).
- **Approve & send (Slice F):** Operators **`lead-engine-approve`** then **`lead-engine-send`**; Resend (`resend` package, same as `send-form-email.js`). Public **`lead-engine-unsubscribe`** (GET, no auth) sets **`email_opted_out`** on the lead.
- **Operator UX (Slice G):** Richer **`lead-engine-list`** filters + optional **`summary`**; **`lead-engine-lead-detail`** for compact per-lead audit/score/outreach history (no new AI or sends).
- **CSV import (Slice M):** Operator-only preview/commit flow for bulk manual lead creation: `lead-engine-import-preview` + `lead-engine-import-commit`, reusing ingest normalization and dedupe safeguards.
- **Batch pipeline actions (Slice N):** Operator-driven `lead-engine-batch-analyze` and `lead-engine-batch-score` for selected leads (bounded batch size, per-row outcomes, no batch send/approve).
- **Send reliability (Slice H):** `netlify/functions/lib/lead-engine-send-state.js` (claim / stale lock / finalize-with-retries); **`netlify/functions/lib/lead-engine-analysis-pick.js`** for preferred vs successful audit selection plus scoring compatibility boundary, and **`netlify/functions/lib/lead-engine-canonical-select.js`** for shared analysis->AI latest-row selection used by list + CRM sync.
- **Recovery (Slice I+):** **`lead-engine-reconcile`** for **`mark_sent`**, **`release_send_lock`**, and **`mark_failed`** (cancel row, requires **`acknowledgeMarkFailed`**); **`lead-engine-send-recovery`** classifies **approved + `send_started_at`** rows for list **`outreach.send_recovery`** and **`needsAttention=send`** filter; internal UI uses a **16-minute** client-side stale hint so **Send** re-enables after the server-side ~**15-minute** stale window without opening History.
- **Global suppression (Slice J):** `lead_engine_email_suppressions` + shared `normalizeEmailForSuppression()` used by send, unsubscribe, list/detail visibility, and filters.
- **CRM sync (Slice K):** `lead-engine-sync-crm` uses HubSpot Contacts API with a private app token; no bidirectional sync, no bulk sync, no auto-sync.

## Feature flags

| Variable | Purpose |
|----------|---------|
| `LEAD_ENGINE_ENABLED` | Master switch. When unset/false, lead engine functions return **403** and the product is off. |
| `LEAD_ENGINE_ALLOW_OPENAI` | Must be truthy for **`lead-engine-score`** and **`lead-engine-draft`**. Shown on `lead-engine-status` as `openaiAllowed`. **Analyze (Slice C) does not use OpenAI.** Ingest/list/analyze work without it. |

## Operator auth

| Variable | Purpose |
|----------|---------|
| `LEAD_ENGINE_SECRET` | Random string used to sign session tokens (independent of `REFERRAL_SECRET`). |
| `LEAD_ENGINE_OPERATORS` | Comma-, semicolon-, or newline-separated entries: `username:password`. Only the **first** `:` separates username and password. |

Referral partners **do not** get lead engine access unless they are explicitly listed in `LEAD_ENGINE_OPERATORS`.

### Auth behavior (all lead-engine functions except login)

1. If **`LEAD_ENGINE_ENABLED`** is not truthy → **403** `{ "error": "Lead engine is disabled" }`.
2. If enabled but **`LEAD_ENGINE_OPERATORS` / `LEAD_ENGINE_SECRET`** missing → **503** with a configuration hint.
3. If configured but no valid **`lead_engine_session`** cookie → **401** `{ "error": "Unauthorized" }`.

`lead-engine-auth` **POST** (login) returns **403** when disabled and **503** when operators/secret are missing. **DELETE** (logout) follows the same checks.

### `lead-engine-auth` **GET** (session probe)

Used by **`/lead-engine/`**, **`/internal/outreach`**, and **`/internal/demo-builder`** to decide whether to show the app or the login wall.

| Response | Body |
|----------|------|
| **200** | `{ "authenticated": true, "username": "<operator>" }` |
| **401** | `{ "error": "Unauthorized", "authenticated": false }` — no or invalid **`lead_engine_session`** cookie |
| **403** | `{ "error": "Lead engine is disabled", "authenticated": false }` |
| **503** | `{ "error": "Lead engine auth is not configured", "authenticated": false }` — missing operators or secret |

## Supabase (ingest, list, analyze)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only; never expose to the browser) |
| `HUBSPOT_PRIVATE_APP_TOKEN` | Required for `lead-engine-sync-crm` (Slice K manual CRM push). |

If these are missing, **`lead-engine-ingest`**, **`lead-engine-list`**, and **`lead-engine-analyze`** return **503** with a clear message. **`lead-engine-status`** does not require Supabase.

## Database

- **Full schema:** `supabase/schema.sql` (Lead engine section).
- **Dated migrations:**
  - `supabase/migrations/20250324120000_lead_engine_slice_b_indexes.sql` — dedupe/list index on leads.
  - `supabase/migrations/20250325120000_lead_engine_analysis_latest_idx.sql` — `(lead_id, created_at DESC)` for latest-analysis batch reads in list.
  - `supabase/migrations/20250326120000_lead_engine_ai_scores.sql` — AI scoring rows linked to an audit.
  - `supabase/migrations/20250327120000_lead_engine_outreach_lead_created.sql` — index `(lead_id, created_at DESC)` for latest outreach per lead in list.
  - `supabase/migrations/20250328130000_lead_engine_slice_f_opt_out.sql` — `email_opted_out`, `outreach_unsubscribe_token` on leads (token is **server-only**, never returned by list/ingest APIs).
  - `supabase/migrations/20250329120000_lead_engine_send_claim.sql` — nullable **`send_started_at`** on **`lead_engine_outreach`** for send **claim / in-progress** detection and stale-lock recovery (required for Slice H send behavior).
  - `supabase/migrations/20250330120000_lead_engine_global_suppression.sql` — global email suppression table keyed by normalized email for cross-lead send blocking.
  - `supabase/migrations/20250331120000_lead_engine_external_crm_id.sql` — explicit **`external_crm_id`** field/index on leads for CRM record id persistence.
  - `supabase/migrations/20250401120000_lead_engine_events.sql` — append-only internal event/audit log for operator/business actions and reporting.
  - `supabase/migrations/20260402140000_lead_engine_demo_slug.sql` — optional **`demo_slug`** on leads (custom `/demo/:slug` link).
  - `supabase/migrations/20260402160000_lead_engine_demo_outreach_status.sql` — **`demo_outreach_status`**, **`demo_outreach_status_at`** on leads for manual composer tracking.
  - `supabase/migrations/20260403100000_lead_engine_demo_followup_due.sql` — **`demo_followup_due_at`**, **`demo_last_contacted_at`** on leads (filters + reminders).

Tables:

- `lead_engine_leads` — core lead row; `source` defaults to `manual`; **`email_opted_out`** blocks **`lead-engine-send`**; **`outreach_unsubscribe_token`** backs one-click unsubscribe (not exposed in JSON APIs). CRM sync fields used in Slice K: `external_crm_id` (plus legacy `external_id` mirror), `crm_source`, `sync_status`, `last_synced_at`, `sync_error`.
- `lead_engine_analysis` — **one row per audit run**; deterministic **`signals` JSON only** for new writes (Slice C). Legacy columns `scores` / `recommended_offer` / `model_version` may still exist on old rows but **must not** receive new model updates.
- `lead_engine_ai_scores` — **one row per score run**; stores model `scores` JSONB, `recommended_offer`, `model_version`, with FK to `lead_id` and **`analysis_id`** (the deterministic audit used as input). Does **not** modify `signals`.
- `lead_engine_outreach` — **email rows** (Slice E–H): **Draft** inserts a row; **Approve** updates that row to **`approved`** and clears **`send_started_at`**; **Send** sets **`send_started_at`** (claim) before Resend, then **`sent`** + **`sent_at`** and clears **`send_started_at`** on success. List with `includeLatestOutreach=1` returns **`latest_outreach`** (newest row, any status) plus **`outreach.latest_draft` / `latest_approved` / `latest_sent`** (newest per status) so operators can see **Gen / Apr / Sent** side by side.
- `lead_engine_email_suppressions` — **global suppression** by `email_normalized` (`trim` + lowercase only). Written by unsubscribe when `contact_email` exists; checked by send before and after claim. Minimal fields: `suppression_source`, `reason`, `created_by`, `created_at`.
- `lead_engine_events` — append-only internal audit log with optional `lead_id`/`outreach_id`/`analysis_id`/`ai_score_id`, stable `event_type`, `actor`, short `message`, compact `metadata_json`, and `created_at`.

RLS is enabled with **no** policies for site users; the **service role** bypasses RLS.

**Note:** There is no `updated_at` trigger in this repo for other tables; `updated_at` on leads is set explicitly when status moves to `analyzed`.

---

## Go-live checklist: custom demo slice + one-click send

1. **Supabase migrations** (in order on the linked project):  
   `20260402140000_lead_engine_demo_slug.sql` → `20260402160000_lead_engine_demo_outreach_status.sql` → `20260403100000_lead_engine_demo_followup_due.sql`  
   Use **`supabase db push`** after **`supabase link`**, or paste each file in the SQL Editor. Confirms **`demo_slug`**, **`demo_outreach_*`**, **`demo_followup_due_at`**, **`demo_last_contacted_at`**.

2. **Stripe Payment Links** — In Dashboard → each link → After payment → success URL must match **`js/jl-stripe-product-links.js`**:  
   `ai-intake` → `/onboarding?service=ai-intake`; `fix-my-app` → `fix-app`; `scheduling` → `scheduling`; `lead-gen` → `lead-engine`.

3. **Netlify env** — One-click send: **`RESEND_API_KEY`**, **`LEAD_ENGINE_PHYSICAL_ADDRESS`**, **`LEAD_ENGINE_PUBLIC_SITE_URL`**, **`LEAD_ENGINE_OUTREACH_FROM_EMAIL`**, **`FORM_FROM_EMAIL`**. Auth: **`LEAD_ENGINE_ENABLED`**, **`LEAD_ENGINE_OPERATORS`**, **`LEAD_ENGINE_SECRET`**. See **`.env.example`**.

4. **Local/repo verify** — From repo root: **`npm run verify:lead-engine-slice`** (checks migration files on disk, env keys in `.env` without printing values, and key source files).

---

## Internal: custom demo outreach & demo builder

Static pages **`/internal/outreach`** and **`/internal/demo-builder`** use the **same operator session** as `/lead-engine/` (**`GET lead-engine-auth`** to check; login via **`/lead-engine/login.html`**).

### Product defaults (workflow)

| Topic | Behavior |
|-------|----------|
| **Follow-up 2** | Not in the main template dropdown; enable under **Advanced templates** on `/internal/outreach`. |
| **Composer URL** | Query params supported include **`leadId`**, **`businessName`**, **`demoSlug`** / **`demoUrl`**, and **`templateVariant`** (e.g. **`followup_1`**, **`followup_2`**) to preselect the email template when the page loads. **`followup_2`** turns on **Advanced templates** automatically so the option exists in the dropdown. |
| **Custom opener** | Prepended at the **top** of the body, then template hook + body (never between “Hey —” and the first paragraph). |
| **Demo builder auth** | **`demo-config` POST** accepts **`lead_engine_session`** when lead engine auth is configured (same model as outreach). **`DEMO_GENERATOR_SECRET`** is optional **`Bearer`** for scripts only—not the browser-only gate. |
| **Follow-up due** | Column **`demo_followup_due_at`**; after a **successful** composer send it is set from template: **initial / shorter / direct** → +3 business days (UTC, weekdays); **follow-up 1** → +4; **follow-up 2** → cleared. Operators can still edit manually. List filters **`demoFollowupDue`**, **`demoRecentSentDays`**. |
| **Drafted status** | Never set on page open. Set by **Mark as drafted** or **Copy full email** (linked lead). |
| **Activity** | **`lead-engine-activity-summary`** operational strip surfaces **`demo_outreach_sent`** and **`demo_outreach_send_failed`** (plus other demo event counts). |

### `demo-config` (Netlify Function)

- **`GET`** — Public read by slug; `?meta=industries` for preset keys (no auth).
- **`POST`** — Creates a blob-backed demo config. When **`LEAD_ENGINE_ENABLED`** and operator auth env are configured, **`POST` requires** either a valid **`lead_engine_session`** cookie **or** `Authorization: Bearer <DEMO_GENERATOR_SECRET>` if that env is set. If lead engine auth is **not** configured, behavior matches older deploys: optional bearer secret only when `DEMO_GENERATOR_SECRET` is set; otherwise open (typical local dev).

### `lead-engine-demo-outreach-status`

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session.

Patches **`lead_engine_leads`** for the custom-demo composer (linked lead via **`?leadId=`** on `/internal/outreach`). At least one of **`status`**, **`demoFollowupDueAt`**, or **`demoLastContactedAt`** must be present in the JSON body.

| Field | Notes |
|-------|--------|
| `leadId` | Required UUID. |
| `status` | Optional. `drafted` \| `copied` \| `sent_manual` \| `send_failed` \| `followup_due` \| `replied` \| `interested` \| `not_interested` \| `null` / empty string to clear. Updates **`demo_outreach_status`** and **`demo_outreach_status_at`**. When set to **`drafted`**, appends **`demo_outreach_drafted`**. When set to **`followup_due`**, appends **`demo_outreach_followup_due`**. (**`send_failed`** is also set automatically when **`lead-engine-demo-outreach-send`** hits Resend failure.) |
| `demoFollowupDueAt` | Optional ISO timestamp or `null` / `""` to clear **`demo_followup_due_at`**. |
| `demoLastContactedAt` | Optional ISO or clear; normally set by the server on successful demo send, not by the composer. |

**200** returns **`demo_outreach_status`**, **`demo_outreach_status_at`**, **`demo_followup_due_at`**, **`demo_last_contacted_at`**.

### `lead-engine-demo-outreach-send`

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session.

| Field | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | Target lead. |
| `subject` | Yes | Plain-text subject (preview). |
| `bodyPlain` | Yes | Plain-text body. |
| `to` | Yes | Must equal the lead’s **`contact_email`** after trim/normalize. |
| `templateVariant` | No | Composer template id (`initial`, `followup_1`, `followup_2`, `shorter`, `direct`). Drives **`demo_followup_due_at`** after a successful send (see product defaults table). |

On success: **`demo_outreach_status`** → **`sent_manual`**, **`demo_outreach_status_at`**, **`demo_last_contacted_at`**, **`demo_followup_due_at`** per variant, logs **`demo_outreach_sent`**. **200** body includes **`demo_followup_due_at`**.

On Resend failure: sets **`demo_outreach_status`** → **`send_failed`**, **`demo_outreach_status_at`**, logs **`demo_outreach_send_failed`**. **502**/**503** JSON may include **`demo_outreach_status`** / **`demo_outreach_status_at`** for UI sync.

Same Resend/compliance requirements as main outreach (**`RESEND_API_KEY`**, **`LEAD_ENGINE_PHYSICAL_ADDRESS`**, resolvable public site URL, From).

### List filters (`lead-engine-list`)

Query parameters (in addition to existing Slice G filters):

| Parameter | Values | Effect |
|-----------|--------|--------|
| **`demoOutreachStatus`** | `drafted` \| `copied` \| `sent_manual` \| `send_failed` \| `followup_due` \| `replied` \| `interested` \| `not_interested` \| `unset` | Filter leads by **`demo_outreach_status`**; **`unset`** = null/empty (“no outreach yet” for custom demo tracking). Outcome rows (**`replied`**, **`interested`**, **`not_interested`**) are operator-set for lightweight CRM. |
| **`demoFollowupDue`** | `unset` \| `set` \| `overdue` \| `today` \| `next_2_days` \| `upcoming` | Filter by **`demo_followup_due_at`** (UTC). **`next_2_days`** = due on tomorrow or the next calendar day (exclusive end at start of UTC day+3). **`upcoming`** = any due on or after tomorrow 00:00 UTC. |
| **`demoQueuePreset`** | `daily_action` | **Union** cohort: demo F/U **overdue** OR demo F/U **due today** (UTC) OR **`demo_outreach_status` = `send_failed`**. When set, **`demoOutreachStatus`** and **`demoFollowupDue`** query params are ignored (preset wins). Still **AND**s with other list filters (lead status, search, outreach, **`demoRecentSentDays`**, etc.). On **`/lead-engine/`**, the UI reads these three keys from the URL on load and updates them with **`history.replaceState`** when the daily queue buttons or demo dropdowns change (shareable / refresh-safe for that slice only). |
| **`demoRecentSentDays`** | Integer **1–30** | **`sent_manual`** leads whose **`demo_outreach_status_at`** is within the last *N* days (rolling). |

**List summary (`includeSummary=1`):** `summary.demoQueue` includes **`demoFollowupDueToday`**, **`demoFollowupOverdue`**, **`demoOutreachSendFailed`**, **`demoOutreachReplied`**, **`demoOutreachInterested`** for the **same Slice G filters** as the list (status / search / optedOut). With ID-prefilters, counts are computed from the **matching cohort** on the current request.

### Internal tools: auth surface (audit)

Custom-demo pages are static HTML; **authorization is enforced in Netlify Functions**, not by hiding URLs.

| Function | Browser / session |
|----------|-------------------|
| **`lead-engine-auth`** | **GET** / **POST** / **DELETE** — gated by **`LEAD_ENGINE_ENABLED`** and operator config. |
| **`lead-engine-demo-outreach-send`** | **POST** — **`guardLeadEngineRequest`** (session required). |
| **`lead-engine-demo-outreach-status`** | **POST** — session required. |
| **`lead-engine-list`** (and other `lead-engine-*` data APIs) | Session required. |
| **`demo-config` POST** | **`lead_engine_session`** when lead engine auth is configured, else optional **`DEMO_GENERATOR_SECRET`** bearer, else open if neither (local dev). |
| **`demo-config` GET** | Intentionally public (read demo JSON by slug; no lead PII in response). |

There is **no** alternate public path to send mail or patch lead rows for demo outreach without passing the same checks as above.

### Activity summary (`lead-engine-activity-summary`)

The operational strip on **`/lead-engine/`** counts recent rows in the window. Custom-demo composer event types include **`demo_outreach_sent`**, **`demo_outreach_send_failed`**, **`demo_outreach_drafted`**, and **`demo_outreach_followup_due`** (the latter when status is saved as **follow-up due** via **`lead-engine-demo-outreach-status`**).

---

## API: manual ingest — `lead-engine-ingest`

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `company_name` | Yes | Trimmed; internal whitespace collapsed; max 200 chars. |
| `website_url` | Yes | Normalized to `http`/`https`, host lowercased, trailing slash trimmed on paths. |
| `contact_email` | No | Trimmed; simple format validation if present. |
| `source` | No | Must be **`manual`** if sent; defaults to `manual`. Other values → **400** (webhook/CRM later). |
| `idempotency_key` | No | Trimmed; max 200 chars. If set and already stored, returns the **existing** row (no duplicate insert). |

`created_by` is set from the signed session **username** (client cannot override).

### Dedupe (manual)

If the same **`company_name`** + **`website_url`** (after normalization) was already saved as `source = manual` within the **last 30 days**, the API returns **200** with the **existing** lead and `duplicateReplay: true` (no new row).

### Responses

- **201** — New lead: `{ "lead": { ...compact } }`
- **200** — Idempotent or duplicate replay: `{ "lead": { ... }, "idempotentReplay": true }` and/or `duplicateReplay: true`
- **400** — Validation: `{ "error": "Validation failed", "errors": ["..."] }` or `{ "error": "Invalid JSON body" }`
- **401** / **403** / **503** — As above
- **500** — Database errors

### Compact `lead` shape

`id`, `company_name`, `website_url`, `contact_email`, `email_opted_out`, `status`, `source`, `created_at`, `created_by` (no `outreach_unsubscribe_token` in API responses)

---

## API: CSV import preview/commit — `lead-engine-import-preview`, `lead-engine-import-commit` (Slice M)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie. Internal operator UI only.

### Flow

1. Upload CSV in `/lead-engine/` and call **preview**.
2. Server parses + validates + classifies each row as **`ready`**, **`duplicate`**, or **`invalid`**.
3. Operator confirms and calls **commit**.
4. Commit inserts only rows currently classified **`ready`** (rows are revalidated/rechecked at commit time).

No analyze/score/draft/send/CRM actions are triggered by import in this slice.

### Supported CSV headers

Strict headers only (case-insensitive):

- `company_name` (**required**)
- `website_url` (**required**)
- `contact_email` (optional)
- `source` (optional; defaults to `manual_import`; allowed: `manual`, `manual_import`)
- `idempotency_key` (optional)

### Validation + normalization

Import rows reuse ingest normalization primitives (`sanitizeCompanyName`, `normalizeWebsiteUrl`, `normalizeOptionalEmail`, `normalizeIdempotencyKey`) so rules stay aligned with manual ingest.

### Duplicate handling

- **Idempotency replay:** existing `idempotency_key` -> `duplicate` with reason `idempotency_replay`
- **Recent manual duplicate:** existing `company_name + website_url` within 30 days in source `manual` or `manual_import` -> `duplicate` with reason `recent_manual_duplicate`
- **Invalid rows** are never inserted.

### Preview request/response

`POST /.netlify/functions/lead-engine-import-preview`

Request:

```json
{ "csvText": "company_name,website_url\nAcme,acme.com" }
```

Response `200`:

```json
{
  "success": true,
  "counts": { "total": 1, "ready": 1, "duplicate": 0, "invalid": 0 },
  "rows": [
    {
      "rowNumber": 2,
      "status": "ready",
      "reason": null,
      "errors": [],
      "normalized": {
        "company_name": "Acme",
        "website_url": "https://acme.com",
        "contact_email": null,
        "source": "manual_import",
        "idempotency_key": null
      }
    }
  ]
}
```

### Commit request/response

`POST /.netlify/functions/lead-engine-import-commit`

Request:

```json
{
  "csvText": "company_name,website_url\nAcme,acme.com",
  "confirm": true
}
```

Response `200`:

```json
{
  "success": true,
  "counts": {
    "total": 1,
    "inserted": 1,
    "duplicate": 0,
    "invalid": 0
  },
  "insertedLeadIds": ["..."]
}
```

`confirm: true` is required; commit fails with `400` without it.

### Sample CSV

```csv
company_name,website_url,contact_email,source,idempotency_key
Acme Co,acme.com,owner@acme.com,manual_import,import-2026-03-23-1
Beta Labs,https://betalabs.example/contact,,,import-2026-03-23-2
```

---

## API: list — `lead-engine-list`

**Methods:** `GET`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Query parameters

| Param | Default | Notes |
|-------|---------|--------|
| `page` | `1` | Positive integer. |
| `pageSize` | `25` | Capped at **100**. |
| `status` | (none) | One of: `new`, `analyzed`, `review`, `archived`. Invalid → **400**. |
| `search` | (none) | Max 200 chars; matches **company_name** OR **website_url** (case-insensitive). Commas/parens stripped to keep PostgREST `or` filters safe. |
| `includeLatestAnalysis` | (off) | If `1` / `true` / `yes`, each lead includes **`latest_analysis`**: the **preferred** audit row = newest **successful** audit if any, else the newest row. **`scoring`** comes from the latest **`lead_engine_ai_scores`** row for that `analysis_id`; if none, API uses a temporary compatibility fallback to legacy fields on `lead_engine_analysis` (pre–AI-table data only). |
| `includeLatestOutreach` | (off) | If `1` / `true` / `yes`, adds **`latest_outreach`** (newest row, any status) and **`outreach`**: `{ latest_draft, latest_approved, latest_sent, send_recovery? }` — each of the first three is the **newest** row for that **status** (`channel = email`), with `approved_by` / `sent_at` / `send_started_at` when set. **`send_recovery`** is set when **`latest_approved`** has **`send_started_at`** (in-flight, stuck, or unfinalized / **`RECONCILE_REQUIRED`**-shaped state): `{ stale_lock, active_lock, reasons[] }` from **`lead-engine-send-recovery`**. |
| `optedOut` | (none) | `true` / `false` / `1` / `0` / `yes` / `no` — filter **lead-level** `email_opted_out`. Invalid → **400**. |
| `suppressed` | (none) | `true` / `false` / `1` / `0` / `yes` / `no` — filter by **global email suppression** (`lead_engine_email_suppressions` match on normalized `contact_email`). Invalid → **400**. |
| `outreachStatus` | (none) | `draft` \| `approved` \| `sent` \| `cancelled` — keep only leads that have **at least one** `lead_engine_outreach` email row in that status (pre-filter, then other filters apply in memory). Invalid → **400**. |
| `reviewQueue` | (none) | Focused review queue pre-filter from outreach history (`channel=email`). One of: `needs_review` (latest outreach row is draft), `has_draft` (any draft exists), `latest_draft`, `latest_approved`, `multiple_drafts` (draft row count > 1). Invalid → **400**. |
| `needsAttention` | (none) | **`send`** (or `1` / `true` / `yes`) — keep only leads with **at least one** email outreach row where **`status = approved`** and **`send_started_at` IS NOT NULL** (send recovery queue). Intersects with **`outreachStatus`** / **`recommendedOffer`** when combined. Invalid → **400**. |
| `recommendedOffer` | (none) | Canonical offer string (same set as AI scoring). Keep only leads with **at least one** `lead_engine_ai_scores` row with that **`recommended_offer`**. Invalid / unknown → **400**. |
| `includeSummary` | (off) | If `1` / `true` / `yes`, response includes **`summary`** (counts for the **current filter set**; see below). Extra Supabase work. |

**Pre-filter guardrail:** If `outreachStatus`, `recommendedOffer`, `needsAttention`, and/or `suppressed` would match more than **2500** distinct leads, the API returns **400** with a message to narrow filters.

Sort: **`created_at` descending** (newest first). When any of these pre-filters is used, matching leads are loaded by ID batch, filtered in memory for `status` / `search` / `optedOut`, then paginated.

### Response **200**

```json
{
  "leads": [
    {
      "id": "...",
      "company_name": "...",
      "website_url": "...",
      "contact_email": null,
      "email_opted_out": false,
      "global_email_suppressed": false,
      "status": "analyzed",
      "source": "manual",
      "created_at": "...",
      "created_by": "opsuser",
      "latest_analysis": {
        "id": "...",
        "fetched_at": "...",
        "created_at": "...",
        "summary": {
          "success": true,
          "final_url": "https://...",
          "pages_fetched": 2,
          "page_title": "...",
          "h1": "...",
          "ux_hints": ["missing_phone", "..."],
          "booking_detected": false,
          "forms_total": 1,
          "failure": null
        },
        "scoring": {
          "fit_score": 68,
          "confidence": "medium",
          "pain_points": ["..."],
          "outreach_angle": "...",
          "recommended_offer": "Scheduling & Resource Routing",
          "model_version": "gpt-4.1-mini|jl-lead-score-v1",
          "ai_score_id": "<uuid>",
          "scored_at": "2025-03-26T12:00:00.000Z"
        }
      },
      "latest_outreach": {
        "id": "<uuid>",
        "draft_subject": "...",
        "draft_body": "...",
        "status": "draft",
        "created_at": "2025-03-27T10:00:00.000Z",
        "approved_by": null,
        "sent_at": null
      },
      "outreach": {
        "latest_draft": { "id": "...", "draft_subject": "...", "status": "draft", "created_at": "..." },
        "latest_approved": null,
        "latest_sent": null
      }
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 25,
  "totalPages": 2,
  "summary": {
    "totalMatching": 42,
    "byLeadStatus": { "new": 5, "analyzed": 30, "review": 5, "archived": 2 },
    "flags": { "optedOut": 2, "globallySuppressed": 1, "missingContactEmail": 8 },
    "pipeline": {
      "scoredLeads": 28,
      "withDraft": 10,
      "withApproved": 2,
      "withSent": 6,
      "failedAnalysisRuns": 4,
      "needsSendRecovery": 1
    },
    "pipelineNote": null
  }
}
```

### `summary` object (Slice G, when `includeSummary=1`)

| Field | Meaning |
|-------|---------|
| `totalMatching` | Same as **`total`** for the current filters. |
| `byLeadStatus` | Counts per **`lead_engine_leads.status`** with the same filters. If `status` query param is set, only that bucket is filled. |
| `flags.optedOut` | Leads matching filters with **`email_opted_out = true`**. |
| `flags.globallySuppressed` | Leads matching filters whose normalized `contact_email` appears in `lead_engine_email_suppressions`. |
| `flags.missingContactEmail` | Leads matching filters with **`contact_email` IS NULL** (empty string not counted here). |
| `pipeline` | When **≤ 500** leads match **without** `outreachStatus`/`recommendedOffer` pre-filter: distinct counts for AI-scored leads, outreach by status, **failed audit runs** (`signals.success === false`), and **`needsSendRecovery`** (distinct leads with **approved** outreach + **`send_started_at`**) within that cohort. **`null`** when omitted. |
| `pipelineNote` | Set when pipeline counts are skipped (e.g. more than 500 matches on the standard path). |

With **`outreachStatus` / `recommendedOffer` / `needsAttention` / `suppressed`**, `pipeline` is computed for the **full** filtered cohort (after in-memory `status` / `search` / `optedOut`), not only the current page.

If `includeLatestAnalysis` is off, `latest_analysis` is omitted. If `includeLatestOutreach` is off, `latest_outreach` and `outreach` are omitted. **`email_opted_out`** is included on every list row once migration **Slice F** has been applied.

---

## API: lead detail / history — `lead-engine-lead-detail` (Slice G)

**Methods:** `GET`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Query parameters

| Param | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | UUID. |

### Response **200**

Compact JSON (no raw HTML dumps):

- **`lead`** — same compact lead fields as list (no unsubscribe token).
- **`counts`** — `analysisRuns`, `aiScoreRuns`, `outreachRows`, and **`failedAuditsInRecent`** (failures among the **up to 12** audit rows returned, not global).
- **`audits`** — up to **12** newest analyses: `id`, `created_at`, `success`, `summary` (compact).
- **`scores`** — up to **12** newest `lead_engine_ai_scores`: `id`, `analysis_id`, `created_at`, `recommended_offer`, `fit_score`, `confidence`.
- **`outreach`** — up to **15** newest email outreach rows: `id`, `status`, `created_at`, `sent_at`, `approved_by`, truncated `draft_subject`.
- **`events`** — up to **20** newest audit events for that lead: `event_type`, `actor`, `message`, `created_at`, `outreach_id` (if applicable).

**404** — unknown lead. **400** — invalid `leadId`.

---

## API: activity summary — `lead-engine-activity-summary` (Slice S)

**Methods:** `GET`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Query parameters

| Param | Required | Notes |
|-------|----------|--------|
| `limit` | No | Max recent events to scan for summary/reporting (`20..500`, default `200`). |

### Response **200**

- `summary.totalEvents`
- `summary.byEventType` (counts keyed by stable event type)
- `summary.byActor` (counts keyed by actor username when available)
- `summary.operational`:
  - `recentSends`
  - `recentApprovals`
  - `recentReconciliations`
  - `recentCrmSyncFailures`
- `recent` — compact newest events list (for internal UI rendering)

### Event types currently logged

- `manual_ingest_created`
- `csv_import_commit_inserted`
- `analyze_success`, `analyze_failure`
- `score_success`, `score_failure`
- `draft_generated`, `draft_failed`, `draft_approved`
- `send_attempted`, `send_succeeded`
- `reconcile_mark_sent`, `reconcile_release_send_lock`, `reconcile_mark_failed`
- `unsubscribed`, `global_suppression_created`
- `crm_sync_succeeded`, `crm_sync_failed`

Known limitation: event writes are best-effort and intentionally do not fail core business actions when an audit insert fails.

---

## API: analyze — `lead-engine-analyze` (Slice C)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.  
**No OpenAI** — deterministic fetch + HTML parsing only.

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | UUID of an existing `lead_engine_leads` row. |

### Behavior

1. Loads the lead; **404** if missing.
2. **400** if `website_url` is empty.
3. **Fetches** the homepage with redirect follow, **~8s timeout**, **~600KB** body cap, `User-Agent: JL-Solutions-LeadEngine/1.0`.
4. Blocks some hosts (e.g. LinkedIn, major social) as **primary** targets; secondary fetches are **same-origin only** (no social crawl).
5. Optionally fetches up to **two** same-origin paths likely to be contact / booking / services (from homepage links only — **not** a site crawler).
6. **Inserts** a **new** `lead_engine_analysis` row every run (`scores`, `recommended_offer`, `model_version` = null).
7. On **successful** fetch + parse, sets lead **`status`** from **`new`** → **`analyzed`** (does not downgrade `review` / `archived`).
8. On **fetch/HTTP failure**, still inserts an analysis row with `signals.success: false` and `signals.failure` metadata; **does not** change lead status.
9. **PageSpeed Insights** (when **`GOOGLE_PAGESPEED_API_KEY`** is set): runs Lighthouse **mobile** on the **homepage** by default (V1 conservative mode). Set **`LEAD_ENGINE_PSI_EXTENDED=true`** to also run PSI on a same-origin **contact** URL and one same-origin **primary service** URL when discovered. Results are stored in **`signals.psi`** (includes **`psi_mode`**: `home_only` or `extended`) and mirrored onto lead columns such as **`page_speed_score`**, **`performance_score`**, **`accessibility_score`**, **`best_practices_score`**, **`seo_score`**, **`accessibility_flags`**.

### Response **200** (success or recorded failure)

```json
{
  "success": true,
  "leadId": "uuid",
  "analysisId": "uuid",
  "summary": {
    "success": true,
    "final_url": "https://example.com",
    "pages_fetched": 2,
    "page_title": "...",
    "h1": "...",
    "ux_hints": ["missing_clear_cta", "..."],
    "booking_detected": false,
    "forms_total": 1,
    "failure": null
  }
}
```

When the site could not be fetched, `success` at the top level is **`false`** and `summary.failure` contains `{ "type", "message", "http_status" }`.

### Errors

- **400** — Invalid body / missing `leadId` / invalid UUID.
- **401** / **403** / **503** — Auth / feature / database config.
- **404** — Unknown lead.
- **500** — Supabase insert/update errors.

### `signals` JSON shape (stored in DB)

Top-level keys (version **1**):

| Key | Description |
|-----|-------------|
| `audit_version` | `1` |
| `success` | Whether homepage fetch + HTML read succeeded |
| `final_url` | Resolved homepage URL after redirects |
| `fetched_at` | ISO timestamp when the bundle was built |
| `pages` | Array of per-page objects: `url`, `role` (`home` / `contact` / `booking` / `services` / `key_page`), plus extracted fields below |
| `aggregate` | Merged counts/booleans across pages |
| `ux_hints` | Deterministic strings (e.g. `missing_meta_description`, `no_obvious_booking_path`) |
| `failure` | Present only when `success` is false |
| `psi` | Optional PSI bundle: **`primary_scores`** (homepage), **`pages`** (per-URL Lighthouse category scores and flags), **`psi_mode`** (`home_only` / `extended`) |

Per-page extraction (examples):

- `page_title`, `meta_description`, `h1`
- `forms_count`, `ctas` (text + href, capped)
- `booking_links` (href/text matching booking keywords)
- `mailto_count`, `tel_count`, `has_email_in_text`, `has_phone_in_text`
- `trust_markers` (e.g. testimonial, licensed, insured — keyword presence in visible text)
- `chat_widget_hints` (known third-party snippet strings in raw HTML)
- `social_links` (facebook, linkedin, etc. from `a[href]`)

---

## API: pipeline-run — `lead-engine-pipeline-run`

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.

Runs **analyze → score → draft** for one lead in a single request (no send). Use from automation (e.g. n8n) after a lead row exists.

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | UUID of an existing `lead_engine_leads` row. |

### Response **200**

Returns **`analyze`**, **`score`**, and **`draft`** objects (same shapes as the individual endpoints). If analyze fails, score/draft are skipped and their entries contain **`skipped: true`**.

### Errors

Same auth and **`404`** / **`500`** patterns as the underlying handlers.

---

## API: score — `lead-engine-score` (Slice D)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Feature gating

| Condition | Response |
|-----------|----------|
| `LEAD_ENGINE_ALLOW_OPENAI` not truthy | **403** — AI scoring disabled (other lead-engine routes unaffected). |
| `OPENAI_API_KEY` missing | **503** — OpenAI not configured. |
| `SUPABASE_*` missing | **503** — database not configured. |

### Request body (JSON)

Same as analyze: `{ "leadId": "<uuid>" }` (validated with the same rules as `lead-engine-analyze`).

### Data selection

1. Loads the lead; **404** if missing.
2. Loads all `lead_engine_analysis` rows for that lead (ordered by `created_at` desc in memory).
3. Chooses the **latest successful** row: `signals.success === true`. If none → **409** `NO_SUCCESSFUL_ANALYSIS`.
4. Sends **only** structured `signals` plus `company_name`, `website_url`, `source` to the model — **no raw HTML**.

### OpenAI env (reuse chatbot-style config)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for scoring |
| `OPENAI_MODEL` | Optional; default `gpt-4.1-mini` |
| `OPENAI_API_URL` | Optional; default `https://api.openai.com/v1/responses` |

### Persistence

**Inserts** a row into **`lead_engine_ai_scores`** (does **not** update `lead_engine_analysis`):

- `lead_id`, `analysis_id` (the successful audit whose `signals` were scored)
- `scores` (JSONB) — see shape below  
- `recommended_offer` (TEXT)  
- `model_version` (TEXT) — `{OPENAI_MODEL}|jl-lead-score-v1`

Re-running Score adds **another** `lead_engine_ai_scores` row; the list UI shows the **latest** by `created_at` for that `analysis_id`. Deterministic **`signals`** on `lead_engine_analysis` are never overwritten by the scorer.

### Model output schema (validated server-side)

The model must return **only** a JSON object:

| Field | Type | Rules |
|-------|------|--------|
| `fit_score` | integer | 0–100 inclusive |
| `confidence` | string | `low` \| `medium` \| `high` |
| `pain_points` | string[] | max 5 items |
| `outreach_angle` | string | non-empty; internal-use angle |
| `recommended_offer` | string | Exactly one of: **Website Redesign**, **Fix My App**, **AI Intake Form Setup**, **Scheduling & Resource Routing** (case-insensitive match normalized to canonical spelling) |

### Persisted `scores` JSON shape

```json
{
  "fit_score": 68,
  "confidence": "medium",
  "pain_points": ["Missing clear booking path", "..."],
  "outreach_angle": "Lead with concise, factual hook aligned to signals."
}
```

(`recommended_offer` is stored in its own column as well as implied by the model; not duplicated inside `scores`.)

### Responses

- **200** — `{ "success": true, "leadId", "analysisId", "aiScoreId", "scores", "recommended_offer", "model_version" }`
- **400** — Invalid body / `leadId`
- **403** — `LEAD_ENGINE_ALLOW_OPENAI` off
- **404** — Unknown lead
- **409** — `NO_SUCCESSFUL_ANALYSIS`
- **502** — OpenAI HTTP failure, empty model text, or JSON that fails validation (`errors` array when validation failed)
- **503** — Missing Supabase or OpenAI configuration

### Confidence and safety caveats

- Outputs are **heuristic + model-generated** from **audit signals only**; they can be wrong or overconfident.
- The system prompt instructs the model to lower confidence and stay conservative when `signals.success` is false or data is sparse; **409** avoids scoring when there is **no** successful audit at all.
- Operators must **verify** before any external use. **Slice D does not create outreach drafts or send email.**

---

## API: batch analyze / score / draft — `lead-engine-batch-analyze`, `lead-engine-batch-score`, `lead-engine-batch-draft` (Slice N + P)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Request body (both)

```json
{
  "leadIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "6f1f6e71-4b5e-4ec2-b6cb-4fd86f70a3d2"
  ],
  "channel": "email"
}
```

- `leadIds` must be UUIDs.
- Max batch size: **20** lead IDs per request.
- Oversized batches return **400** `BATCH_TOO_LARGE`.
- `channel` is only used by `lead-engine-batch-draft`; only `email` is supported (`INVALID_CHANNEL` otherwise).

### Batch analyze eligibility/rules

- Uses the same analyze runner logic as single-lead analyze.
- Requires `website_url`; missing URL returns per-row skip code `MISSING_WEBSITE_URL`.
- Does not fail the whole request for one bad row.

### Batch score eligibility/rules

- Uses the same score runner logic as single-lead score.
- Requires `LEAD_ENGINE_ALLOW_OPENAI` and `OPENAI_API_KEY` (same as single-score endpoint).
- Per-row skip when no successful audit (`NO_SUCCESSFUL_ANALYSIS`).
- Does not fail the whole request for one bad row.

### Batch draft eligibility/rules

- Reuses the same core logic as single-lead `lead-engine-draft` (`runDraftForLead`).
- Requires:
  - successful analysis
  - latest AI score row for that successful analysis
  - OpenAI enabled + configured
- Per-row codes include:
  - `DRAFT_SUCCESS`
  - `NO_SUCCESSFUL_ANALYSIS`
  - `NO_AI_SCORE_FOR_ANALYSIS`
  - `OPENAI_DISABLED`
  - `DRAFT_GENERATION_FAILED`

### Response shape (both)

```json
{
  "success": true,
  "summary": {
    "total": 2,
    "succeeded": 1,
    "skipped": 1,
    "failed": 0
  },
  "results": [
    {
      "leadId": "550e8400-e29b-41d4-a716-446655440000",
      "outcome": "succeeded",
      "code": "DRAFT_SUCCESS",
      "outreachId": "..."
    },
    {
      "leadId": "6f1f6e71-4b5e-4ec2-b6cb-4fd86f70a3d2",
      "outcome": "skipped",
      "code": "MISSING_WEBSITE_URL",
      "message": "Lead has no website_url to analyze"
    }
  ]
}
```

`outcome` is one of: `succeeded`, `skipped`, `failed`.

---

## UI: chunked batch runner (Slice O)

Internal `/lead-engine/` now runs selected leads through batch analyze/score in **client-driven chunks** (reusing existing batch endpoints).

- Selection: selected visible rows (selection set persists across pagination/filter changes in session).
- Chunk size: **10 leads per request** in UI (`BATCH_CHUNK_SIZE`), under server max 20.
- Progress feedback shows:
  - total selected
  - processed
  - succeeded
  - skipped
  - failed
- Result table shows compact recent per-row outcomes (`leadId`, `outcome`, `code`).
- Retry:
  - **Retry failed analyze**
  - **Retry failed score**
  - retries only rows that failed in the most recent run for that action.

If one chunk request fails at HTTP level, only that chunk’s rows are marked failed (`CHUNK_REQUEST_FAILED`); prior chunk successes are preserved and do not restart.

Slice P adds batch draft on the same chunked runner pattern (`Batch Draft` + `Retry failed draft`), still with no batch approve/send.

---

## API: draft — `lead-engine-draft` (Slice E)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Feature gating

| Condition | Response |
|-----------|----------|
| `LEAD_ENGINE_ALLOW_OPENAI` not truthy | **403** — AI drafting disabled (same flag as scoring). |
| `OPENAI_API_KEY` missing | **503** — OpenAI not configured. |
| `SUPABASE_*` missing | **503** — database not configured. |

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | UUID of an existing `lead_engine_leads` row (same validation style as analyze/score). |
| `channel` | No | Only **`email`** is supported; omitted defaults to **`email`**. Any other value → **400**. |

### Data selection (strict)

1. Load the lead; **404** if missing.  
2. Among `lead_engine_analysis` rows for that lead, require at least one with **`signals.success === true`** (the **latest successful** row by `created_at` is used — same preference order as score/list). If none → **409** `NO_SUCCESSFUL_ANALYSIS`.  
3. Load the **latest** `lead_engine_ai_scores` row where **`analysis_id`** equals that successful analysis’s `id`. If none → **409** `NO_AI_SCORE_FOR_ANALYSIS`.  
4. **No** draft is generated from failed audits, from audits without a matching AI score row, or from legacy analysis-only scores (UI enables Draft only when `latest_analysis.scoring.ai_score_id` is present).

Prompt input is **only**: `company_name`, `website_url`, `source`, successful audit **`signals`**, and the latest score row (`fit_score`, `confidence`, `pain_points`, `outreach_angle`, `recommended_offer`).

### OpenAI

Reuses chatbot-style env: `OPENAI_API_KEY`, optional `OPENAI_MODEL`, optional `OPENAI_API_URL` (defaults to Responses endpoint). Implementation: `lib/lead-engine-openai-draft.js`.

### Model output (validated)

The model must return **JSON only** (markdown fences stripped server-side):

| Field | Type | Notes |
|-------|------|--------|
| `subject` | string | Non-empty email subject. |
| `body` | string | Non-empty first-touch body (concise). |
| `follow_up_body` | string | Optional; if present, appended to stored `draft_body` under a clear separator. |

If JSON is missing, malformed, or fails validation → **502** with `errors` when applicable.

### Persistence (`lead_engine_outreach`)

Each successful call **inserts** a new row (re-running Draft creates **another** row; list shows the latest):

| Column | Value |
|--------|--------|
| `lead_id` | Request lead |
| `channel` | `email` |
| `draft_subject` | Model `subject` |
| `draft_body` | Composed first touch + optional follow-up section |
| `status` | **`draft`** (always for this slice — no auto-approval) |
| `created_at` | DB default |
| `updated_at` | Set on insert |

### Status values (DB check constraint)

| Status | Meaning |
|--------|---------|
| `draft` | Inserted by **`lead-engine-draft`**; can be approved. |
| `approved` | Set by **`lead-engine-approve`**; only this status may be sent. |
| `sent` | Set by **`lead-engine-send`** after Resend succeeds; repeat **send** → **200** idempotent replay (no second email). |
| `cancelled` | Reserved for operator discard (not wired in Slice F). |

### Responses

- **200** — `{ "success": true, "leadId", "outreachId", "status": "draft", "draft": { "subject", "body", "has_follow_up" } }`  
- **400** — Invalid JSON / validation (`errors`)  
- **401** / **403** / **503** — Auth / feature / config  
- **404** — Unknown lead  
- **409** — `NO_SUCCESSFUL_ANALYSIS`, `NO_AI_SCORE_FOR_ANALYSIS`  
- **502** — OpenAI failure, empty response, or invalid model JSON  
- **500** — Supabase errors  

### Sample **200** body

```json
{
  "success": true,
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "outreachId": "660e8400-e29b-41d4-a716-446655440001",
  "status": "draft",
  "draft": {
    "subject": "Quick idea for Example Co’s site booking flow",
    "body": "Hi — …\n\n---\nFollow-up (optional):\n…",
    "has_follow_up": true
  }
}
```

### Known limitations (Slice E)

- **Approve/send** are **Slice F** (see below).  
- **Multiple drafts** per lead are allowed; list/UI distinguish **Gen / Apr / Sent** via `outreach.*`.  
- Draft quality depends on audit signals + score row; sparse audits yield generic copy.  
- Model output is **not** guaranteed to comply with every prompt constraint — operators must review before use.

---

## API: approve — `lead-engine-approve` (Slice F)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | UUID. |
| `outreachId` | No | UUID of a **`lead_engine_outreach`** row for that lead. If omitted, the **latest** email row with **`status = draft`** is approved. |

### Behavior

- Updates **one existing row** to **`approved`**, sets **`approved_by`** to the signed-in operator username, **`updated_at`** to now.
- **409** if there is no draft to approve, or if the row is not **`draft`** (e.g. already approved/sent).
- **404** if `outreachId` does not belong to `leadId`.

### Response **200**

`{ "success": true, "leadId", "outreachId", "status": "approved", "approved_by", "updated_at" }`

---

## API: send — `lead-engine-send` (Slice F + H)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Environment (email)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Required (same as site forms). |
| `LEAD_ENGINE_PUBLIC_SITE_URL` | **Recommended** — production origin for the unsubscribe link (e.g. `https://www.jlsolutions.io`). |
| `URL` | Netlify sets this on deploy; used if `LEAD_ENGINE_PUBLIC_SITE_URL` is unset. |
| `LEAD_ENGINE_OUTREACH_FROM_EMAIL` | Optional **From** for outreach only; else **`FORM_FROM_EMAIL`**, else Resend test default (see `send-form-email.js`). |
| `FORM_FROM_EMAIL` | Shared fallback **From** (verified domain in Resend). |
| `LEAD_ENGINE_PHYSICAL_ADDRESS` | **Required for production send** — physical mailing address appended to the email footer (CAN-SPAM). If empty, **`lead-engine-send`** returns **503** with **`code: MAILING_ADDRESS_REQUIRED`**. |

**503** if **`RESEND_API_KEY`** is missing, if **no public base URL** can be resolved (unsubscribe link is mandatory before send), or if **`LEAD_ENGINE_PHYSICAL_ADDRESS`** is unset when attempting send.

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | UUID. |
| `outreachId` | No | UUID of an **`approved`** row for that lead. If omitted, the **latest** row with **`status = approved`** (by **`created_at` DESC**) is used. |

### Preconditions

1. Lead exists; **`email_opted_out`** must be **false** before claim → else **409** `LEAD_OPTED_OUT`.  
2. **`contact_email`** present and passes the same simple validation as ingest → else **400** or **409** `MISSING_CONTACT_EMAIL`.  
3. Normalized `contact_email` must **not** exist in `lead_engine_email_suppressions` → else **409** `GLOBAL_EMAIL_SUPPRESSED`.  
4. Target outreach **`status = approved`** (or already **`sent`** for idempotent path) → else **409** `OUTREACH_NOT_APPROVED` / `NO_APPROVED_OUTREACH`.  
5. **Duplicate / concurrent send:** If the row is already **`sent`**, response is **200** with **`idempotentReplay: true`** (no second email). If another send holds a **non-stale** claim (**`send_started_at` set**), **409** `SEND_IN_PROGRESS`. Stale claims (~**15 minutes**) are cleared so a stuck lock can be retried.

### Reliability behavior (Slice H)

There is **no distributed transaction** between Resend and Supabase. The handler reduces duplicate-send risk by:

1. **Claim:** After pre-checks, sets **`send_started_at`** on the **`approved`** row (atomic conditional update).  
2. **Re-check opt-out + global suppression** after claim; if either changed before send, the claim is **released** and response is **409** (`LEAD_OPTED_OUT` or `GLOBAL_EMAIL_SUPPRESSED`).  
3. **Resend** runs only while the row is claimed. On Resend failure, **`send_started_at`** is cleared (**release**).  
4. **Finalize:** After Resend succeeds, the row is updated to **`status = sent`**, **`sent_at`**, and **`send_started_at = null`** with **retries and backoff**. If finalize still fails after retries, the API returns **500** with **`code: RECONCILE_REQUIRED`**, **`resendLikelyDelivered: true`**, and fields such as **`resendMessageId`**, **`outreachId`**, **`leadId`**, **`sentTo`**, **`claimedAt`**, plus a **`hint`** for manual reconciliation in Supabase / Resend. Operators should prefer **`lead-engine-reconcile`** with **`action: mark_sent`** (Slice I) after confirming delivery in Resend. This makes the risky state **explicit** rather than silent.

### Behavior (email build + send)

1. Builds HTML from **`draft_subject`** / **`draft_body`** (plain text → paragraphs; HTML-escaped).  
2. Appends a short **unsubscribe** footer linking to  
   `{origin}/.netlify/functions/lead-engine-unsubscribe?token={outreach_unsubscribe_token}`.  
3. Sends **one** message via **Resend** to **`contact_email`**, **`replyTo`: `info@jlsolutions.io`** (aligned with `send-form-email.js`).

### Response **200** (success)

```json
{
  "success": true,
  "leadId": "...",
  "outreachId": "...",
  "status": "sent",
  "sent_at": "...",
  "sent_to": "prospect@example.com",
  "unsubscribe_link_included": true,
  "resendMessageId": "..."
}
```

### Response **200** (idempotent — already sent)

```json
{
  "success": true,
  "idempotentReplay": true,
  "leadId": "...",
  "outreachId": "...",
  "status": "sent",
  "message": "This outreach was already sent; no duplicate email was sent."
}
```

**409** — `LEAD_OPTED_OUT`, `GLOBAL_EMAIL_SUPPRESSED`, `MISSING_CONTACT_EMAIL`, `NO_APPROVED_OUTREACH`, `OUTREACH_NOT_APPROVED`, **`SEND_IN_PROGRESS`**.  
**502** — Resend error (`RESEND_FAILED`). **500** — claim/finalize errors, or **`RECONCILE_REQUIRED`** after Resend success (see above).

### Latest analysis / scoring consistency (Slice H + L)

- **List / summary display** uses **`pickPreferredAnalysisRow`** (newest **successful** audit by `created_at`; if none, newest row so failed runs remain visible).  
- **Score** and **draft** require a successful audit and use **`pickNewestSuccessfulAnalysisRow`**.  
- **Canonical analysis->AI selection** is shared via **`lead-engine-canonical-select.js`**:
  - `buildPreferredAnalysisByLead(...)`
  - `buildLatestAiScoreByAnalysis(...)`
  - `pickLatestAiScoreForPreferredAnalysis(...)`
- **Scoring truth** is **`lead_engine_ai_scores`**. List scoring uses `resolveCanonicalScoringPayloadForPreferredAnalysis(...)` first.  
- **Temporary compatibility path** remains `resolveScoringPayloadWithLegacyCompat(...)`: if no AI row exists for the preferred audit, it reads legacy `scores` / `recommended_offer` on **`lead_engine_analysis`**. This is read-only and marked temporary for pre-AI historical rows (`source: legacy_analysis_row`).

---

## API: reconcile — `lead-engine-reconcile` (Slice I)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie. **Not** CRM sync — local DB alignment only.

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | UUID. |
| `outreachId` | Yes | UUID — exact **`lead_engine_outreach`** row (required so recovery is explicit). |
| `action` | Yes | **`mark_sent`**, **`release_send_lock`**, or **`mark_failed`**. |
| `sentAt` | No | ISO 8601 date-time for **`mark_sent`**; defaults to **now** if omitted. |
| `acknowledgeMarkFailed` | Required for **`mark_failed`** | Must be JSON **`true`** — API guardrail so clients/scripts do not cancel rows accidentally. |

### Actions

| Action | When to use | Effect |
|--------|-------------|--------|
| **`mark_sent`** | Resend shows delivery (e.g. after **`RECONCILE_REQUIRED`**) | Sets **`status = sent`**, **`sent_at`** (or `sentAt`), **`send_started_at = null`**. **200** idempotent if already **`sent`**. |
| **`release_send_lock`** | Send failed **before** Resend accepted, or operator verified **no** delivery | Clears **`send_started_at`** only; row stays **`approved`** so **Send** can retry. **Misuse** (mail actually sent) can lead to **duplicate** email on retry — response includes a **`warning`**. |
| **`mark_failed`** | Abandon this approved row (bad template, wrong lead, unrecoverable stuck state) | Sets **`status = cancelled`**, clears **`send_started_at`**. Operator must **draft + approve** again to send. Requires **`acknowledgeMarkFailed: true`**. |

### Errors

- **409** `OUTREACH_NOT_RECONCILABLE` — wrong status for the action.  
- **409** `NO_SEND_LOCK` — **`release_send_lock`** but **`send_started_at`** is null.  
- **409** `RECONCILE_CONFLICT` — row changed between read and update; refresh and retry.  
- **404** — outreach missing or **`lead_id`** mismatch.

Successful actions are logged server-side with operator username (`console.info`).

### UI

Internal **`/lead-engine/`**: **Needs attention** filter (**`needsAttention=send`**); list **Outreach** column shows recovery hints from **`outreach.send_recovery`**. History lists **Mark sent**, **Release lock** (when locked), and **Mark failed (cancel row)** for **`approved`** outreach. List view treats a **stale** lock (~**16 min** client-side) as non-blocking for **Send** so it aligns with the server’s stale-claim behavior.

## UI: draft review queue + latest draft clarity (Slice Q)

Internal `/lead-engine/` adds a focused review workflow without new endpoints:

- **Review queue filter** (`reviewQueue`) options in UI:
  - `needs_review` (latest outreach row is `draft`)
  - `has_draft` (any draft exists)
  - `latest_draft`
  - `latest_approved`
  - `multiple_drafts` (more than one draft row exists)
- **Latest draft visibility** in Outreach column now shows:
  - latest draft subject
  - compact body preview
  - created timestamp
  - current row status
  - explicit draft version count, including a warning when multiple drafts exist
- **Approval speed-up / safety**:
  - `Approve latest draft` appears only when latest outreach row is the latest draft row
  - if a newer non-draft row exists, approval is blocked with an explicit message to open History
  - blocker context remains visible for missing `contact_email`, lead opt-out, global suppression, and already-sent state

## UI: draft version ergonomics (Slice R)

History/review now emphasizes version comparison for multi-draft leads:

- Outreach history marks:
  - `latest row`
  - `latest draft`
  - `latest approved`
- Each outreach row shows subject + created time + compact body preview.
- Draft rows include quick actions:
  - `Approve latest` (only when that draft is also the latest outreach row)
  - `Regenerate latest draft`
  - `Copy body`
- List actions add a `Review latest` fast path that opens History directly for that lead.

This keeps approval single-lead and preserves stale-version protection (older drafts cannot be approved via the fast action when a newer outreach row exists).

---

## API: CRM sync — `lead-engine-sync-crm` (Slice K)

**Methods:** `POST`, `OPTIONS`  
**Auth:** Valid operator session cookie.

### Environment

| Variable | Purpose |
|----------|---------|
| `HUBSPOT_PRIVATE_APP_TOKEN` | Required. Private app token for HubSpot CRM Contacts API. |

### Request body (JSON)

| Field | Required | Notes |
|-------|----------|--------|
| `leadId` | Yes | UUID of `lead_engine_leads` row. |

### Minimum required data

- Lead exists.
- `contact_email` is present and valid (HubSpot sync target key).

### Mapped CRM fields (HubSpot contact)

- `email` ← `lead_engine_leads.contact_email`
- `company` ← `lead_engine_leads.company_name`
- `website` ← `lead_engine_leads.website_url`
- `lifecyclestage` ← `"lead"`
- `description` ← compact text built from lead + preferred audit summary + latest AI score for that audit + latest outreach summary

No large raw `signals` JSON is pushed.

### Behavior

- If `lead_engine_leads.external_crm_id` exists, updates that contact.
- Otherwise searches HubSpot by email; updates if found, else creates a new contact.
- Preferred analysis + latest AI-for-analysis selection is shared with list via `lead-engine-canonical-select.js`.
- Persists lead sync fields on success:
  - `external_crm_id` (also mirrors into legacy `external_id`)
  - `crm_source = hubspot`
  - `sync_status = synced`
  - `last_synced_at`
  - `sync_error = null`
- On CRM failure, persists:
  - `crm_source = hubspot`
  - `sync_status = failed`
  - `last_synced_at`
  - `sync_error` (trimmed message)

### Responses

- **200** success:
  - `{ success, leadId, crmSource: "hubspot", syncStatus: "synced", externalCrmId, action: "created"|"updated", lastSyncedAt }`
- **409** `MISSING_CONTACT_EMAIL`
- **502** `CRM_SYNC_FAILED` for HubSpot API errors
- **503** when token/config is missing

### UI

- Internal list view adds a **Sync CRM** button per lead.
- UI surfaces sync badge/status (`not synced`, `synced`, `sync failed`) and last sync time.

---

## API: unsubscribe — `lead-engine-unsubscribe` (Slice F + J)

**Methods:** `GET`, `OPTIONS`  
**Auth:** **None** (token is the credential). **Does not** check `LEAD_ENGINE_ENABLED` so opt-out remains usable independently.

### Query

| Param | Required |
|-------|----------|
| `token` | Yes — must match **`lead_engine_leads.outreach_unsubscribe_token`**. |

### Behavior

- Sets **`email_opted_out = true`** and **`updated_at`** on the lead.  
- If `contact_email` exists, normalizes (`trim` + lowercase) and **upserts** `lead_engine_email_suppressions` (`suppression_source=unsubscribe_link`, reason `recipient_unsubscribe`, actor `public_unsubscribe`).  
- If `contact_email` is missing, only lead-level opt-out is set (global suppression cannot be created in this case).  
- **Idempotent:** repeated clicks keep returning success pages and preserve suppression state.  
- **`lead-engine-send`** returns **409** for either lead-level opt-out or global suppression.
- Returns simple **HTML** pages (200/400/404/500), `Cache-Control: no-store`.

---

## Status transitions (`lead_engine_outreach`)

```
draft  ──approve──►  approved  ──send──►  sent   (terminal; second send → **200** idempotent replay, not a second email)
```

- **`cancelled`** exists in the DB check constraint but is not assigned by Slice F.
- **Slice I:** **`approved` → `sent`** can also be applied via **`lead-engine-reconcile`** (`mark_sent`) when operators align the DB with Resend after a partial failure.

---

## Other functions

| Function | Methods | Behavior |
|----------|---------|----------|
| `lead-engine-auth` | POST, DELETE, OPTIONS | Operator login / logout (`lead_engine_session` cookie). |
| `lead-engine-status` | GET, OPTIONS | **200** when enabled, configured, and authenticated; includes `openaiAllowed`. |
| `lead-engine-batch-analyze` | POST, OPTIONS | Batch analyze for selected leads (max 20), sequential processing, per-row `succeeded`/`skipped`/`failed`. |
| `lead-engine-batch-score` | POST, OPTIONS | Batch score for selected leads (max 20), same OpenAI gating as score endpoint, per-row outcomes/codes. |
| `lead-engine-batch-draft` | POST, OPTIONS | Batch draft generation for selected leads (max 20, `channel=email`), per-row outcomes with `outreachId` on success. |
| `lead-engine-draft` | POST, OPTIONS | AI email draft generation; requires successful audit + `lead_engine_ai_scores` row; **insert-only** outreach rows. |
| `lead-engine-approve` | POST, OPTIONS | Operator approves a **draft** outreach row (`approved_by`, `updated_at`). |
| `lead-engine-send` | POST, OPTIONS | Sends **one** approved email via Resend; claim + idempotent replay; **409** if in progress / opted out / globally suppressed; **RECONCILE_REQUIRED** if Resend OK but DB finalize fails. |
| `lead-engine-sync-crm` | POST, OPTIONS | Manual one-way sync of a lead into HubSpot contact; persists sync fields and errors on the lead row. |
| `lead-engine-reconcile` | POST, OPTIONS | Operator **`mark_sent`** / **`release_send_lock`** (Slice I recovery; no CRM). |
| `lead-engine-unsubscribe` | GET, OPTIONS | Public one-click lead opt-out; also ensures global suppression for normalized `contact_email` when available. |
| `lead-engine-lead-detail` | GET, OPTIONS | Per-lead audit / AI score / outreach history (compact). |

---

## Example `curl` (cookie jar)

Replace origin, username, and password.

```bash
ORIGIN="https://www.jlsolutions.io"
COOKIE_JAR="le.jar"

curl -sS -c "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"your_operator","password":"your_password"}'

curl -sS -b "$COOKIE_JAR" "$ORIGIN/.netlify/functions/lead-engine-status"

curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Example Co",
    "website_url": "https://example.com",
    "contact_email": "ops@example.com",
    "source": "manual",
    "idempotency_key": "optional-stable-key"
  }'

curl -sS -b "$COOKIE_JAR" "$ORIGIN/.netlify/functions/lead-engine-list?page=1&pageSize=10&status=new&search=example&includeLatestAnalysis=1&includeLatestOutreach=1"

curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-analyze" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"550e8400-e29b-41d4-a716-446655440000"}'

# After a successful audit, with LEAD_ENGINE_ALLOW_OPENAI=true and OPENAI_API_KEY set:
curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-score" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"550e8400-e29b-41d4-a716-446655440000"}'

# Batch analyze/score (max 20 leadIds):
curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-batch-analyze" \
  -H "Content-Type: application/json" \
  -d '{"leadIds":["550e8400-e29b-41d4-a716-446655440000"]}'

curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-batch-score" \
  -H "Content-Type: application/json" \
  -d '{"leadIds":["550e8400-e29b-41d4-a716-446655440000"]}'

curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-batch-draft" \
  -H "Content-Type: application/json" \
  -d '{"leadIds":["550e8400-e29b-41d4-a716-446655440000"],"channel":"email"}'

# After score, with the same OpenAI gating:
curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-draft" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"550e8400-e29b-41d4-a716-446655440000","channel":"email"}'

# After draft + contact_email on lead, with RESEND_API_KEY and public URL for unsubscribe:
curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-approve" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"550e8400-e29b-41d4-a716-446655440000"}'

curl -sS -b "$COOKIE_JAR" -X POST "$ORIGIN/.netlify/functions/lead-engine-send" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"550e8400-e29b-41d4-a716-446655440000"}'
```

---

## Ingest sources (roadmap)

- **Slice B:** `manual` only (enforced in API + validation).
- **Later:** Webhook/CRM ingest using `idempotency_key`, `external_id`, `crm_source`, `sync_status`, etc.

## Local development

1. Set env vars for `netlify dev` (`LEAD_ENGINE_*`, `SUPABASE_*`).
2. Run `npm run dev`.
3. Open `/lead-engine/login.html`, sign in, then `/lead-engine/`.

## Tests

```bash
npm test
```

Runs `node --test` on `netlify/functions/lib/*.test.js`. Slice H adds focused tests for **`lead-engine-analysis-pick`** (preferred / successful-row picks and scoring resolution) and **`lead-engine-send-state`** (stale claim threshold and **`classifyOutreachSendReadiness`**). Slice I extends **`lead-engine-outreach-actions-validate.test.js`** with **`validateReconcileBody`** cases. Send recovery adds **`lead-engine-send-recovery.test.js`** and list-param tests for **`needsAttention`**. Slice J adds tests for **`normalizeEmailForSuppression`**, global suppression helpers, `suppressed` list param parsing, and send-block classification for global suppression.
Slice K adds tests for CRM sync validation (`lead-engine-crm-sync-validate.test.js`) and HubSpot payload mapping (`lead-engine-crm-hubspot.test.js`).

## Known limitations

- **Pagination in the UI** is fixed to page 1 / pageSize 25 (filters refresh that page only).
- **Search** strips characters that break PostgREST `or=(...)` filters (e.g. commas → space).
- **Concurrent creates** without `idempotency_key` can still create two rows if two requests race (dedupe is best-effort).
- **List `total`** uses Supabase `count: 'exact'`.
- **Analyze** is not a crawler: only homepage + up to two same-origin “key” pages from homepage links.
- **Signals** are heuristics only (regex/keyword/HTML structure); false positives/negatives are expected.
- **SPAs** may return shell HTML with little content; signals reflect what the server returns (no headless browser).
- **International** sites and non-English CTAs may be under-detected.
- **Scoring (Slice D + H + L):** uses OpenAI; costs/tokens apply. **`fit_score` must be an integer 0–100** in model output or the request fails validation. Model JSON must match the schema exactly (canonical offer strings). **Scoring truth is `lead_engine_ai_scores`**, linked to the audit via `analysis_id`, so deterministic **`signals`** are not overwritten. **List** uses **`pickPreferredAnalysisRow`** (newest successful audit for display; fallback to newest row if all failed). **Score/draft** use **`pickNewestSuccessfulAnalysisRow`**. Scoring display uses **`resolveCanonicalScoringPayloadForPreferredAnalysis`** first, then temporary compatibility fallback **`resolveScoringPayloadWithLegacyCompat`** for pre-AI historical rows (`source: legacy_analysis_row`).
- **Drafts (Slice E):** another OpenAI call per generation; **insert-only** rows in `lead_engine_outreach`. Re-generating adds a new row; use **`outreach.latest_draft` / `latest_approved` / `latest_sent`** in list responses to see which row is which.  
- **Approve / send / recovery (Slice F + H + I + J):** **no bulk**, **no sequences**. **Sent** rows get **200** idempotent replay (no duplicate email). **Concurrent** sends on the same outreach → **409** `SEND_IN_PROGRESS` until stale lock (~**15 min**) expires. Requires **`RESEND_API_KEY`**, migration **`send_started_at`**, migration **`lead_engine_email_suppressions`**, a resolvable **public origin** for the unsubscribe URL, and a valid **`contact_email`**. Send is blocked by either **`email_opted_out`** (lead) or global suppression by normalized email. Normalization is conservative (`trim` + lowercase only; no provider-specific alias handling). **Remaining risk:** Resend and Supabase are not one transaction — use **`RECONCILE_REQUIRED`** + **`lead-engine-reconcile`** (or Resend + Supabase manually) when finalize fails after delivery. **`release_send_lock`** is dangerous if mail was already delivered.  
- **CRM sync (Slice K):** Manual-only trigger (`lead-engine-sync-crm` / Sync CRM button). One-way only (lead engine -> HubSpot contact). No bulk sync, no auto-sync, no pull-back from CRM. Mapping is intentionally compact and only targets standard HubSpot contact fields. Requires valid `contact_email` and `HUBSPOT_PRIVATE_APP_TOKEN`.
- **CSV import (Slice M):** Strict-header CSV only (no dynamic column mapping UI in this slice). Preview/commit is synchronous and request-sized (no background job). Commit revalidates/rechecks dedupe before insert; very large files should be split into smaller batches.
- **Chunked batch UI (Slice O + P):** Progress and retry are client-driven in one browser session (in-memory state only). Reloading the page clears in-progress stats and retry sets. Supports batch analyze, score, and draft; still no batch approve/send.
- **Combined `draft_body`:** first-touch + optional follow-up in one field is acceptable for now; a future version may split rows or add `sequence_step` (see product notes).  
- **Slice G UI:** Internal HTML only; no SPA framework. **History** loads **`lead-engine-lead-detail`** per lead. List **summary** and **pipeline** metrics are best-effort: standard list path skips rich **`pipeline`** when more than **500** leads match (see `pipelineNote`). **`outreachStatus` / `recommendedOffer`** use ID pre-lists capped at **2500** unique leads. Search on the pre-filter path uses **substring** match on company/URL in memory (same intent as SQL `ilike`). **Charts** not added.

## Dependency: `node-html-parser` (Slice C)

**Why:** Reliable parsing of titles, meta tags, forms, and anchor `href`s is impractical with regex alone. One small dependency keeps extraction deterministic and testable. It is used **only** in Netlify Functions, not in static `lead-engine/*.html` pages.
