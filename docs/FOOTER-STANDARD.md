# Footer standardization – JL Solutions

## Reference: homepage footer

The **preferred footer** sitewide is the full **footer-home** pattern used on the homepage (`index.html`):

- **Classes:** `jl-theme footer-home` (+ optional `mt-5`, `no-print`)
- **Structure:**
  - **Column 1 (footer__brand):** JL Solutions, tagline “Automate, Streamline, Grow Your Business.”
  - **Column 2 (Quick Links):** Services, Case Studies, Resources, **Book a Free Call**, Contact
  - **Column 3 (footer__contact):** **Get in Touch**, email link, **Book a Free Call** CTA button, social icons
  - **Divider:** `footer__divider` (hr)
  - **Copy:** “© 2026 JL Solutions. All rights reserved.” in `footer__copy`

All styling lives in `css/theme-jl.css` (`.footer-home`, `.footer__*`). Pages using this footer must load `theme-jl.css`.

## Where the full footer is used

- **Partial (injected):** `partials/footer.html` – full footer-home markup; injected into any page that has `#footer` and loads `main.js` (e.g. Contact, resources.html, services/automation.html).
- **Inline full footer:** Homepage, About, FAQ, Book Consultation, Services index, Case Studies index, Resources index, Insights index, all four case study detail pages, Tools ROI calculator, Dashboard, Onboard, Fix My App, Automation & AI service, Eligibility Wizard, Process Documentation Template (resources), Insights good-enough-blog, and any other page updated in the footer standardization pass.

## CTA and copy consistency

- **Quick Links:** “Book a Free Call” (not “Free Consultation”, “Book Consultation”, or “Schedule a 15-Minute Demo”).
- **Third column heading:** “Get in Touch” (not “Connect With Us”).
- **Copyright:** “© 2026 JL Solutions. All rights reserved.” (not “Built with purpose” or page-specific taglines).

## Where a simplified footer is still used

The following pages still use a **minimal footer** (`bg-dark` + single-line copyright or short link row). They are acceptable for now but can be switched to the full footer-home for full consistency:

- **Sales / funnel:** `sales.html`, `sales/index.html`, `sales/funnel/index.html`, `sales/landing/*.html` (ai, automation, documents, operations, govcon)
- **Insights (articles):** `insights/getting-started-ai-automation.html`, `insights/weekend-reset-busy-businesses.html`, `insights/measuring-roi-automation.html`, `insights/fix-my-app-smartest-investment.html`
- **Services:** `services/operations-optimization.html`, `services/document-extraction.html`, `services/document-extraction-demo.html`, `services/ai-intake-form.html`
- **Resources:** `resources/process-documentation-template.html` (standalone), `resources/automation-checklist.html`

To align them: replace the minimal footer block with the same HTML as in `partials/footer.html` (using root-relative paths), add `theme-jl.css` if missing, and use the same CTA/copy as above.

## Special cases

- **services/automation.html:** Uses `#footer` (partial). The `<footer>` inside a testimonial quote is content, not the site footer.
- **Print:** Resource/template pages that hide the footer when printing use `no-print` on the footer element (e.g. process-documentation-template).
