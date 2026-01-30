'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TrailChat from '@/components/TrailChat'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreatePage() {
  const router = useRouter()

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

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 fitness-screen">
              Design Your Trail
            </h1>
            <p className="text-xl text-gray-300">
              Tell our AI what kind of trail you want to create. Be creative!
            </p>
          </div>

          <TrailChat />
        </div>
      </div>
    </div>
  )
}
