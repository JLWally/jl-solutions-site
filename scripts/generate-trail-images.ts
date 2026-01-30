/**
 * Script to generate images for all sample trails using DALL-E
 * Run with: npx tsx scripts/generate-trail-images.ts
 */

import OpenAI from 'openai'
import { sampleTrails } from '../lib/generate-trail-assets'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function generateAllImages() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set in environment variables')
    process.exit(1)
  }

  console.log('🎨 Starting image generation for all trails...\n')

  const results: Array<{
    trailId: string
    trailName: string
    imageUrl: string | null
    status: 'success' | 'failed'
    error?: string
  }> = []

  for (const trail of sampleTrails) {
    try {
      console.log(`Generating image for: ${trail.name}...`)

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: trail.imagePrompt,
        size: '1792x1024',
        quality: 'hd',
        n: 1,
      })

      const imageUrl = response.data?.[0]?.url

      if (imageUrl) {
        console.log(`✅ Success! Image URL: ${imageUrl}\n`)
        results.push({
          trailId: trail.id,
          trailName: trail.name,
          imageUrl,
          status: 'success',
        })
      } else {
        console.log(`❌ Failed: No image URL returned\n`)
        results.push({
          trailId: trail.id,
          trailName: trail.name,
          imageUrl: null,
          status: 'failed',
          error: 'No image URL returned',
        })
      }

      // Wait 2 seconds between requests to avoid rate limits
      if (trail !== sampleTrails[sampleTrails.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`❌ Error generating image for ${trail.name}:`, error)
      results.push({
        trailId: trail.id,
        trailName: trail.name,
        imageUrl: null,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  console.log('\n📊 Generation Summary:')
  console.log(`✅ Successful: ${results.filter(r => r.status === 'success').length}`)
  console.log(`❌ Failed: ${results.filter(r => r.status === 'failed').length}`)
  console.log('\n📝 Results:')
  console.log(JSON.stringify(results, null, 2))

  // Save results to file
  const fs = await import('fs/promises')
  await fs.writeFile(
    'trail-images.json',
    JSON.stringify(results, null, 2)
  )
  console.log('\n💾 Results saved to trail-images.json')
}

generateAllImages().catch(console.error)
