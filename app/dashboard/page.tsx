'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Play, Settings, CreditCard } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [trails, setTrails] = useState<any[]>([])
  const [subscription, setSubscription] = useState<any>(null)

  useEffect(() => {
    // In a real app, fetch user data
    setUser({ name: 'User', email: 'user@example.com' })
    setTrails([
      {
        id: '1',
        name: 'Eagles Stadium Run',
        createdAt: new Date().toISOString(),
      },
    ])
    setSubscription({ plan: 'Pro', status: 'active' })
  }, [])

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
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 fitness-screen">
              Dashboard
            </h1>
            <p className="text-xl text-gray-300">Manage your trails and subscription</p>
          </div>

          {/* Subscription Status */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Subscription</h2>
                <p className="text-gray-300">
                  Plan: <span className="font-semibold text-blue-400">{subscription?.plan}</span>
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Status: <span className="capitalize">{subscription?.status}</span>
                </p>
              </div>
              <Link
                href="/subscribe"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                Manage Subscription
              </Link>
            </div>
          </div>

          {/* My Trails */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">My Trails</h2>
              <Link
                href="/create"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create New Trail
              </Link>
            </div>

            {trails.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
                <p className="text-gray-400 mb-4">You haven't created any trails yet.</p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                >
                  Create your first trail
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trails.map((trail) => (
                  <div
                    key={trail.id}
                    className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:border-blue-500/50 transition-colors"
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">{trail.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Created {new Date(trail.createdAt).toLocaleDateString()}
                    </p>
                    <Link
                      href={`/trails/${trail.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full justify-center transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      View Trail
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
