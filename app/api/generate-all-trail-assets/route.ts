import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { sampleTrails } from '@/lib/generate-trail-assets'

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

    const results = []

    for (const trail of sampleTrails) {
      try {
        // Generate image using DALL-E
        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: trail.imagePrompt,
          size: '1792x1024',
          quality: 'hd',
          n: 1,
        })

        const imageUrl = imageResponse.data?.[0]?.url

        results.push({
          trailId: trail.id,
          trailName: trail.name,
          imageUrl,
          status: imageUrl ? 'success' : 'failed',
        })

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error generating image for ${trail.name}:`, error)
        results.push({
          trailId: trail.id,
          trailName: trail.name,
          imageUrl: null,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Generated ${results.filter(r => r.status === 'success').length} images out of ${results.length} trails`,
    })
  } catch (error) {
    console.error('Error generating trail assets:', error)
    return NextResponse.json(
      { error: 'Failed to generate trail assets' },
      { status: 500 }
    )
  }
}
