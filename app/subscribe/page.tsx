'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Zap, Crown, Rocket } from 'lucide-react'
import { motion } from 'framer-motion'

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    interval: 'month',
    features: [
      '5 trail generations per month',
      'Access to public trails',
      'Standard video quality',
      'Basic customization',
    ],
    icon: Zap,
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    interval: 'month',
    features: [
      '20 trail generations per month',
      'Access to all premium trails',
      'HD video quality',
      'Advanced customization',
      'Priority support',
      'Download trails offline',
    ],
    icon: Crown,
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 39.99,
    interval: 'month',
    features: [
      'Unlimited trail generations',
      'Access to all premium trails',
      '4K video quality',
      'Full customization control',
      'Priority support',
      'Download trails offline',
      'Early access to new features',
      'Commercial license',
    ],
    icon: Rocket,
    popular: false,
  },
]

export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    // In a real app, this would redirect to Stripe checkout
    console.log('Subscribing to plan:', planId)
    // window.location.href = `/api/checkout?plan=${planId}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 fitness-screen">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-300">
              Unlock unlimited creativity with AI-powered trail design
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative bg-white/5 backdrop-blur-sm rounded-xl border-2 p-8 ${
                    plan.popular
                      ? 'border-blue-500 scale-105'
                      : 'border-white/10'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
                      <Icon className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-gray-400">/{plan.interval}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    Subscribe Now
                  </button>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-12 text-center text-gray-400 text-sm">
            <p>All plans include a 7-day free trial. Cancel anytime.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
