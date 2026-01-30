/**
 * Generate images and videos for trail samples
 * This script generates assets for all sample trails
 */

interface TrailAsset {
  id: string
  name: string
  description: string
  imagePrompt: string
  videoPrompt: string
}

export const sampleTrails: TrailAsset[] = [
  {
    id: 'sample-1',
    name: 'Eagles Stadium Run',
    description: 'Run around the iconic Lincoln Financial Field with crowd sounds and stadium atmosphere. Experience the energy of game day as you complete your workout.',
    imagePrompt: 'A vibrant, photorealistic view of Lincoln Financial Field stadium from a first-person running perspective. Bright sunny day with blue sky and white clouds. A majestic bald eagle soaring in the sky above. The stadium is packed with cheering fans in green and white. The green football field is visible. Two silhouetted runners in the foreground, running on the field track. Cinematic, immersive, high detail, 16:9 aspect ratio, optimized for fitness screen display.',
    videoPrompt: 'First-person running view through Lincoln Financial Field stadium. Camera moves forward along the track, showing the packed stadium, cheering fans, and the green field. Eagle flying overhead. Dynamic, energetic movement.',
  },
  {
    id: 'sample-2',
    name: 'Adventure Time - Land of Ooo',
    description: 'Explore the colorful and whimsical world of Adventure Time. Run through the Candy Kingdom, past the Tree Fort, and into the Land of Ooo.',
    imagePrompt: 'A colorful, whimsical cartoon landscape inspired by Adventure Time. Large multi-tiered treehouse with waterfall cascading from it. Rolling hills, winding river, vibrant green, orange, and purple trees. Cartoonish snow-capped mountains in background. Pastel sky. Large floating yellow character head (Jake the Dog) in upper right. Two silhouetted runners on a dirt path in foreground, facing the fantastical world. Bright, cheerful, animated style, 16:9 aspect ratio.',
    videoPrompt: 'Running through the Land of Ooo in Adventure Time style. Camera moves forward along a colorful path, past the treehouse, through candy landscapes, with whimsical characters visible. Animated, cheerful movement.',
  },
  {
    id: 'sample-3',
    name: 'Japanese Cherry Blossom Forest',
    description: 'A serene run through a beautiful cherry blossom forest in spring. Experience the tranquility of nature with pink petals falling around you.',
    imagePrompt: 'A serene, beautiful Japanese cherry blossom forest in spring. Pink sakura petals falling gently. Traditional Japanese landscape with winding path. Soft morning light filtering through trees. Peaceful, tranquil atmosphere. Two silhouetted runners on the path in foreground. Photorealistic, high detail, cinematic, 16:9 aspect ratio.',
    videoPrompt: 'Running through a Japanese cherry blossom forest. Camera glides forward along the path as pink petals fall gently. Soft morning light, peaceful and serene. Smooth, calming movement.',
  },
  {
    id: 'sample-4',
    name: 'Mountain Sunrise Trail',
    description: 'Climb through mountain trails as the sun rises. Experience breathtaking views and challenging terrain perfect for your morning workout.',
    imagePrompt: 'Breathtaking mountain trail at sunrise. Golden hour lighting. Challenging rocky terrain with switchbacks. Snow-capped peaks in distance. Dramatic sky with orange and pink hues. Two silhouetted runners climbing the trail in foreground. Epic, inspiring, photorealistic, 16:9 aspect ratio.',
    videoPrompt: 'Running up a mountain trail at sunrise. Camera moves forward and upward along the rocky path, revealing stunning vistas. Golden hour lighting, dramatic sky. Challenging, inspiring movement.',
  },
  {
    id: 'sample-5',
    name: 'Urban Night Run',
    description: 'Run through a vibrant cityscape at night. Neon lights, bustling streets, and the energy of the city keep you motivated through your workout.',
    imagePrompt: 'Vibrant cityscape at night. Neon lights, bustling streets, modern skyscrapers. Electric atmosphere with colorful signs and lights. Dark sky with city glow. Two silhouetted runners on urban street in foreground. Dynamic, energetic, cinematic, 16:9 aspect ratio.',
    videoPrompt: 'Running through a vibrant city at night. Camera moves forward along neon-lit streets, past glowing signs and buildings. Dynamic, energetic urban atmosphere. Fast-paced movement.',
  },
  {
    id: 'sample-6',
    name: 'Tropical Beach Paradise',
    description: 'Run along pristine white sand beaches with crystal clear turquoise water. Feel the ocean breeze as you complete your coastal workout.',
    imagePrompt: 'Pristine white sand beach with crystal clear turquoise water. Palm trees swaying. Bright sunny day. Ocean waves gently lapping the shore. Tropical paradise atmosphere. Two silhouetted runners on the beach in foreground. Relaxing, beautiful, photorealistic, 16:9 aspect ratio.',
    videoPrompt: 'Running along a tropical beach. Camera moves forward along the white sand, with turquoise water and palm trees. Bright, sunny, relaxing atmosphere. Smooth, coastal movement.',
  },
]

export async function generateImageForTrail(trail: TrailAsset): Promise<string | null> {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trailName: trail.name,
        description: trail.description,
        prompt: trail.imagePrompt,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.imageUrl || null
  } catch (error) {
    console.error(`Error generating image for ${trail.name}:`, error)
    return null
  }
}
