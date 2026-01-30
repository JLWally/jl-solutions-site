# 🚨 DEPLOY TRAILCRAFTER NOW

## Your site is fixed - now deploy TrailCrafter:

1. **Go to Netlify:** https://app.netlify.com
2. **Click:** "Add new site" → "Import an existing project"
3. **Select:** "Deploy with GitHub"
4. **Choose repository:** `trailcrafter`
5. **Click:** "Deploy site"

Netlify will auto-detect Next.js and deploy it.

## After deployment:

1. **Get the URL** (e.g., `trailcrafter-xxxxx.netlify.app`)
2. **Rename site** to `trailcrafter` (Settings → Change site name)
3. **Update** `/Users/jesswally/Desktop/Portfolio/jl-solutions-site/netlify.toml`:
   - Uncomment the proxy rules
   - Change URL to your actual Netlify URL
4. **Push the change** to GitHub
5. **Done!** The app will be live at `jlsolutions.io/apps/trailcrafter`

## Environment Variables (add in Netlify):

- `DATABASE_URL` - PostgreSQL (use Supabase free tier)
- `OPENAI_API_KEY` - Your OpenAI key
- `STRIPE_SECRET_KEY` - Stripe secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `JWT_SECRET` - Random string
- `NODE_ENV=production`

**The site is fixed. Deploy TrailCrafter now!**
