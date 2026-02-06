import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { summarizeLead } from '@/lib/lead-ai'
// GET: list leads (for portal dashboard)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const status = searchParams.get('status') || undefined
    const source = searchParams.get('source') || undefined

    const leads = await prisma.lead.findMany({
      where: {
        ...(status && { status }),
        ...(source && { source }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('GET /api/leads error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// POST: capture a new lead (consultation, contact form, etc.)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim() || null : null
    const source = typeof body.source === 'string' && body.source ? body.source : 'consultation'
    const message = typeof body.message === 'string' ? body.message.trim() || null : null
    const referralCode = typeof body.referralCode === 'string' ? body.referralCode.trim() || null : null

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.create({
      data: {
        email,
        name,
        source,
        message,
        referralCode,
        status: 'new',
      },
    })

    // AI: summarize and score the lead (async, don't block response)
    summarizeLead({
      name: lead.name,
      email: lead.email,
      source: lead.source,
      message: lead.message,
      referralCode: lead.referralCode,
    })
      .then(async (result) => {
        if (!result) return
        const aiSummary = [result.summary, result.suggestedAction].filter(Boolean).join(' | ')
        await prisma.lead.update({
          where: { id: lead.id },
          data: { aiSummary },
        })
      })
      .catch((e) => console.error('Lead AI follow-up error:', e))

    // Optional: notify Slack
    const slackWebhook = process.env.SLACK_WEBHOOK_URL
    if (slackWebhook) {
      fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New lead: ${name || 'No name'} <${email}>`,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*New lead*\n• Name: ${name || '—'}\n• Email: ${email}\n• Source: ${source}\n• Message: ${message || '—'}\n• Referral: ${referralCode || '—'}` },
            },
          ],
        }),
      }).catch((e) => console.error('Slack notify error:', e))
    }

    // Optional: send thank-you email via Resend
    const resendKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'JL Solutions <onboarding@resend.dev>'
    if (resendKey) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Thanks for your interest — JL Solutions',
          html: `
            <p>Hi ${name || 'there'},</p>
            <p>Thanks for reaching out. We'll get back to you within one business day to schedule your free consultation or answer your questions.</p>
            <p>— The JL Solutions team</p>
          `,
        })
      } catch (e) {
        console.error('Resend email error:', e)
      }
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: 'Thanks! We’ll be in touch soon.',
    })
  } catch (error) {
    console.error('POST /api/leads error:', error)
    return NextResponse.json(
      { error: 'Failed to save lead' },
      { status: 500 }
    )
  }
}
