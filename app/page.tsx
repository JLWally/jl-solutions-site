import Link from 'next/link'
import { ArrowRight, Wrench, Layout, Code, Bot, Phone, Compass, Briefcase } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* About JL Solutions — hero with blue background (no header image) */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            About JL Solutions
          </h1>
          <p className="text-xl md:text-2xl text-blue-200/90 font-medium mb-6">
            Operations optimization and automation services. From complexity to clarity.
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            We help organizations transform their operations with AI-powered solutions and intelligent automation. Our approach combines technical expertise with business acumen to deliver solutions that drive real results.
          </p>
        </div>
      </section>

      {/* Sales funnel: Discover → Explore → Get started */}
      <section className="container mx-auto px-4 py-12 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">How to get started</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/portal"
              className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-colors text-center group"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Compass className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Discover</h3>
              <p className="text-gray-400 text-sm mb-4">Partner & seller portal, get-started guide, and onboarding.</p>
              <span className="text-blue-400 text-sm font-medium inline-flex items-center gap-1">
                Go to portal <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              href="/subscribe"
              className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-colors text-center group"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Briefcase className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">2. Explore services</h3>
              <p className="text-gray-400 text-sm mb-4">Fix, manage, create app, AI automation, or free consultation.</p>
              <span className="text-blue-400 text-sm font-medium inline-flex items-center gap-1">
                View services <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              href="/subscribe?service=consultation"
              className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-colors text-center group"
            >
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30 transition-colors">
                <Phone className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Get started</h3>
              <p className="text-gray-400 text-sm mb-4">Book a free 30-minute call or choose a service and pay in one click.</p>
              <span className="text-green-400 text-sm font-medium inline-flex items-center gap-1">
                Book free call <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <p className="mt-8 text-center text-gray-400 text-sm">
            Partners: <Link href="/portal" className="text-blue-400 hover:text-blue-300 font-medium">Open the portal</Link> for leads and the referral program.
          </p>
        </div>
      </section>

      {/* Services grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">What we offer</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="bg-amber-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fix my app</h3>
              <p className="text-gray-400 text-sm">
                Bugs, crashes, slow performance — we diagnose and fix. From $199.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="bg-blue-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Layout className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Manage my app</h3>
              <p className="text-gray-400 text-sm">
                Updates, hosting, backups, monitoring. From $99/mo.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="bg-green-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Create an app</h3>
              <p className="text-gray-400 text-sm">
                From idea to launch. We design, build, and deliver. From $2,499.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI automation</h3>
              <p className="text-gray-400 text-sm">
                Chatbots, workflows, AI integrations. From $499.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/subscribe?service=consultation"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
            >
              <Phone className="w-4 h-4" />
              Free consultation — book a call
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
