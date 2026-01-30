'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Play, Lock, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface Trail {
  id: string
  name: string
  description: string
  thumbnailUrl?: string
  duration?: number
  difficulty?: string
  tags: string[]
  isPublic: boolean
  requiresSubscription: boolean
}

export default function TrailsPage() {
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrails = async () => {
      try {
        const response = await fetch('/api/trails?public=true')
        if (!response.ok) throw new Error('Failed to fetch trails')
        const data = await response.json()
        setTrails(data.trails || [])
      } catch (error) {
        console.error('Error fetching trails:', error)
        // Fallback to sample data
        setTrails([
          {
            id: 'sample-1',
            name: 'Eagles Stadium Run',
            description: 'Run around the iconic Lincoln Financial Field with crowd sounds and stadium atmosphere',
            duration: 3600,
            difficulty: 'medium',
            tags: ['sports', 'stadium', 'urban'],
            isPublic: true,
            requiresSubscription: false,
          },
          {
            id: 'sample-2',
            name: 'Adventure Time - Land of Ooo',
            description: 'Explore the colorful and whimsical world of Adventure Time',
            duration: 2400,
            difficulty: 'easy',
            tags: ['fantasy', 'cartoon', 'adventure'],
            isPublic: true,
            requiresSubscription: true,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchTrails()
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

        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 fitness-screen">
                Browse Trails
              </h1>
              <p className="text-xl text-gray-300">
                Explore AI-generated trails or create your own
              </p>
            </div>
            <Link
              href="/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-5 h-5" />
              Create Trail
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p>Loading trails...</p>
          </div>
        ) : trails.length === 0 ? (
          <div className="text-center text-white py-20">
            <Sparkles className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No trails yet</h2>
            <p className="text-gray-400 mb-6">Be the first to create an amazing trail!</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Create Your First Trail
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trails.map((trail) => (
              <motion.div
                key={trail.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-blue-500/50 transition-colors"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 relative">
                  {trail.thumbnailUrl ? (
                    <Image
                      src={trail.thumbnailUrl}
                      alt={trail.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-16 h-16 text-white/50" />
                    </div>
                  )}
                  {trail.requiresSubscription && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Premium
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{trail.name}</h3>
                  <p className="text-gray-400 mb-4 text-sm line-clamp-2">{trail.description}</p>
                  
                  {/* Trail Stats */}
                  <div className="flex gap-4 mb-4 text-xs text-gray-500">
                    {trail.duration && (
                      <span>⏱️ {Math.floor(trail.duration / 60)} min</span>
                    )}
                    {trail.distance && (
                      <span>📏 {trail.distance} mi</span>
                    )}
                    {trail.difficulty && (
                      <span className="capitalize">💪 {trail.difficulty}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {trail.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {trail.tags.length > 3 && (
                        <span className="text-gray-500 text-xs">+{trail.tags.length - 3}</span>
                      )}
                    </div>
                    <Link
                      href={`/trails/${trail.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                    >
                      <Play className="w-4 h-4" />
                      View
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
