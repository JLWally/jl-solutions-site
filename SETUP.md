# TrailCrafter Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your:
   - `DATABASE_URL` - PostgreSQL connection string
   - `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
   - `STRIPE_SECRET_KEY` - Get from https://dashboard.stripe.com/apikeys
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Get from Stripe dashboard
   - `STRIPE_WEBHOOK_SECRET` - Set up webhook in Stripe dashboard
   - `JWT_SECRET` - Any random string for authentication

3. **Set Up Database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open in Browser**
   Navigate to http://localhost:3000

## Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Go to Products and create three subscription products:
   - Basic Plan: $9.99/month
   - Pro Plan: $19.99/month
   - Premium Plan: $39.99/month
3. Copy the Price IDs and add them to your `.env`:
   ```
   STRIPE_BASIC_PRICE_ID=price_xxxxx
   STRIPE_PRO_PRICE_ID=price_xxxxx
   STRIPE_PREMIUM_PRICE_ID=price_xxxxx
   ```
4. Set up webhook endpoint:
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env`

## Database Setup

### Option 1: Local PostgreSQL
1. Install PostgreSQL
2. Create database: `createdb trailcrafter`
3. Set `DATABASE_URL=postgresql://user:password@localhost:5432/trailcrafter`

### Option 2: Supabase (Recommended for quick start)
1. Go to https://supabase.com
2. Create a new project
3. Copy the connection string to `DATABASE_URL`

### Option 3: Railway/Neon
1. Create account at https://railway.app or https://neon.tech
2. Create PostgreSQL database
3. Copy connection string to `DATABASE_URL`

## Trail Generation

Currently, the trail generation endpoint creates a database record but doesn't actually generate video. To add real video generation:

1. **Option A: Use RunwayML API**
   - Sign up at https://runwayml.com
   - Integrate their video generation API

2. **Option B: Use Pika Labs API**
   - Sign up at https://pika.art
   - Use their video generation endpoints

3. **Option C: Use Stable Video Diffusion**
   - Self-host or use a service
   - Generate video from images/prompts

Update `/app/api/generate-trail/route.ts` to call your chosen service.

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms
- Railway
- Render
- Fly.io
- AWS/GCP/Azure

Make sure to:
- Set all environment variables
- Run database migrations
- Set up Stripe webhook with production URL

## Testing

Test the app locally:
1. Start dev server: `npm run dev`
2. Visit http://localhost:3000
3. Try creating a trail via chat
4. Test subscription flow (use Stripe test mode)

## Next Steps

- [ ] Add authentication (NextAuth.js recommended)
- [ ] Integrate video generation API
- [ ] Add user profile pages
- [ ] Implement trail sharing
- [ ] Add social features
- [ ] Optimize for specific fitness equipment APIs
