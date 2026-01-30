import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY || !openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const logoPrompt = `A vibrant, detailed logo or emblem for "TrailCrafter" featuring a blend of natural and urban landscapes. The logo is a colorful, stylized emblem with a dark brown border, shaped like a rounded shield or badge. It prominently features the title "TrailCrafter" where "Trail" is in light grey/silver with green outline, and "Crafter" is in bright orange/gold with darker orange outline. Below is the tagline "CREATE YOUR ADVENTURE" on a dark grey banner. The background scenery includes a modern stadium, lush forests, majestic mountains, a whimsical treehouse, and a winding trail with a river, all under a bright blue sky. A speech bubble containing "AI" with circuit board elements is at the top center. Two silhouetted runners are on the trail in the foreground. The art style is illustrative, clean, and engaging. High detail, professional logo design, 1024x1024 square format.`

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: logoPrompt,
      size: '1024x1024',
      quality: 'hd',
      n: 1,
    })

    const imageUrl = response.data?.[0]?.url

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate logo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      imageUrl,
      prompt: logoPrompt,
    })
  } catch (error) {
    console.error('Error generating logo:', error)
    return NextResponse.json(
      { error: 'Failed to generate logo' },
      { status: 500 }
    )
  }
}
