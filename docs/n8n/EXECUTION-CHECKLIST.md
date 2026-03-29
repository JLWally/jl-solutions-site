# V1 execution validation (outside the repo)

The repo cannot set Netlify secrets or run migrations in your Supabase project. Follow this **order**: wire env → migrate → redeploy → **manual** one-lead smoke → n8n Workflow A.

## Current UI signals (what you should see)

- **`openaiAllowed: false`** in the status JSON (`lead-engine-status`) means **`LEAD_ENGINE_ALLOW_OPENAI`** is unset or not truthy. Score and draft require **`LEAD_ENGINE_ALLOW_OPENAI=true`** plus **`OPENAI_API_KEY`**.
- **Leads / activity fail** until **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** are set on Netlify and the deploy is live; functions return *Database not configured…* until then.
- **Auth working** only proves **`LEAD_ENGINE_*`** auth envs are set; it does not prove Supabase or OpenAI.

---

## 1. Netlify environment variables

Set in the site **Environment variables** (then **trigger a new deploy** so functions pick them up).

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Required for list, ingest, analyze, activity, etc. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required by serverless functions that talk to Supabase. |
| `GOOGLE_PAGESPEED_API_KEY` | PSI during analyze (omit or leave empty to skip PSI; lead row PSI columns stay unset). |
| `LEAD_ENGINE_PSI_EXTENDED` | `false` or unset for V1 (**homepage-only** PSI, `signals.psi.psi_mode=home_only`). |
| `OPENAI_API_KEY` | Required for score + draft. |
| `LEAD_ENGINE_ALLOW_OPENAI` | Set **`true`** so the ops panel shows **`openaiAllowed: true`** and score/draft are allowed. |
| HubSpot | Only if testing **`lead-engine-sync-crm`** (`HUBSPOT_PRIVATE_APP_TOKEN`, etc.). |
| `LEAD_ENGINE_PHYSICAL_ADDRESS` | **Do not set** (or leave empty) until you have a **valid commercial mailing address** for the CAN-SPAM footer. Production **send** stays blocked until set; internal review and drafts do not need it. |

Also ensure existing lead-engine auth vars remain set: **`LEAD_ENGINE_ENABLED`**, **`LEAD_ENGINE_SECRET`**, **`LEAD_ENGINE_OPERATORS`**.

---

## 2. Supabase — schema (fastest path for V1)

**Fastest (copy/paste):** open **`supabase/V1_REVENUE_SETUP.sql`** in this repo, copy the entire file into **Supabase → SQL Editor → New query → Run**. It creates **`consultations`** (form mirror) and all **`lead_engine_*`** tables.

**CLI alternative:** `supabase link` then `supabase db push`, or run migrations under `supabase/migrations/` in filename order.

### Verify schema

**Extended columns** (examples):

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lead_engine_leads'
  AND column_name IN (
    'niche', 'city', 'state', 'source_place_id',
    'page_speed_score', 'performance_score', 'accessibility_score',
    'best_practices_score', 'seo_score', 'accessibility_flags',
    'lead_score', 'pain_points', 'outreach_angle',
    'first_email_subject', 'first_email_draft', 'linkedin_dm_draft',
    'audited_at'
  )
ORDER BY column_name;
```

**Partial unique index** on `source_place_id` (for n8n upserts):

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'lead_engine_leads'
  AND indexname = 'idx_lead_engine_leads_source_place_id_unique';
```

---

## 3. Re-deploy and verify the ops panel

1. Confirm a **new deploy** completed after env changes.
2. Open **`/lead-engine/`**, sign in, and check **`lead-engine-status`** (shown in the page as JSON): **`openaiAllowed: true`** when `LEAD_ENGINE_ALLOW_OPENAI=true`.
3. Reload **leads** and **activity** — they should load without *Database not configured* errors. If list still errors, confirm `SUPABASE_*` on the **same** site that serves the UI and that the deploy finished.

---

## 4. Manual smoke test (one lead) — before n8n

Do this in the UI (or equivalent API calls).

| Step | Action | Verify |
|------|--------|--------|
| Add | Create one lead with a real **`website_url`**. | Row exists in `lead_engine_leads`. |
| Analyze | Run analyze. | **`audited_at`** set; latest **`lead_engine_analysis.signals.psi.psi_mode`** is **`home_only`** when `LEAD_ENGINE_PSI_EXTENDED` is off and PSI ran. |
| PSI columns | (If `GOOGLE_PAGESPEED_API_KEY` set) | **`page_speed_score`**, **`performance_score`**, **`accessibility_score`**, **`best_practices_score`**, **`seo_score`**, **`accessibility_flags`** populated on the lead (or check `signals.psi` in SQL). |
| Score | Run score. | **`lead_score`**, **`pain_points`**, **`outreach_angle`** on lead row. |
| Draft | Run draft. | **`first_email_subject`**, **`first_email_draft`**; **`linkedin_dm_draft`** if the model returns it (optional field). |

Quick SQL for the latest analysis PSI mode:

```sql
SELECT signals->'psi'->>'psi_mode' AS psi_mode,
       signals->'psi'->'primary_scores' AS primary_scores
FROM lead_engine_analysis
WHERE lead_id = '<lead-uuid>'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 5. n8n Workflow A (after manual smoke passes)

Only after step 4 succeeds:

1. Build/import the flow in [WORKFLOW-A.md](./WORKFLOW-A.md).
2. One niche + one city, **20–30** leads max.
3. Upsert to `lead_engine_leads`, then **`lead-engine-pipeline-run`** per lead (or analyze → score → draft). **Do not** call **`lead-engine-send`** for automation.

---

## PSI and timeouts

- Default **homepage-only** PSI (`LEAD_ENGINE_PSI_EXTENDED` unset/false) minimizes function runtime.
- After stable batches, set **`LEAD_ENGINE_PSI_EXTENDED=true`** and re-analyze a sample lead to fill **`psi_mode: extended`** and extra pages in `signals.psi.pages`.

---

## Production outreach

Keep **`LEAD_ENGINE_PHYSICAL_ADDRESS`** unset until you have a proper **business** postal address for the email footer (not a residential address if that does not meet your compliance policy). Until then, **`lead-engine-send`** returns **503** `MAILING_ADDRESS_REQUIRED`.
