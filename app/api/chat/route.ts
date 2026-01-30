import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Add system prompt to guide the AI
    const systemMessage = {
      role: 'system' as const,
      content: `You are a creative trail design assistant for TrailCrafter, an app that creates virtual running and biking trails for fitness equipment like Peloton, treadmills, and exercise bikes.

Your job is to:
1. Help users design their dream trails through conversation
2. Ask clarifying questions about terrain, scenery, difficulty, length, and theme
3. Be creative and enthusiastic about their ideas
4. Once you have enough details, suggest generating the trail

Examples of good trails:
- Running around the Eagles stadium with crowd sounds
- Adventure Time themed trail through the Land of Ooo
- Japanese cherry blossom forest path
- Mountain trail with sunrise views
- Urban cityscape at night

When the user has provided enough details, suggest that we can generate the trail now.`,
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [systemMessage, ...messages],
      temperature: 0.8,
      max_tokens: 500,
    })

    const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I encountered an error.'

    // Check if the message suggests generating the trail
    const suggestGenerate = assistantMessage.toLowerCase().includes('generate') ||
                           assistantMessage.toLowerCase().includes('create the trail') ||
                           assistantMessage.toLowerCase().includes('ready to generate')

    return NextResponse.json({
      message: assistantMessage,
      suggestGenerate,
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
