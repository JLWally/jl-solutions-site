'use client'

import Link from 'next/link'
import { ArrowRight, Compass, Briefcase, BookOpen, ClipboardCheck, DollarSign, Users } from 'lucide-react'
import { motion } from 'framer-motion'

const cards = [
  { href: '/portal/leads', label: 'Leads', description: 'View and follow up on free consultation and contact form leads. AI summaries included.', icon: Users },
  { href: '/portal/referral', label: 'Earn 45% commission', description: 'Get your referral link. First 2 months: 45% on every sale you refer.', icon: DollarSign },
  { href: '/portal/get-started', label: 'Get started', description: 'Step-by-step guide for new partners and sellers.', icon: Compass },
  { href: '/portal/services', label: 'Services', description: 'Fix, manage, create app, AI automation, and free consultation.', icon: Briefcase },
  { href: '/portal/onboarding', label: 'Onboarding', description: 'Guide, docs, slides, welcome video, and pitches.', icon: BookOpen },
  { href: '/portal/eligibility', label: 'Eligibility wizard', description: 'Check client eligibility and qualify leads.', icon: ClipboardCheck },
]

export default function PortalPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Seller & referral portal
          </h1>
          <p className="text-gray-400">
            Use the tools below to sell JL Solutions services, onboard clients, and qualify leads.
          </p>
        </motion.div>

        <div className="grid gap-4">
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={card.href}
                  className="flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white">{card.label}</h2>
                    <p className="text-sm text-gray-400">{card.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
