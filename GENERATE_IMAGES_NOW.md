# Generate Trail Images Now

## Quick Generation

To generate the logo and trail images matching your design:

### Option 1: Via API (Recommended)

1. **Set OpenAI API key in Netlify:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add: `OPENAI_API_KEY` = your OpenAI API key

2. **Call the generation endpoint:**
   ```bash
   curl -X POST https://trailcrafter.netlify.app/api/generate-trail-images-now
   ```

3. **Update the image URLs:**
   - Copy the generated image URLs from the response
   - Update `TRAIL_IMAGES` in `app/api/trails/route.ts`
   - Update logo URL in environment or `components/Logo.tsx`

### Option 2: Run Script Locally

1. **Set API key:**
   ```bash
   export OPENAI_API_KEY=your_key_here
   ```

2. **Run the script:**
   ```bash
   npx tsx scripts/generate-specific-images.ts
   ```

3. **Update the URLs:**
   - Check `generated-images.json` for the URLs
   - Update the app with the new URLs

## What Gets Generated

1. **TrailCrafter Logo** (1024x1024)
   - Rounded shield/badge design
   - "TrailCrafter" text with Trail in grey/green, Crafter in orange/gold
   - "CREATE YOUR ADVENTURE" tagline
   - AI speech bubble at top
   - Stadium, forests, mountains, treehouse, trail, and runners

2. **Eagles Stadium Run** (1792x1024)
   - Realistic stadium with cheering crowd
   - Bald eagle soaring above
   - Two silhouetted runners
   - Sports and stadium tags

3. **Adventure Time - Land of Ooo** (1792x1024)
   - Colorful cartoon landscape
   - Treehouse with waterfall
   - Jake the Dog in sky
   - Two silhouetted runners
   - Premium badge
   - Fantasy and cartoon tags

## After Generation

Once you have the image URLs, update:
- `app/api/trails/route.ts` - Update `TRAIL_IMAGES` object
- `components/Logo.tsx` - Update logo URL
- Or set `NEXT_PUBLIC_LOGO_URL` environment variable

Then redeploy!
