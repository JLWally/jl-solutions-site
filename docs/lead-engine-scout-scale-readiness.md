# Lead engine scout & automation — scale readiness (post-MVP)

This document lists what still needs to change before the current Netlify + Supabase automation can sustain **true 24/7 lead generation** at higher volume and cost predictability.

## Google Places quotas and cost controls

- **Quota model**: Text Search + Place Details consume billable units; burst traffic from multiple queries or tight schedules can exhaust daily/monthly caps or spike cost.
- **Current mitigations**: Per-tick detail caps (`global_budgets`, `max_details_per_run`, `automation-policy-v1.json` `scout_max_detail_calls_per_tick`), duplicate-ratio pagination abort, per-query **daily detail budget** and **auto-pause** (`scout_query_guardrails`), operational pause in UI/API.
- **Still needed**: Hard **billing alerts** in GCP; optional **per-query monthly cap**; structured logging of **Places status** (`REQUEST_DENIED`, `OVER_QUERY_LIMIT`) into a metric; consider **Places API (New)** pricing/features if migrating.

## Pagination strategy

- **Today**: `next_page_token` stored per query in `lead_engine_scout_query_state`; pagination can abort when duplicate ratio is high.
- **Still needed**: Explicit **coverage targets** (e.g. exhaust N pages per query per day); **rotation** between “deepen one query” vs “broaden many queries”; handling **stale tokens** and **ZERO_RESULTS** without burning the cooldown forever.

## Source diversification

- **Today**: Primary path is **Google Places** text search + details; MVP JSON scout remains as fallback.
- **Still needed**: Additional **source adapters** (e.g. industry directories, licensed data, CRM imports) with a **unified prospect model** and **per-source budgets** so one API cannot starve others.

## Background worker / runtime strategy

- **Today**: **Netlify scheduled functions** with **idempotent** `lead_engine_worker_runs`; split **scout-only** vs **downstream** ticks to reduce long single invocations.
- **Limits**: Serverless **timeouts**, **cold starts**, and **no long-running queue consumers**; enrichment and scout are still bound to a single function invocation.
- **Still needed**: A **durable queue** (SQS, Cloud Tasks, Supabase + edge worker, etc.) with **visibility timeouts**, **dead-letter** handling, and **horizontal workers** for Places detail fan-out and third-party enrichment.

## Enrichment provider strategy

- **Today**: “Enrichment” for branch prospects is **Places Details re-fetch** + re-classification (`no_website`, `weak_web_presence`, `alternate_enrichment_needed`); promotion to `raw` only when a **usable website** appears.
- **Still needed**: Integrations for **website discovery** (e.g. Clearbit-style, custom scrapers, or manual review queues with SLA), **rate limits**, and **PII/compliance** review before automated outreach.

---

**Largest practical blocker for uninterrupted 24/7 lead gen**: combining **Places quota/cost ceilings** with a **durable, queue-backed runtime** that can absorb backpressure, retries, and multi-source ingestion without hitting serverless time limits or silently starving downstream phases.
