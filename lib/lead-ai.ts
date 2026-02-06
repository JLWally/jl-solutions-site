import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export type LeadSummary = {
  summary: string
  score: 'hot' | 'warm' | 'cold'
  suggestedAction?: string
}

/**
 * Use AI to summarize a lead and suggest priority/action.
 * Returns null if OpenAI is not configured or the call fails.
 */
export async function summarizeLead(params: {
  name: string | null
  email: string
  source: string
  message: string | null
  referralCode: string | null
}): Promise<LeadSummary | null> {
  if (!openai || !process.env.OPENAI_API_KEY) return null

  const { name, email, source, message, referralCode } = params
  const prompt = `You are a sales assistant for JL Solutions (app development, fixes, AI automation, free consultations).

Given this lead, respond with exactly 3 lines, separated by newlines:
1. One short sentence summary (e.g. "Interested in app fix; mentioned slow performance.")
2. One word: hot, warm, or cold (hot = ready to buy/meet soon, warm = interested, cold = just browsing or unclear)
3. One short suggested next action (e.g. "Send Calendly link and mention fix service.")

Lead:
- Name: ${name || 'not given'}
- Email: ${email}
- Source: ${source}
- Message: ${message || 'none'}
- Referral: ${referralCode || 'none'}

Reply with only those 3 lines, no other text.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
    })
    const text = completion.choices[0]?.message?.content?.trim() || ''
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean)
    const summary = lines[0] || 'No summary.'
    const scoreLine = (lines[1] || 'warm').toLowerCase()
    const score: LeadSummary['score'] =
      scoreLine.includes('hot') ? 'hot' : scoreLine.includes('cold') ? 'cold' : 'warm'
    const suggestedAction = lines[2] || undefined
    return { summary, score, suggestedAction }
  } catch (err) {
    console.error('Lead AI summary error:', err)
    return null
  }
}
