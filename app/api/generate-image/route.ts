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
  // Create detailed prompts for each trail type
  const prompts: Record<string, string> = {
    'Eagles Stadium Run': 'A vibrant, photorealistic view of Lincoln Financial Field stadium from a first-person running perspective. Bright sunny day with blue sky and white clouds. A majestic bald eagle soaring in the sky above. The stadium is packed with cheering fans in green and white. The green football field is visible. Two silhouetted runners in the foreground, running on the field track. Cinematic, immersive, high detail, 16:9 aspect ratio, optimized for fitness screen display.',
    
    'Adventure Time - Land of Ooo': 'A colorful, whimsical cartoon landscape inspired by Adventure Time. Large multi-tiered treehouse with waterfall cascading from it. Rolling hills, winding river, vibrant green, orange, and purple trees. Cartoonish snow-capped mountains in background. Pastel sky. Large floating yellow character head (Jake the Dog) in upper right. Two silhouetted runners on a dirt path in foreground, facing the fantastical world. Bright, cheerful, animated style, 16:9 aspect ratio.',
    
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
