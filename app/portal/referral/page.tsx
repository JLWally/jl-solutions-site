'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DollarSign, Copy, Check, ArrowRight } from 'lucide-react'

const COMMISSION_PCT = 45
const COMMISSION_MONTHS = 2

export default function ReferralPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [referralUrl, setReferralUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setReferralUrl(data.referralUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get your link')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Earn {COMMISSION_PCT}% commission
          </h1>
          <p className="text-gray-400 text-lg">
            For the first {COMMISSION_MONTHS} months, every sale you refer pays you {COMMISSION_PCT}%. Share your link, get paid when clients buy.
          </p>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-10">
          <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-400" />
            How it works
          </h2>
          <ul className="space-y-2 text-gray-300">
            <li>• Get your unique referral link below.</li>
            <li>• Share it with clients (email, social, your site).</li>
            <li>• When they pay for a service or plan, you earn {COMMISSION_PCT}% of the sale.</li>
            <li>• This rate applies for the first {COMMISSION_MONTHS} months of the program.</li>
            <li>• We track sales and pay you out on the schedule we agree with you.</li>
          </ul>
        </div>

        {!referralUrl ? (
          <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white mb-4">Get your referral link</h2>
            <p className="text-gray-400 text-sm mb-6">
              Enter your name and email. We’ll generate a link you can share. When someone signs up or pays via your link, you get credit.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="ref-name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  id="ref-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="ref-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  id="ref-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating your link…' : `Get my ${COMMISSION_PCT}% referral link`}
            </button>
          </form>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white mb-2">Your referral link</h2>
            <p className="text-gray-400 text-sm mb-4">
              Share this link. When someone clicks it and later pays, you earn {COMMISSION_PCT}%.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white text-sm"
              />
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Already have a link? If you lost it, use the same name and email above to get a new one (we may reuse your existing code).
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/portal/services"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
          >
            View services you can refer
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
