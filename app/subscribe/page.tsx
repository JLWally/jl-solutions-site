'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Wrench, Layout, Code, Bot, Phone, Shield, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'
import { CALENDLY_URL, hasCalendly } from '@/lib/config'
import { getStoredReferralCode } from '@/lib/referral'
import LeadCaptureModal from '@/components/LeadCaptureModal'

const serviceConfig: Record<string, { name: string; price: string; description: string; icon: typeof Wrench }> = {
  fix: {
    name: 'Fix my app',
    price: '$199',
    description: 'Bug fixes, performance, and support. One-time.',
    icon: Wrench,
  },
  manage: {
    name: 'Manage my app',
    price: '$99/mo',
    description: 'Updates, hosting, backups, monitoring. Subscription.',
    icon: Layout,
  },
  create: {
    name: 'Create an app',
    price: '$2,499',
    description: 'Design, development, and launch. One-time.',
    icon: Code,
  },
  ai: {
    name: 'AI automation',
    price: '$499',
    description: 'Chatbots, workflows, and AI integration. One-time.',
    icon: Bot,
  },
  consultation: {
    name: 'Free consultation',
    price: 'Free',
    description: '30-minute call. No obligation. We recommend the right service.',
    icon: Phone,
  },
}

export default function SubscribePage() {
  const [service, setService] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [consultationBooked, setConsultationBooked] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const s = params.get('service')
    if (s && serviceConfig[s]) setService(s)
  }, [])

  const handleServiceCheckout = async (serviceId: string) => {
    if (serviceId === 'consultation') {
      // Always capture lead first, then redirect to Calendly or show success
      setShowLeadModal(true)
      return
    }
    try {
      setLoading(true)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(serviceId === 'manage' ? { plan: 'manage' } : { service: serviceId }),
          ref: getStoredReferralCode(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setLoading(false)
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  // Single-service view (from /services or direct link)
  if (service) {
    const config = serviceConfig[service]
    const Icon = config.icon
    const isFree = service === 'consultation'
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/portal/services"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>

          <div className="max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border-2 border-white/10 p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{config.name}</h1>
                  <p className="text-2xl font-bold text-blue-400">{config.price}</p>
                </div>
              </div>
              <p className="text-gray-400 mb-8">{config.description}</p>

              <div className="flex flex-wrap gap-3 mb-6">
                <span className="flex items-center gap-2 text-gray-500 text-sm">
                  <Shield className="w-4 h-4 text-green-400" />
                  Secure payment
                </span>
                {!isFree && (
                  <span className="flex items-center gap-2 text-gray-500 text-sm">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    Card accepted
                  </span>
                )}
              </div>

              {consultationBooked ? (
                <div className="py-4 px-4 rounded-xl bg-green-500/20 border border-green-500/30 text-center">
                  <p className="text-green-300 font-medium">Thanks! We&apos;ll be in touch within one business day to schedule your call.</p>
                  {hasCalendly && (
                    <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm">
                      Or book now with our scheduler →
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleServiceCheckout(service)}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                      isFree ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {loading ? 'Please wait...' : isFree ? 'Book your free call' : 'Pay securely — continue to checkout'}
                  </button>
                  {!hasCalendly && service === 'consultation' && (
                    <p className="text-gray-500 text-sm mt-4 text-center">
                      Add your Calendly link: set <code className="bg-white/10 px-1 rounded">NEXT_PUBLIC_CALENDLY_URL</code> in your environment to your booking URL.
                    </p>
                  )}
                </>
              )}

              <LeadCaptureModal
                isOpen={showLeadModal}
                onClose={() => setShowLeadModal(false)}
                onSuccess={() => {
                  setShowLeadModal(false)
                  setConsultationBooked(true)
                  if (hasCalendly && CALENDLY_URL) {
                    window.location.href = CALENDLY_URL
                  }
                }}
                source="consultation"
                title="Book your free consultation"
                submitLabel={hasCalendly ? 'Continue to booking' : 'Submit'}
              />
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  // Services grid view (default)
  const services = ['fix', 'manage', 'create', 'ai', 'consultation'] as const
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              JL Solutions Services
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              Fix, build, manage, and automate your apps
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                Secure payment
              </span>
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                Free consultation available
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((serviceId) => {
              const config = serviceConfig[serviceId]
              const Icon = config.icon
              const isFree = serviceId === 'consultation'
              return (
                <motion.div
                  key={serviceId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-sm rounded-xl border-2 border-white/10 p-6 hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{config.name}</h3>
                      <p className="text-lg font-semibold text-blue-400">{config.price}</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-6">{config.description}</p>
                  <button
                    onClick={() => handleServiceCheckout(serviceId)}
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                      isFree
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isFree ? 'Book free call' : 'Get started'}
                  </button>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-12 text-center text-gray-400 text-sm">
            <p>Not sure which service you need? Start with a free consultation.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
