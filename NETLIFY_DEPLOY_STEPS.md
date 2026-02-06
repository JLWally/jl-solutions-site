# Deploy TrailCrafter on Netlify - DO THIS NOW

## Step 1: Go to Netlify
1. Open https://app.netlify.com
2. Sign in with your GitHub account

## Step 2: Import TrailCrafter
1. Click **"Add new site"** → **"Import an existing project"**
2. Click **"Deploy with GitHub"**
3. Authorize Netlify if needed
4. Select the **"trailcrafter"** repository
5. Click **"Deploy"**

## Step 3: Configure Build Settings
Netlify should auto-detect Next.js, but verify:
- **Build command:** `npm run build`
- **Publish directory:** `.next` (or leave default)
- **Framework preset:** Next.js

## Step 4: Add Environment Variables
Click **"Site settings"** → **"Environment variables"** and add:

```
DATABASE_URL=your_postgres_url
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_BASIC_PRICE_ID=price_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_PRICE_ID=price_xxxxx
NEXT_PUBLIC_APP_URL=https://jlsolutions.io/apps/trailcrafter
JWT_SECRET=random_secret_string
NODE_ENV=production
```

See `PAYMENTS_JLSOLUTIONS_SETUP.md` for full Stripe setup for jlsolutions.io.

## Step 5: Update Site Name (Optional)
- Go to **"Site settings"** → **"Change site name"**
- Change to **"trailcrafter"** (so URL is trailcrafter.netlify.app)

## Step 6: Update JL Solutions Proxy
Once deployed, you'll get a URL like `https://trailcrafter.netlify.app`

1. Edit `/Users/jesswally/Desktop/Portfolio/jl-solutions-site/netlify.toml`
2. The proxy is already configured - just verify the URL matches
3. Commit and push the change

## Step 7: Trigger Redeploy
After updating netlify.toml, Netlify will auto-redeploy and the proxy will work!

**The app will be live at: https://www.jlsolutions.io/apps/trailcrafter**
