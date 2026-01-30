import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function POST(req: NextRequest) {
  try {
    const { prompt, trailName, description } = await req.json()

    if (!process.env.OPENAI_API_KEY || !openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Create a detailed image prompt based on the trail
    const imagePrompt = createImagePrompt(trailName, description || prompt)

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      size: '1792x1024', // Wide format for trail videos
      quality: 'hd',
      n: 1,
    })

    const imageUrl = response.data?.[0]?.url

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      imageUrl,
      prompt: imagePrompt,
    })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}

function createImagePrompt(trailName: string, description: string): string {
  // Create detailed prompts for each trail type matching the exact style shown
  const prompts: Record<string, string> = {
    'Eagles Stadium Run': 'A vibrant, photorealistic side-by-side panel design. Left panel titled "Eagles Stadium Run" in white text at top left. Background shows a large, realistic American football stadium (Lincoln Financial Field) filled with cheering spectators in the stands. Green football field visible in center. A majestic bald eagle with outstretched wings soars in the bright blue sky with white clouds above the stadium. In the lower foreground, two silhouetted runners (one male, one female) running towards viewer, positioned slightly right of center. Below runners, white text: "Run around the iconic Lincoln Financial Field with crowd sounds and stadium atmosphere". Two dark blue rectangular tags at bottom: "sports" and "stadium". Clean, modern interface style, 16:9 aspect ratio, optimized for fitness screen display.',
    
    'Adventure Time - Land of Ooo': 'A vibrant, whimsical side-by-side panel design. Right panel titled "Adventure Time - Land of Ooo" in white text at top left. Small yellow rectangular tag with house icon and "Premium" text at top right. Background features a colorful, cartoonish landscape inspired by Adventure Time. Large multi-level treehouse stands centrally with waterfall cascading from it. Lush green, orange, and yellow trees and bushes. Cartoonish pink and purple mountains with white peaks in distance under bright blue sky with fluffy white and pink clouds. Large yellow floating head of Jake the Dog (black eyes, wide smile) in upper right sky. Winding dirt path and blue river flow through colorful terrain. In lower foreground, two silhouetted runners (one male, one female) running away from viewer on the winding path, positioned slightly right of center. Below runners, white text: "Explore the colorful and whimsical world of Adventure Time". Two dark blue rectangular tags at bottom: "fantasy" and "cartoon". Clean, modern interface style, 16:9 aspect ratio, animated Adventure Time art style.',
    
    'Japanese Cherry Blossom Forest': 'A serene, beautiful Japanese cherry blossom forest in spring. Pink sakura petals falling gently. Traditional Japanese landscape with winding path. Soft morning light filtering through trees. Peaceful, tranquil atmosphere. Two silhouetted runners on the path in foreground. Photorealistic, high detail, cinematic, 16:9 aspect ratio.',
    
    'Mountain Sunrise Trail': 'Breathtaking mountain trail at sunrise. Golden hour lighting. Challenging rocky terrain with switchbacks. Snow-capped peaks in distance. Dramatic sky with orange and pink hues. Two silhouetted runners climbing the trail in foreground. Epic, inspiring, photorealistic, 16:9 aspect ratio.',
    
    'Urban Night Run': 'Vibrant cityscape at night. Neon lights, bustling streets, modern skyscrapers. Electric atmosphere with colorful signs and lights. Dark sky with city glow. Two silhouetted runners on urban street in foreground. Dynamic, energetic, cinematic, 16:9 aspect ratio.',
    
    'Tropical Beach Paradise': 'Pristine white sand beach with crystal clear turquoise water. Palm trees swaying. Bright sunny day. Ocean waves gently lapping the shore. Tropical paradise atmosphere. Two silhouetted runners on the beach in foreground. Relaxing, beautiful, photorealistic, 16:9 aspect ratio.',
  }

  // Use specific prompt if available, otherwise create from description
  if (prompts[trailName]) {
    return prompts[trailName]
  }

  // Generic prompt based on description
  return `A beautiful, immersive running trail scene: ${description}. First-person perspective view. Two silhouetted runners in the foreground on a path. Cinematic, high detail, photorealistic, 16:9 aspect ratio, optimized for fitness screen display.`
}
