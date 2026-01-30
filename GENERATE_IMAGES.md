# Generate Trail Images

## Quick Start

To generate custom DALL-E images for all trails:

1. **Set your OpenAI API key:**
   ```bash
   export OPENAI_API_KEY=your_key_here
   ```

2. **Install tsx (if not already installed):**
   ```bash
   npm install -g tsx
   ```

3. **Run the image generation script:**
   ```bash
   npx tsx scripts/generate-trail-images.ts
   ```

4. **Update the image URLs:**
   - The script will save results to `trail-images.json`
   - Copy the image URLs and update `TRAIL_IMAGES` in `app/api/trails/route.ts`

## Using the API Endpoint

You can also generate images via the API:

```bash
# Generate image for a single trail
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "trailName": "Eagles Stadium Run",
    "description": "Run around the iconic Lincoln Financial Field..."
  }'

# Generate images for all sample trails
curl -X POST http://localhost:3000/api/generate-all-trail-assets
```

## Video Generation

Video generation requires integration with:
- **RunwayML** (recommended for high quality)
- **Pika Labs** (good for animation)
- **Stable Video Diffusion** (open source option)

See `lib/video-generation.ts` for integration examples.

## Current Status

- ✅ Image generation API created
- ✅ Sample trails have placeholder images (Unsplash)
- ⏳ DALL-E image generation ready (needs API key)
- ⏳ Video generation structure ready (needs API integration)
