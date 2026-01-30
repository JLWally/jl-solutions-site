# Quick Deploy TrailCrafter

## Option 1: Deploy on Netlify (Recommended - Same platform as JL Solutions)

1. **Push TrailCrafter to GitHub:**
   ```bash
   git remote add origin https://github.com/JLWally/trailcrafter.git
   git push -u origin main
   ```
   (Or create the repo on GitHub first if it doesn't exist)

2. **Deploy on Netlify:**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select the `trailcrafter` repository
   - Netlify will auto-detect Next.js settings
   - Add environment variables (see below)
   - Click "Deploy site"

3. **Update JL Solutions Netlify Proxy:**
   Once deployed, you'll get a URL like `https://trailcrafter-xxxxx.netlify.app`
   - Edit `/Users/jesswally/Desktop/Portfolio/jl-solutions-site/netlify.toml`
   - Uncomment and update the proxy rule:
   ```toml
   [[redirects]]
     from = "/apps/trailcrafter/*"
     to = "https://trailcrafter-xxxxx.netlify.app/:splat"
     status = 200
     force = true
   ```
   - Commit and push the change

## Option 2: Deploy on Vercel

1. **Push to GitHub** (same as above)

2. **Deploy on Vercel:**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Vercel auto-detects Next.js
   - Add environment variables
   - Deploy!

3. **Update Netlify Proxy:**
   - Get your Vercel URL (e.g., `https://trailcrafter.vercel.app`)
   - Update `netlify.toml` with the Vercel URL instead

## Required Environment Variables

Add these in Netlify/Vercel dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - Your OpenAI API key  
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `JWT_SECRET` - Random secret string
- `NODE_ENV=production` - Set to production

## After Deployment

Once TrailCrafter is deployed and the proxy is configured, visiting `jlsolutions.io/apps/trailcrafter` will show the actual TrailCrafter app!
