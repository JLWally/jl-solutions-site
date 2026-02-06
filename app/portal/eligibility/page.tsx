'use client'

import Link from 'next/link'
import { ClipboardCheck, ArrowRight } from 'lucide-react'

export default function EligibilityPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Eligibility wizard</h1>
          <p className="text-gray-400 mb-8">
            Use this to check client eligibility and qualify leads for JL Solutions services. You can add questions, scoring, and recommendations here.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            This is a placeholder. Add your eligibility flow (e.g. form steps, logic, or link to an external tool).
          </p>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
          >
            Back to portal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
