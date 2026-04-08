# Second lead source (proposal only — not implemented)

Goal: diversify beyond **Google Places** text search while fitting the existing **Scout → (enrichment) → Qualifier → pipeline** model.

## Recommended second source: **Google Business Profile / Maps lead-style APIs (owned first-party)**

If the product already uses Google for discovery, the lowest-friction *second* channel is often **your own** GBP assets (if applicable): posts, Q&A, or **callback/lead forms** surfaced as a distinct `source_key` (e.g. `gbp_webhook` or `manual_gbp_import`).  

For many SMB GTM stacks, however, the more realistic “second source” is below.

## Best general-purpose second source: **Licensed B2B contact / firmographic data (e.g. Clearbit-class, ZoomInfo-class, or vertical data vendors)**

| Dimension | Assessment |
|-----------|------------|
| **ROI** | High when ICP is narrow: pay per record or seat, predictable CPL vs open-ended Places search. Best when you already know geo + industry filters. |
| **Implementation risk** | Medium: contracts, API keys, rate limits, dedupe vs existing `website_url` / `source_place_id`, and mapping vendor payloads into `lead_engine_prospects` / `lead_engine_leads`. |
| **Data quality** | Strong emails/titles for outbound; weaker on “live intent” than search. Needs ongoing **bounce/complaint** handling and suppression alignment. |
| **Compliance** | **Critical**: vendor DPA, lawful basis for processing, region-specific rules (GDPR/CCPA), opt-out and **do-not-contact** alignment with your outreach policy. |
| **Fit with Scout/Qualifier/Enrichment** | Treat vendor ingest as another **Scout adapter** that emits the same prospect shape (`company_name`, `website_url`, `raw_payload`). **Enrichment** becomes “fill gaps” (validate domain, classify web presence). **Qualifier** unchanged if prospects land in `raw` with a usable URL. |

### Alternatives (when to pick them)

- **LinkedIn Sales Navigator exports / workflow tools** — good for role-based outreach; **higher compliance and ToS risk** if automated scraping; prefer official APIs/partners.
- **Industry directories / associations** — excellent for vertical GTM; implementation is often **CSV or scrape + normalize** rather than a polished API.
- **Website intent (e.g. Clearbit Reveal, 6sense)** — high signal for *existing* traffic; different shape (often account-level); fits later as an **event stream** into leads rather than classic Scout.

## Recommendation summary

For **breadth + manageable engineering** after Places: **licensed B2B data API** with strict dedupe and compliance review, implemented as a **new `source_key`** Scout path that writes the same prospect/lead model.

## What the system still needs before minimal supervision (trust)

- **Volume-weighted quality metrics** tied to **source and query** (this phase starts that via feedback events).
- **Automatic pause** when good/bad or duplicate/junk rates exceed thresholds (today: partial for scout queries, not yet for leads).
- **Bounce / reply / meeting outcomes** looped back (not only operator labels).
- **Queue-backed runtime** and **quota envelopes** per source (see `docs/lead-engine-scout-scale-readiness.md`).
