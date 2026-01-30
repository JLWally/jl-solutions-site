import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { conversationId, prompt, userId } = await req.json()

    if (!prompt || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check user subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has available trail generations
    const trailCount = await prisma.trail.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().setDate(1)), // This month
        },
      },
    })

    const planLimits: Record<string, number> = {
      basic: 5,
      pro: 20,
      premium: Infinity,
    }

    const limit = planLimits[user.subscription?.plan || 'basic'] || 0

    if (trailCount >= limit && limit !== Infinity) {
      return NextResponse.json(
        {
          error: 'Trail generation limit reached',
          limit,
          current: trailCount,
        },
        { status: 403 }
      )
    }

    // In a real app, this would:
    // 1. Call a video generation API (RunwayML, Pika Labs, etc.)
    // 2. Generate the trail video based on the prompt
    // 3. Store the video URL
    // For now, we'll simulate this

    const trail = await prisma.trail.create({
      data: {
        userId,
        name: `Trail: ${prompt.substring(0, 50)}...`,
        description: `AI-generated trail based on: ${prompt}`,
        prompt,
        videoUrl: null, // Would be set after video generation
        thumbnailUrl: null, // Would be set after video generation
        tags: extractTags(prompt),
        isPublic: false,
      },
    })

    // Update conversation with trail ID
    if (conversationId) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { trailId: trail.id },
      })
    }

    return NextResponse.json({
      success: true,
      trail: {
        id: trail.id,
        name: trail.name,
        status: 'generating', // In production, would be 'pending', 'processing', 'completed'
      },
      message: 'Trail generation started. This may take a few minutes.',
    })
  } catch (error) {
    console.error('Error generating trail:', error)
    return NextResponse.json(
      { error: 'Failed to generate trail' },
      { status: 500 }
    )
  }
}

function extractTags(prompt: string): string[] {
  const tags: string[] = []
  const lowerPrompt = prompt.toLowerCase()

  // Simple tag extraction based on keywords
  if (lowerPrompt.includes('stadium') || lowerPrompt.includes('eagles')) {
    tags.push('sports', 'stadium')
  }
  if (lowerPrompt.includes('adventure time')) {
    tags.push('fantasy', 'cartoon')
  }
  if (lowerPrompt.includes('forest') || lowerPrompt.includes('nature')) {
    tags.push('nature', 'outdoor')
  }
  if (lowerPrompt.includes('city') || lowerPrompt.includes('urban')) {
    tags.push('urban', 'city')
  }

  return tags
}
