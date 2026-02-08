# Fix academy.jlsolutions.io Not Working

The subdomain will work once the **jl-solutions-academy** repo is deployed to Netlify and the domain is set.

## 1. Deploy the academy repo to Netlify

1. Log in at [app.netlify.com](https://app.netlify.com).
2. **Add new site** → **Import an existing project** → **GitHub**.
3. Choose **JLWally/jl-solutions-academy**.
4. Settings:
   - **Branch:** `main`
   - **Build command:** leave empty
   - **Publish directory:** `.` (root)
5. Deploy. Note the default URL (e.g. `random-name-123.netlify.app`).

## 2. Add custom domain academy.jlsolutions.io

1. In the academy site: **Domain management** → **Add domain** (or **Add custom domain**).
2. Enter: `academy.jlsolutions.io` → **Verify**.
3. Netlify will show the DNS record you need.

## 3. Add DNS for academy.jlsolutions.io

Where you manage DNS for **jlsolutions.io** (e.g. Netlify DNS, Cloudflare, or your registrar):

- Add a **CNAME** record:
  - **Name/host:** `academy` (or `academy.jlsolutions.io` depending on the provider)
  - **Value/target:** the academy site’s Netlify URL, e.g. `your-academy-site.netlify.app`

If you use **Netlify DNS** for jlsolutions.io:

- In the **main** site (jlsolutions.io) → **Domain management** → **DNS**, add:
  - Type: **CNAME**
  - Name: **academy**
  - Value: **your-academy-site.netlify.app**

## 4. Wait and test

- DNS can take a few minutes up to 48 hours.
- HTTPS for academy.jlsolutions.io is provided by Netlify after DNS is correct.

## Temporary: point main site to the Netlify default URL

Until the custom domain works, you can change the Academy link on the main site to the academy’s **Netlify URL** (e.g. `https://your-academy-site.netlify.app`) so the link doesn’t 404. After academy.jlsolutions.io is working, switch the link back to `https://academy.jlsolutions.io`.
