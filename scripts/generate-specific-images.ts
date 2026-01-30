/**
 * Generate specific images for Eagles Stadium and Adventure Time trails
 * Run with: npx tsx scripts/generate-specific-images.ts
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const prompts = {
  logo: `A vibrant, detailed logo or emblem for "TrailCrafter" featuring a blend of natural and urban landscapes. The logo is a colorful, stylized emblem with a dark brown border, shaped like a rounded shield or badge. It prominently features the title "TrailCrafter" where "Trail" is in light grey/silver with green outline, and "Crafter" is in bright orange/gold with darker orange outline. Below is the tagline "CREATE YOUR ADVENTURE" on a dark grey banner. The background scenery includes a modern stadium, lush forests, majestic mountains, a whimsical treehouse, and a winding trail with a river, all under a bright blue sky. A speech bubble containing "AI" with circuit board elements is at the top center. Two silhouetted runners are on the trail in the foreground. The art style is illustrative, clean, and engaging. High detail, professional logo design, 1024x1024 square format.`,
  
  eagles: `A vibrant, photorealistic side-by-side panel design. Left panel titled "Eagles Stadium Run" in white text at top left. Background shows a large, realistic American football stadium (Lincoln Financial Field) filled with cheering spectators in the stands. Green football field visible in center. A majestic bald eagle with outstretched wings soars in the bright blue sky with white clouds above the stadium. In the lower foreground, two silhouetted runners (one male, one female) running towards viewer, positioned slightly right of center. Below runners, white text: "Run around the iconic Lincoln Financial Field with crowd sounds and stadium atmosphere". Two dark blue rectangular tags at bottom: "sports" and "stadium". Clean, modern interface style, 16:9 aspect ratio, optimized for fitness screen display.`,
  
  adventureTime: `A vibrant, whimsical side-by-side panel design. Right panel titled "Adventure Time - Land of Ooo" in white text at top left. Small yellow rectangular tag with house icon and "Premium" text at top right. Background features a colorful, cartoonish landscape inspired by Adventure Time. Large multi-level treehouse stands centrally with waterfall cascading from it. Lush green, orange, and yellow trees and bushes. Cartoonish pink and purple mountains with white peaks in distance under bright blue sky with fluffy white and pink clouds. Large yellow floating head of Jake the Dog (black eyes, wide smile) in upper right sky. Winding dirt path and blue river flow through colorful terrain. In lower foreground, two silhouetted runners (one male, one female) running away from viewer on the winding path, positioned slightly right of center. Below runners, white text: "Explore the colorful and whimsical world of Adventure Time". Two dark blue rectangular tags at bottom: "fantasy" and "cartoon". Clean, modern interface style, 16:9 aspect ratio, animated Adventure Time art style.`,
}

async function generateImages() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set')
    process.exit(1)
  }

  const results: Record<string, string | null> = {}

  // Generate Logo
  console.log('Generating Logo...')
  try {
    const logoResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompts.logo,
      size: '1024x1024',
      quality: 'hd',
      n: 1,
    })
    results.logo = logoResponse.data?.[0]?.url || null
    console.log(`✅ Logo: ${results.logo}\n`)
  } catch (error) {
    console.error('❌ Logo generation failed:', error)
    results.logo = null
  }

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Generate Eagles Stadium
  console.log('Generating Eagles Stadium Run image...')
  try {
    const eaglesResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompts.eagles,
      size: '1792x1024',
      quality: 'hd',
      n: 1,
    })
    results.eagles = eaglesResponse.data?.[0]?.url || null
    console.log(`✅ Eagles Stadium: ${results.eagles}\n`)
  } catch (error) {
    console.error('❌ Eagles Stadium generation failed:', error)
    results.eagles = null
  }

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Generate Adventure Time
  console.log('Generating Adventure Time image...')
  try {
    const adventureResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompts.adventureTime,
      size: '1792x1024',
      quality: 'hd',
      n: 1,
    })
    results.adventureTime = adventureResponse.data?.[0]?.url || null
    console.log(`✅ Adventure Time: ${results.adventureTime}\n`)
  } catch (error) {
    console.error('❌ Adventure Time generation failed:', error)
    results.adventureTime = null
  }

  console.log('\n📊 Results:')
  console.log(JSON.stringify(results, null, 2))

  // Save to file
  const fs = await import('fs/promises')
  await fs.writeFile('generated-images.json', JSON.stringify(results, null, 2))
  console.log('\n💾 Results saved to generated-images.json')
}

generateImages().catch(console.error)
