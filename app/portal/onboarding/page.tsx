'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  FileText,
  Presentation,
  Video,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Play,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDES = [
  { title: 'Welcome', content: 'We help you fix, build, manage, and automate apps—and we offer a free consultation so you can start with zero risk.' },
  { title: 'Fix my app', content: 'Bugs, crashes, slow performance? We diagnose and fix. One-time or ongoing support. From $199.' },
  { title: 'Manage my app', content: 'We handle updates, hosting, backups, and monitoring. You focus on your business. From $99/mo.' },
  { title: 'Create an app', content: 'From idea to launch. We design, develop, and deliver. Web and mobile. From $2,499.' },
  { title: 'AI automation', content: 'Chatbots, workflows, AI integrations. Make your app smarter and save time. From $499.' },
  { title: 'Free consultation', content: '30-minute call. We listen, advise, and recommend the right service. No obligation. Book anytime.' },
  { title: 'Next step', content: 'Go to Services, pick what you need, and pay in one click. Or book a free call first. We’re here to help.' },
]

const PITCHES = [
  { name: 'Elevator pitch (30 sec)', text: 'We fix apps, build new ones, manage them for you, and add AI—so you don’t need to be technical. Start with a free 30-minute consultation, or pick a service and pay in one click.' },
  { name: 'For "I need my app fixed"', text: 'Send us your app and what’s wrong. We debug, optimize, and patch. One-time fix or ongoing support. Clear pricing, no surprises.' },
  { name: 'For "I want an app"', text: 'Tell us your idea. We design, develop, and launch it. You get a working app and documentation. No coding required on your side.' },
  { name: 'For "I want AI / automation"', text: 'We add chatbots, workflows, and AI features to your existing app—or build new automated tools. You get more done with less manual work.' },
  { name: 'For "I’m not sure what I need"', text: 'Book a free 30-minute call. We’ll listen, ask questions, and recommend the right service. No obligation and no payment.' },
]

export default function PortalOnboardingPage() {
  const [slideIndex, setSlideIndex] = useState(0)

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-8">
          <a href="#welcome-video" className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:text-white text-sm">Video</a>
          <a href="#guide" className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:text-white text-sm">Guide</a>
          <a href="#docs" className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:text-white text-sm">Docs</a>
          <a href="#slides" className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:text-white text-sm">Slides</a>
          <a href="#pitches" className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:text-white text-sm">Pitches</a>
        </div>

        <section id="welcome-video" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-400" />
            Welcome video
            <span className="text-sm font-normal text-gray-500">(optional)</span>
          </h2>
          <div className="aspect-video bg-black/40 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/30 flex items-center justify-center">
                <Play className="w-10 h-10 text-blue-400 ml-1" />
              </div>
              <p className="text-gray-400 max-w-md">
                Add a short welcome video when you’re ready. Until then, use the guide and slides below to get started.
              </p>
              <p className="text-sm text-gray-500">
                When you have a link: replace this block with an iframe (e.g. YouTube or Vimeo embed).
              </p>
            </div>
          </div>
        </section>

        <section id="guide" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            Getting started guide
          </h2>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 md:p-8 prose prose-invert prose-p:text-gray-300 prose-li:text-gray-300 max-w-none">
            <h3 className="text-xl font-semibold text-white mt-0">1. Watch the welcome video</h3>
            <p>Take 3 minutes to watch the welcome video above. It covers what we offer and who we’re for.</p>
            <h3 className="text-xl font-semibold text-white">2. Decide what you need</h3>
            <ul>
              <li><strong>Fix my app</strong> — Something’s broken or slow. We fix it.</li>
              <li><strong>Manage my app</strong> — You want updates, hosting, and monitoring handled.</li>
              <li><strong>Create an app</strong> — You have an idea; we build and launch it.</li>
              <li><strong>AI automation</strong> — You want chatbots, workflows, or AI in your app.</li>
              <li><strong>Free consultation</strong> — Not sure? Book a free 30-min call.</li>
            </ul>
            <h3 className="text-xl font-semibold text-white">3. Go to Services</h3>
            <p>On the <Link href="/portal/services" className="text-blue-400 hover:text-blue-300">Services</Link> page you’ll see each option with pricing and a clear “Get started” or “Book free call” button.</p>
            <h3 className="text-xl font-semibold text-white">4. Pay or book</h3>
            <p>For paid services you’ll go to a secure checkout. For the free consultation you’ll pick a time—no payment required.</p>
            <h3 className="text-xl font-semibold text-white">5. We’ll reach out</h3>
            <p>After payment or booking we’ll contact you to confirm details and next steps. You’re not alone—we guide you through the process.</p>
          </div>
        </section>

        <section id="docs" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-400" />
            Documentation
          </h2>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Payment & checkout</h3>
              <p className="text-gray-400">We use Stripe. You can pay by card. Subscriptions can be canceled anytime from your dashboard. One-time services are charged once.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Free consultation</h3>
              <p className="text-gray-400">No credit card needed. Choose a time, we send a link, and we talk for 30 minutes. We’ll recommend the right service and answer your questions.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Service delivery</h3>
              <p className="text-gray-400">After you purchase we’ll email you with next steps. For fixes and builds we’ll ask for access (e.g. code repo or staging URL). For management we’ll set up monitoring and report monthly.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Support</h3>
              <p className="text-gray-400">Reply to any email from us or use the contact method we give you after signup. We aim to respond within one business day.</p>
            </div>
          </div>
        </section>

        <section id="slides" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Presentation className="w-6 h-6 text-purple-400" />
            Overview slides
          </h2>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-12 min-h-[280px] flex flex-col justify-center"
              >
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">{SLIDES[slideIndex].title}</h3>
                <p className="text-xl text-gray-300">{SLIDES[slideIndex].content}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
              <button onClick={() => setSlideIndex((i) => (i === 0 ? SLIDES.length - 1 : i - 1))} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" /> Previous
              </button>
              <span className="text-gray-500 text-sm">{slideIndex + 1} / {SLIDES.length}</span>
              <button onClick={() => setSlideIndex((i) => (i === SLIDES.length - 1 ? 0 : i + 1))} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                Next <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        <section id="pitches" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-amber-400" />
            Pitches & messaging
          </h2>
          <p className="text-gray-400 mb-6">Use these when explaining what you do—on the site, in emails, or on a call.</p>
          <div className="space-y-4">
            {PITCHES.map((p) => (
              <div key={p.name} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{p.name}</h3>
                <p className="text-gray-300">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Link href="/portal/services" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
            View services & get started
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
