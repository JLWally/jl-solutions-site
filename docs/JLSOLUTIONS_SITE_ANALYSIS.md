# Analysis: GitHub jl-solutions-site vs Local Work

## 1. GitHub repo: [JLWally/jl-solutions-site](https://github.com/JLWally/jl-solutions-site)

| Aspect | Details |
|--------|---------|
| **Stack** | Static HTML, CSS, JavaScript (no framework) |
| **Live site** | https://www.jlsolutions.io |
| **Deploy** | Netlify (auto-deploy on push to `main`) |
| **Content** | Main site (Home, About, Services, Contact), **JL Solutions Academy** (learning platform), case-studies, faq, insights, resources, tools |
| **Structure** | `index.html`, `about.html`, `book-consultation.html`, `dashboard.html`, `academy/`, `services/`, `css/`, `js/`, `assets/`, `netlify/` |
| **Notable** | Academy (beginner course, modules, progress, timer, snippets, mentorship), chatbot, many deployment/docs .md files, 71 commits |

---

## 2. Local work (this repo: TrailCrafter)

### Branch: **main** (current workspace)
- **Stack:** Next.js 14, React, TypeScript, Prisma, Stripe, Tailwind
- **App:** **TrailCrafter** — AI trail design (create, trails, dashboard, generate-trail, chat, etc.)
- **Also has:** Subscribe/checkout, basic JL Solutions-style homepage copy
- **No:** portal, leads, Academy, or the static site pages

### Branch: **jl-solutions-site**
- **Stack:** Same Next.js/React/Prisma/Stripe/Tailwind (no TrailCrafter app)
- **Content:** JL Solutions–focused:
  - About JL Solutions hero (operations optimization, AI, automation)
  - Sales funnel (Discover → Explore → Get started) + Portal, Services, Free consultation
  - Portal: leads, referral (45% commission), get-started, services, onboarding, eligibility
  - Lead capture + AI summaries, Footer © 2026
  - Services: Fix, Manage, Create, AI automation, Free consultation (Stripe/Calendly)
- **No:** Academy, case-studies, faq, insights, resources, tools, or any of the static HTML pages from the GitHub site

---

## 3. Comparison summary

| | GitHub jl-solutions-site | Local branch `jl-solutions-site` |
|--|---------------------------|----------------------------------|
| **Tech** | Static HTML/CSS/JS | Next.js (React) app |
| **Home** | index.html (main marketing + Academy) | About JL Solutions + funnel + services grid |
| **Academy** | ✅ Full (courses, modules, progress, timer, etc.) | ❌ Not present |
| **Portal** | ❌ Not in described structure | ✅ Leads, referral, services, onboarding |
| **Leads / consultation** | book-consultation.html (static) | ✅ Lead capture API, AI summaries, Calendly |
| **Payments** | Not in description | Stripe (checkout, webhooks, partners) |
| **Deploy** | Netlify (static) | Would need Node/Next.js build (e.g. Netlify or Vercel) |

They are **different codebases**. The GitHub repo is the current live jlsolutions.io (static + Academy). The local `jl-solutions-site` branch is a separate Next.js app (portal, leads, payments, no Academy).

---

## 4. Important: pushing local `jl-solutions-site` to GitHub

If you run:

```bash
git remote add jlsolutions https://github.com/JLWally/jl-solutions-site.git
git push jlsolutions jl-solutions-site:main
```

then **the current content of the GitHub jl-solutions-site repo (including the Academy and static site) would be replaced** by the Next.js app. The existing live site and Academy would no longer be in that repo.

---

## 5. Recommended options (choose one path)

1. **Do not overwrite `main`**  
   Push the Next.js version to a **different branch** on jl-solutions-site (e.g. `next-app` or `portal-leads`), then decide later whether to replace the static site or run both (e.g. subpaths or separate domains).

2. **Keep both codebases**  
   - Leave [jl-solutions-site](https://github.com/JLWally/jl-solutions-site) as the static site + Academy.  
   - Put the Next.js app in a **different repo** (e.g. `jl-solutions-app` or `jlsolutions-portal`) and deploy it separately (e.g. app.jlsolutions.io or jlsolutions.io/portal).

3. **Replace the static site**  
   Only if you intentionally want the live site to become the Next.js app: push `jl-solutions-site` to `main` and reconfigure Netlify for a Next.js build. Plan to recreate or redirect Academy/content elsewhere if needed.

---

## 6. Next step

Confirm which you want:

- **A)** Push local `jl-solutions-site` to a **new branch** on [jl-solutions-site](https://github.com/JLWally/jl-solutions-site) (no overwrite).  
- **B)** Push to a **new repo** (e.g. `jl-solutions-app`) so the static site and Next.js app stay separate.  
- **C)** Intentionally **replace** the GitHub jl-solutions-site `main` with the Next.js app (and accept losing the current static/Academy content in that repo).

Once you choose, the exact git commands can be given for that option.
