import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function slug(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function randomCode(length = 6) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NETLIFY_URL) return `https://${process.env.NETLIFY_URL}`
  return 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const base = slug(name) || 'partner'
    let referralCode = `${base}-${randomCode(5)}`
    let exists = await prisma.partner.findUnique({ where: { referralCode } })
    let attempts = 0
    while (exists && attempts < 10) {
      referralCode = `${base}-${randomCode(6)}`
      exists = await prisma.partner.findUnique({ where: { referralCode } })
      attempts++
    }
    if (exists) {
      referralCode = `ref-${randomCode(8)}`
    }

    const partner = await prisma.partner.create({
      data: {
        referralCode,
        name,
        email,
        commissionPct: 45,
      },
    })

    const baseUrl = getBaseUrl()
    const referralUrl = `${baseUrl}/?ref=${encodeURIComponent(partner.referralCode)}`

    return NextResponse.json({
      referralCode: partner.referralCode,
      referralUrl,
      message: 'Share your link. When someone pays, you earn 45% commission for the first two months.',
    })
  } catch (error) {
    console.error('Partner signup error:', error)
    return NextResponse.json(
      { error: 'Could not create referral link' },
      { status: 500 }
    )
  }
}
