import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const plan = session.metadata?.plan
        const service = session.metadata?.service
        const referralCode = session.metadata?.referralCode as string | undefined
        const amountTotal = session.amount_total ?? 0 // cents

        // Referral: attribute sale to partner and record commission (45% for first two months)
        if (referralCode && amountTotal > 0) {
          const partner = await prisma.partner.findUnique({
            where: { referralCode: referralCode.toLowerCase() },
          })
          if (partner) {
            const commissionCents = Math.floor((amountTotal * partner.commissionPct) / 100)
            await prisma.referralSale.create({
              data: {
                partnerId: partner.id,
                stripeSessionId: session.id,
                amountCents: amountTotal,
                commissionCents: commissionCents,
                status: 'pending',
                planOrService: plan ?? service ?? undefined,
              },
            })
          }
        }

        // Subscription: create/update subscription record
        if (plan) {
          let userId = session.metadata?.userId as string | undefined
          if (!userId) {
            const email =
              session.customer_details?.email ??
              session.customer_email ??
              null
            if (email) {
              let user = await prisma.user.findUnique({ where: { email } })
              if (!user) {
                user = await prisma.user.create({
                  data: {
                    email,
                    name: session.customer_details?.name ?? undefined,
                  },
                })
              }
              userId = user.id
            }
          }
          if (userId) {
            await prisma.subscription.upsert({
              where: { userId },
              create: {
                userId,
                stripeId: session.subscription as string,
                status: 'active',
                plan,
                currentPeriodEnd: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ),
              },
              update: {
                stripeId: session.subscription as string,
                status: 'active',
                plan,
                currentPeriodEnd: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ),
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await prisma.subscription.updateMany({
          where: { stripeId: subscription.id },
          data: {
            status: subscription.status,
            currentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
          },
        })
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
