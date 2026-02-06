'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wrench, Layout, Code, Bot, Phone, Check, ArrowRight, Shield, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'

const services = [
  {
    id: 'fix',
    name: 'Fix my app',
    tagline: 'Bugs, crashes, and performance—we fix it.',
    description: 'Your app has issues? We diagnose, fix bugs, improve performance, and get you back on track. One-time fix or ongoing support.',
    icon: Wrench,
    price: 'From $199',
    type: 'one-time',
    features: ['Bug fixes & debugging', 'Performance optimization', 'Security patches', 'Quick turnaround'],
    cta: 'Get a quote',
    popular: false,
  },
  {
    id: 'manage',
    name: 'Manage my app',
    tagline: 'Hands-off maintenance so you can focus on your business.',
    description: 'We handle updates, hosting, backups, and monitoring. Your app stays secure and up to date without you lifting a finger.',
    icon: Layout,
    price: 'From $99/mo',
    type: 'subscription',
    features: ['Updates & security', 'Hosting & backups', '24/7 monitoring', 'Monthly reports'],
    cta: 'Start management',
    popular: true,
  },
  {
    id: 'create',
    name: 'Create an app',
    tagline: 'From idea to launch—we build it for you.',
    description: 'Have an idea? We design, develop, and launch your web or mobile app. No technical background needed.',
    icon: Code,
    price: 'From $2,499',
    type: 'one-time',
    features: ['Design & development', 'Web & mobile', 'Launch & handoff', 'Documentation'],
    cta: 'Start a project',
    popular: false,
  },
  {
    id: 'ai',
    name: 'AI automation',
    tagline: 'Add AI and automation to save time and scale.',
    description: 'Integrate chatbots, workflows, and AI features into your existing app or build new automated solutions.',
    icon: Bot,
    price: 'From $499',
    type: 'one-time',
    features: ['Chatbots & assistants', 'Workflow automation', 'AI integrations', 'Custom models'],
    cta: 'Explore AI options',
    popular: false,
  },
  {
    id: 'consultation',
    name: 'Free consultation',
    tagline: 'Not sure where to start? Let’s talk.',
    description: '30-minute call. We listen to your goals, answer questions, and recommend the right service—no obligation, no payment.',
    icon: Phone,
    price: 'Free',
    type: 'free',
    features: ['30-min video call', 'No obligation', 'Custom recommendations', 'Quick scheduling'],
    cta: 'Book free call',
    popular: false,
  },
]

export default function PortalServicesPage() {
  const [selectedService, setSelectedService] = useState<string | null>(null)

  const handleServiceCta = (service: (typeof services)[0]) => {
    if (service.id === 'consultation') {
      window.location.href = '/subscribe?service=consultation'
      return
    }
    setSelectedService(service.id)
    window.location.href = `/subscribe?service=${service.id}`
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 fitness-screen">
            Services
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            Whether you need a fix, a new app, AI, or just advice—we’ve got you. Start with a free consultation or pick a service below.
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-6 mb-12 text-gray-400 text-sm">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            Secure payment
          </span>
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            No hidden fees
          </span>
          <span>Cancel anytime (subscriptions)</span>
        </div>

        <div className="space-y-6">
          {services.map((service, index) => {
            const Icon = service.icon
            const isFree = service.type === 'free'
            return (
              <motion.section
                key={service.id}
                id={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative bg-white/5 backdrop-blur-sm rounded-2xl border-2 p-6 md:p-8 ${
                  service.popular ? 'border-blue-500' : 'border-white/10'
                }`}
              >
                {service.popular && (
                  <div className="absolute -top-3 left-6 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Most popular
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">{service.name}</h2>
                    <p className="text-blue-300 font-medium mb-2">{service.tagline}</p>
                    <p className="text-gray-400 mb-4">{service.description}</p>
                    <ul className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
                      {service.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-300">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-2xl font-bold text-white">{service.price}</span>
                      <button
                        onClick={() => handleServiceCta(service)}
                        disabled={selectedService !== null}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                          isFree
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : service.popular
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {service.cta}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">New here? Start with our onboarding.</p>
          <Link
            href="/portal/get-started"
            className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-2"
          >
            Get started guide
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
