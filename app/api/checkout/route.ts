import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const plans = {
  basic: {
    priceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic',
    amount: 999, // $9.99
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    amount: 1999, // $19.99
  },
  premium: {
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium',
    amount: 3999, // $39.99
  },
}

export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = await req.json()

    if (!plan || !plans[plan as keyof typeof plans]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    const selectedPlan = plans[plan as keyof typeof plans]

    // In production, you'd get the user from session/auth
    // For now, we'll create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe?canceled=true`,
      client_reference_id: userId, // To identify the user
      metadata: {
        userId,
        plan,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
