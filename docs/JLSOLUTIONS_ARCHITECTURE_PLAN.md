# JL Solutions Architecture: Two Codebases + Academy Separate

**Goal:** Keep both codebases. Separate the Academy entirely. JLSolutions.io = informational + sales funnel.

---

## Target architecture

| Property | Purpose | Codebase | URL (example) |
|----------|---------|----------|----------------|
| **jlsolutions.io** | Informational site + sales funnel (About, services, portal, leads, free consultation) | Next.js app (our `jl-solutions-site` branch) | https://www.jlsolutions.io |
| **Academy** | Learning platform (courses, modules, progress, timer, mentorship) | Static HTML/CSS/JS, **separate repo** | https://academy.jlsolutions.io (or /academy if you prefer) |
| **TrailCrafter** | App (unfinished, not for sale) | Next.js in TrailCrafter repo | Stays at its own repo/deploy |

---

## Step 1: Separate the Academy into its own repo

Do this **first** so the Academy is safe before changing jlsolutions.io.

### 1.1 Create a new GitHub repo

- Go to https://github.com/new
- Name it **`jl-solutions-academy`** (or `jlsolutions-academy`)
- Create it **empty** (no README, .gitignore, or license)

### 1.2 Clone the current jl-solutions-site (if you don’t have it)

```bash
cd ~/Desktop   # or wherever you keep projects
git clone https://github.com/JLWally/jl-solutions-site.git jl-solutions-site-backup
cd jl-solutions-site-backup
```

### 1.3 Copy only Academy-related files into a new folder

From the [jl-solutions-site](https://github.com/JLWally/jl-solutions-site) structure, the Academy typically includes:

- **`academy/`** – all HTML and assets for the Academy (index, courses, modules, progress, timer, snippets, mentorship, faq, etc.)
- **`css/academy.css`** – Academy-specific styles (if present)
- **`js/`** – any Academy-related scripts (e.g. academy-progress.js, chatbot.js if used by Academy)
- **`assets/`** – shared images/icons used by Academy (or copy only what Academy pages need)

Create a clean Academy-only project:

```bash
mkdir -p ~/Desktop/jl-solutions-academy
cd ~/Desktop/jl-solutions-academy

# Copy Academy folder and shared assets
cp -r ../jl-solutions-site-backup/academy .
cp -r ../jl-solutions-site-backup/css .    # or only academy.css if you split
cp -r ../jl-solutions-site-backup/js .
cp -r ../jl-solutions-site-backup/assets .

# Copy root files Academy might need (e.g. netlify.toml for deploy)
cp ../jl-solutions-site-backup/netlify.toml .   # if Academy deploys on Netlify
```

Add an **`index.html`** at the root that redirects to `academy/index.html`, or make `academy/index.html` the site root in Netlify (e.g. publish directory = `academy`).

### 1.4 Initialize git and push to the new repo

```bash
cd ~/Desktop/jl-solutions-academy
git init
git add .
git commit -m "Initial commit: JL Solutions Academy (extracted from jl-solutions-site)"
git branch -M main
git remote add origin https://github.com/JLWally/jl-solutions-academy.git
git push -u origin main
```

### 1.5 Deploy the Academy

- In Netlify: “Add new site” → “Import an existing project” → choose **jl-solutions-academy**
- Set build settings: publish directory = **`academy`** (or root if you put index at root)
- Optional: assign **academy.jlsolutions.io** (or similar) as a custom domain

After this, the Academy lives in its own repo and can be updated independently.

---

## Step 2: Make jlsolutions.io informational + sales funnel (Next.js app)

Our Next.js app (branch **`jl-solutions-site`** in the TrailCrafter repo) is already informational + sales funnel. Push it to the jl-solutions-site repo **after** the Academy is extracted.

### 2.1 Add the jl-solutions-site remote and push to a branch

From the **TrailCrafter** repo:

```bash
cd /Users/jesswally/TrailCrafter
git fetch origin
git checkout jl-solutions-site
git remote add jlsolutions https://github.com/JLWally/jl-solutions-site.git
# Push to a branch so we don't overwrite main yet
git push jlsolutions jl-solutions-site:next-app
```

### 2.2 (Optional) Keep a backup of the old static site

On GitHub, create a branch from current `main` so the old static site + Academy are preserved in that repo too:

- In GitHub: Repo **jl-solutions-site** → Branch **main** → “Create branch” → name it **`static-site-archive`**.

### 2.3 Switch jl-solutions-site to the Next.js app

On GitHub:

- Open **jl-solutions-site** → Settings → Default branch
- Or: merge **next-app** into **main** (e.g. Pull Request **next-app** → **main**, then merge)

Then locally (if you’re managing from a clone of jl-solutions-site):

```bash
git clone https://github.com/JLWally/jl-solutions-site.git jl-solutions-io
cd jl-solutions-io
git fetch origin next-app
git checkout main
git reset --hard origin/next-app
git push origin main --force
```

(Only do the force-push if you’re sure the default branch should be the Next.js app and you’ve archived the old site on **static-site-archive**.)

### 2.4 Configure Netlify for Next.js

- Build command: **`npm run build`**
- Publish directory: **`.next`** (or leave blank and use “Next.js” as framework; Netlify will set it)
- Install command: **`npm ci`** or **`npm install`**
- Add env vars: `DATABASE_URL`, `OPENAI_API_KEY`, `STRIPE_*`, `NEXT_PUBLIC_CALENDLY_URL`, etc., as in SETUP.md

After deploy, https://www.jlsolutions.io will be the Next.js app: informational + sales funnel.

---

## Step 3: Link to the Academy from jlsolutions.io

In the Next.js app, add a clear “Academy” link so users can reach the separated Academy:

- **Navigation:** Add an item “Academy” that points to **https://academy.jlsolutions.io** (or whatever URL you gave the Academy).
- **Footer:** Add “Academy” next to Home, Services, Portal, Free consultation.

We can add this link to the **jl-solutions-site** branch (Navigation + Footer) so it’s included when you push.

---

## Summary

1. **Academy** → New repo **jl-solutions-academy**, deploy to e.g. **academy.jlsolutions.io**.  
2. **jlsolutions.io** → Next.js app (informational + sales funnel) from branch **jl-solutions-site**, pushed to **jl-solutions-site** repo and set as default branch; Netlify reconfigured for Next.js.  
3. **TrailCrafter** → Stays in its own repo; no change.  
4. **Link** from jlsolutions.io nav/footer to Academy URL.

If you want, next step can be: add the Academy link to the Next.js app (Navigation + Footer) on the **jl-solutions-site** branch and then you run the git/Netlify steps above.
