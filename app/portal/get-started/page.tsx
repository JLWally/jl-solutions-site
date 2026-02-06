'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Video, FileText, Presentation, MessageCircle, Wrench, Layout, Code, Bot, Phone } from 'lucide-react'
import { motion } from 'framer-motion'

const steps = [
  {
    title: 'Watch the welcome video',
    description: 'A quick 3-minute overview of what we offer and how we can help you.',
    icon: Video,
    href: '/portal/onboarding#welcome-video',
    cta: 'Watch now',
  },
  {
    title: 'Read the getting started guide',
    description: 'Step-by-step guide for beginners. No tech experience needed.',
    icon: BookOpen,
    href: '/portal/onboarding#guide',
    cta: 'Open guide',
  },
  {
    title: 'Choose your service',
    description: 'Fix an app, get one built, manage it, add AI, or book a free consultation.',
    icon: Wrench,
    href: '/portal/services',
    cta: 'View services',
  },
  {
    title: 'Book or pay with one click',
    description: 'Secure checkout. Free consultation has no payment—just pick a time.',
    icon: MessageCircle,
    href: '/subscribe',
    cta: 'Get started',
  },
]

const servicesPreview = [
  { name: 'Fix my app', icon: Wrench, href: '/portal/services#fix' },
  { name: 'Manage my app', icon: Layout, href: '/portal/services#manage' },
  { name: 'Create an app', icon: Code, href: '/portal/services#create' },
  { name: 'AI automation', icon: Bot, href: '/portal/services#ai' },
  { name: 'Free consultation', icon: Phone, href: '/portal/services#consultation' },
]

export default function PortalGetStartedPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 fitness-screen">
            Welcome — Start Here
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            You’re in the right place. Follow these four steps and you’ll be set up in minutes.
          </p>
          <Link
            href="/portal/onboarding#welcome-video"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Video className="w-5 h-5" />
            Watch welcome video first
          </Link>
        </motion.div>

        <div className="space-y-6 mb-16">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-400">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white mb-1">{step.title}</h2>
                  <p className="text-gray-400">{step.description}</p>
                </div>
                <Link
                  href={step.href}
                  className="flex-shrink-0 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
                >
                  {step.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Our services at a glance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {servicesPreview.map((s) => {
              const Icon = s.icon
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  <Icon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span className="text-white font-medium">{s.name}</span>
                  <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
                </Link>
              )
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/portal/onboarding#guide"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors"
          >
            <BookOpen className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-white block">Guide</span>
              <span className="text-sm text-gray-400">Step-by-step</span>
            </div>
          </Link>
          <Link
            href="/portal/onboarding#docs"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors"
          >
            <FileText className="w-8 h-8 text-green-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-white block">Docs</span>
              <span className="text-sm text-gray-400">Reference</span>
            </div>
          </Link>
          <Link
            href="/portal/onboarding#slides"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors"
          >
            <Presentation className="w-8 h-8 text-purple-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-white block">Slides</span>
              <span className="text-sm text-gray-400">Overview</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
