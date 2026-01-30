# TrailCrafter Deployment Guide

## Quick Deploy to Vercel (Recommended)

1. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/trailcrafter.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Add environment variables (see below)
   - Deploy!

3. **Update Netlify Proxy:**
   Once deployed, update `/Users/jesswally/Desktop/Portfolio/jl-solutions-site/netlify.toml`:
   ```toml
   [[redirects]]
     from = "/apps/trailcrafter/*"
     to = "https://YOUR_VERCEL_URL.vercel.app/:splat"
     status = 200
     force = true
   ```

## Environment Variables Needed

- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - Your OpenAI API key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `JWT_SECRET` - Random secret for JWT tokens

## Alternative: Deploy on Netlify

Netlify also supports Next.js:
1. Connect your GitHub repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables
5. Deploy!

## After Deployment

Once TrailCrafter is deployed, the link at `jlsolutions.io/apps/trailcrafter` will work via the Netlify proxy configuration.
