import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// JL Solutions subscription plans
const plans = {
  manage: {
    priceId: process.env.STRIPE_MANAGE_PRICE_ID || 'price_manage',
    amount: 9900, // $99/mo
  },
}

// One-time services: use Stripe Price ID if set, else use price_data (amount in cents)
const services = {
  fix: {
    priceId: process.env.STRIPE_SERVICE_FIX_PRICE_ID,
    amount: 19900, // $199
    name: 'Fix my app',
    description: 'Bug fixes, performance, and support',
  },
  create: {
    priceId: process.env.STRIPE_SERVICE_CREATE_PRICE_ID,
    amount: 249900, // $2,499
    name: 'Create an app',
    description: 'Design, development, and launch',
  },
  ai: {
    priceId: process.env.STRIPE_SERVICE_AI_PRICE_ID,
    amount: 49900, // $499
    name: 'AI automation',
    description: 'Chatbots, workflows, and AI integration',
  },
} as const

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NETLIFY_URL) return `https://${process.env.NETLIFY_URL}`
  return 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { plan, service, userId, ref } = body
    const baseUrl = getBaseUrl()
    const referralCode = typeof ref === 'string' && ref.trim() ? ref.trim() : undefined

    // Free consultation: no payment, return booking URL for frontend
    if (service === 'consultation') {
      const bookingUrl =
        process.env.NEXT_PUBLIC_CALENDLY_URL ||
        process.env.CALENDLY_URL ||
        process.env.CONSULTATION_BOOKING_URL ||
        null
      return NextResponse.json({
        type: 'consultation',
        bookingUrl,
        message: bookingUrl
          ? 'Open the link below to book your free 30-minute call.'
          : 'Contact us to schedule your free consultation.',
      })
    }

    // Subscription: plan (including "manage" for Manage my app)
    if (plan && plans[plan as keyof typeof plans]) {
      const selectedPlan = plans[plan as keyof typeof plans]
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/portal?success=true`,
        cancel_url: `${baseUrl}/subscribe?canceled=true`,
        client_reference_id: userId || undefined,
        metadata: { ...(userId && { userId }), plan, ...(referralCode && { referralCode }) },
      })
      return NextResponse.json({ sessionId: session.id, url: session.url })
    }

    // One-time service: fix, create, ai
    const serviceKey = service as keyof typeof services
    if (service && services[serviceKey]) {
      const config = services[serviceKey]
      const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = config.priceId
        ? { price: config.priceId, quantity: 1 }
        : {
            price_data: {
              currency: 'usd',
              product_data: {
                name: config.name,
                description: config.description,
                images: undefined,
              },
              unit_amount: config.amount,
            },
            quantity: 1,
          }
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [lineItem],
        mode: 'payment',
        success_url: `${baseUrl}/portal?success=true&service=${service}`,
        cancel_url: `${baseUrl}/subscribe?canceled=true&service=${service}`,
        client_reference_id: userId || undefined,
        metadata: { ...(userId && { userId }), service, ...(referralCode && { referralCode }) },
      })
      return NextResponse.json({ sessionId: session.id, url: session.url })
    }

    return NextResponse.json({ error: 'Invalid plan or service' }, { status: 400 })
  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
