import Link from 'next/link'
import { ArrowRight, Sparkles, Mountain, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full mb-8">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Trail Design</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 fitness-screen">
            Design Your Dream Trail
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Talk to AI and create custom virtual trails for your Peloton, treadmill, or bike. 
            Run around the Eagles stadium, explore Adventure Time worlds, or design your perfect route.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              Create Your Trail
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/trails"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg text-lg font-semibold border border-white/20 transition-colors"
            >
              Browse Trails
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="bg-blue-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Design</h3>
              <p className="text-gray-400">
                Simply describe your dream trail and our AI will create it for you
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="bg-green-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Mountain className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Endless Possibilities</h3>
              <p className="text-gray-400">
                From real-world locations to fantasy worlds, create anything you imagine
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Fitness Optimized</h3>
              <p className="text-gray-400">
                Perfectly formatted for Peloton, treadmills, and all fitness screens
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
