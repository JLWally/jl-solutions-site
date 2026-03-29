# Workflow A — Google Places discovery → Supabase → lead-engine pipeline

For applying migrations, Netlify env, and a full validation pass, see [EXECUTION-CHECKLIST.md](./EXECUTION-CHECKLIST.md).

This workflow runs **outside** the repo in [n8n](https://n8n.io/). It does **not** scrape Facebook, Instagram, LinkedIn, or Google Maps HTML; it uses **Google Places API** only, then stores URLs from Places / your normalization step.

## Prerequisites

- **Google Cloud**: Places API (Text Search + Place Details) enabled; billing as required by Google.
- **PageSpeed Insights API** is used by **lead-engine** during analyze (`GOOGLE_PAGESPEED_API_KEY`; homepage-only by default; set `LEAD_ENGINE_PSI_EXTENDED=true` on Netlify for contact + service URLs after stable runs), not by n8n.
- **Supabase**: `SUPABASE_URL` + **service role** key for REST upserts (server-side only).
- **Netlify**: Site URL reachable from n8n; operator session cookie **or** a dedicated server-to-server auth pattern for your environment (see below).

## Environment variables (n8n credentials)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_PLACES_API_KEY` | Places Text Search + Place Details |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (bypasses RLS) |
| `NETLIFY_SITE_URL` | e.g. `https://your-site.netlify.app` |
| `LEAD_ENGINE_SESSION_COOKIE` | Optional: raw `Cookie` header value for `lead_engine_session` if you call functions as the operator |

**Auth note:** `lead-engine-analyze`, `lead-engine-score`, `lead-engine-draft`, and `lead-engine-pipeline-run` expect an **operator session cookie** (`guardLeadEngineRequest`). For automation you can:

1. Use n8n **HTTP Request** with a static Cookie header from a long-lived dev session (acceptable for internal V1), or  
2. Add a small **API key gate** later (not in this slice).

## Recommended batch size

- **20–30** leads per run (your V1 cap).

## Upsert into `lead_engine_leads`

Use Supabase REST:

- `POST` or `PATCH` to  
  `{{SUPABASE_URL}}/rest/v1/lead_engine_leads`
- Headers:  
  `apikey: {{service_role}}`  
  `Authorization: Bearer {{service_role}}`  
  `Content-Type: application/json`  
  `Prefer: resolution=merge-duplicates,return=representation`

**Conflict target:** after migration `20250403120000_lead_engine_source_place_id_unique.sql`, you can upsert on `source_place_id` when present:

```http
Prefer: resolution=merge-duplicates,on_conflict=source_place_id
```

**Required columns for existing app code:**

- `company_name` — use business title from Places (required NOT NULL in DB).
- `website_url` — **required** NOT NULL; **skip** candidates with no website.
- `source` — e.g. `google_places`.

**Optional extended fields** (your schema):  
`business_name`, `phone`, `email`, `niche`, `city`, `state`, `source_place_id`, `facebook_url`, `instagram_url`, `website` (mirror of URL if you want).

## Deduplication (Code node, JavaScript sketch)

1. Normalize **domain** from `website` / `website_url` (lowercase host, strip `www.`).
2. First pass: keep first row per domain.
3. Second pass: normalize phone to digits (US) — keep first per phone.
4. Third pass: key `lowercase(business_name)|lowercase(city)` — keep first.

Cap array length at **30** before insert.

## Trigger lead-engine after each insert

### Option A — One HTTP node per step

For each new `leadId`:

1. `POST {{NETLIFY_SITE_URL}}/.netlify/functions/lead-engine-analyze`  
   Body: `{ "leadId": "<uuid>" }`  
   Header: `Cookie: <operator session>`  
   `Content-Type: application/json`

2. If analyze returns `success: true` and OpenAI is enabled:

   `POST .../lead-engine-score`  
   Body: `{ "leadId": "<uuid>" }`

3. If score returns 200:

   `POST .../lead-engine-draft`  
   Body: `{ "leadId": "<uuid>", "channel": "email" }`

### Option B — Single pipeline call

`POST {{NETLIFY_SITE_URL}}/.netlify/functions/lead-engine-pipeline-run`  
Body: `{ "leadId": "<uuid>" }`  
Same Cookie header.

This runs **analyze → score → draft** in one function (no email send).

## Places API references (implementation detail)

- **Text Search:**  
  `https://maps.googleapis.com/maps/api/place/textsearch/json?query=<encoded>&key=...`
- **Place Details** (for `website`, `formatted_phone_number`, etc.):  
  `https://maps.googleapis.com/maps/api/place/details/json?place_id=...&fields=name,website,formatted_phone_number,international_phone_number,place_id,formatted_address&key=...`

Parse `formatted_address` or use separate geocoding if you need clean `city` / `state`.

## Compliance

- Do **not** automate email sends from n8n.
- Production **Send** in lead-engine remains blocked until `LEAD_ENGINE_PHYSICAL_ADDRESS` is set (see `lead-engine-send`).
