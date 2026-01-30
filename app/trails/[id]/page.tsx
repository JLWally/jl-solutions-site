'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, Pause, Lock, Download } from 'lucide-react'

export default function TrailViewPage() {
  const params = useParams()
  const router = useRouter()
  const [trail, setTrail] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    // In a real app, fetch trail data
    setTrail({
      id: params.id,
      name: 'Eagles Stadium Run',
      description: 'Experience the thrill of running around Lincoln Financial Field with immersive crowd sounds and stadium atmosphere.',
      videoUrl: null, // Would be a video URL in production
      duration: 3600,
      distance: 3.5,
      difficulty: 'medium',
      tags: ['sports', 'stadium', 'urban'],
      requiresSubscription: false,
    })
    setHasAccess(true) // In real app, check subscription
  }, [params.id])

  if (!trail) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading trail...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Fitness Screen Optimized Player */}
      <div className="relative w-full h-screen">
        {/* Video/Visual Area - Optimized for large screens */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900">
          {/* In production, this would be a video element */}
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🏃</div>
              <p className="text-2xl font-semibold">{trail.name}</p>
              <p className="text-lg text-gray-300 mt-2">Trail video will play here</p>
            </div>
          </div>
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 fitness-screen">
                  {trail.name}
                </h1>
                <p className="text-gray-300">{trail.description}</p>
              </div>
              <Link
                href="/trails"
                className="text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-6 text-white">
              {trail.duration && (
                <div>
                  <span className="text-gray-400">Duration:</span>{' '}
                  <span className="font-semibold">
                    {Math.floor(trail.duration / 60)} min
                  </span>
                </div>
              )}
              {trail.distance && (
                <div>
                  <span className="text-gray-400">Distance:</span>{' '}
                  <span className="font-semibold">{trail.distance} mi</span>
                </div>
              )}
              {trail.difficulty && (
                <div>
                  <span className="text-gray-400">Difficulty:</span>{' '}
                  <span className="font-semibold capitalize">{trail.difficulty}</span>
                </div>
              )}
            </div>

            {/* Play Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg flex items-center gap-2 text-lg font-semibold transition-colors"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-6 h-6" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    Start Workout
                  </>
                )}
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-lg flex items-center gap-2 transition-colors">
                <Download className="w-5 h-5" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
