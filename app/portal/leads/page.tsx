'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Calendar, MessageSquare, Sparkles } from 'lucide-react'

type Lead = {
  id: string
  email: string
  name: string | null
  source: string
  referralCode: string | null
  message: string | null
  status: string
  aiSummary: string | null
  createdAt: string
}

export default function PortalLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'consultation'>('all')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filter === 'new') params.set('status', 'new')
    if (filter === 'consultation') params.set('source', 'consultation')
    fetch(`/api/leads?${params}`)
      .then((res) => res.json())
      .then((data) => setLeads(data.leads || []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [filter])

  const formatDate = (s: string) => {
    const d = new Date(s)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to portal
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Leads</h1>
        <p className="text-gray-400 mb-6">
          Consultation and contact form leads. AI summaries appear shortly after each lead is captured.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'new', 'consultation'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'new' ? 'New only' : 'Consultation'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading leads…</p>
        ) : leads.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400">
            No leads yet. They’ll appear here when someone submits the free consultation form or contact form.
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{lead.name || 'No name'}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">{lead.source}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">{lead.status}</span>
                    </div>
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      {lead.email}
                    </a>
                    {lead.message && (
                      <p className="mt-2 text-gray-400 text-sm flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {lead.message}
                      </p>
                    )}
                    {lead.aiSummary && (
                      <p className="mt-2 text-green-300/90 text-sm flex items-start gap-2">
                        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {lead.aiSummary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar className="w-4 h-4" />
                    {formatDate(lead.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
