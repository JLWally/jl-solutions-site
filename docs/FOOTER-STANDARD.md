# Footer & header standardization – JL Solutions

## Canonical source of truth

Use the shared partials:

- `partials/header.html`
- `partials/footer.html`

Injected via `js/main.js` into `#header` / `#footer` when those slots exist. Marketing pages may also inline the same markup (root-relative paths).

## Header

- Nav: Home · Live demo · About · Services · Case Studies · Resources (Templates & Guides / Blogs) · Contact
- Primary CTA: **Start a Project** → `/book-consultation.html` (get-started wizard temporarily offline)

## Footer (`footer-home`)

- Tagline: “Automation and smart systems for growing businesses.”
- Quick Links: Live demo · About · Services · Case Studies · Resources
- Get in Touch: email · **Start a Project** → `/book-consultation.html` · secondary **Talk It Through First** → `/book-consultation.html`
- Social: SMS · Facebook · Instagram
- Copyright: © 2026 JL Solutions. All rights reserved.

## Keeping pages in sync

```bash
node scripts/sync-header-footer.js
```

Re-run after editing the partials to refresh inline marketing headers/footers.

## Intentionally different chrome

Leave alone unless explicitly redesigning:

- Funnel: `get-started.html`, `onboarding/*`
- Apps: `lead-engine/*`, `referral/*`, `referral-dashboard/*`, `internal-pay/*`, `demo-builder.html`
- Sales tooling: `sales/*`
