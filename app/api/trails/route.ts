import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const publicOnly = searchParams.get('public') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch public trails or all trails
    const where = publicOnly ? { isPublic: true } : {}

    const trails = await prisma.trail.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailUrl: true,
        duration: true,
        distance: true,
        difficulty: true,
        tags: true,
        isPublic: true,
        createdAt: true,
      },
    })

    // If no trails in database, return sample trails
    if (trails.length === 0) {
      return NextResponse.json({
        trails: [
          {
            id: 'sample-1',
            name: 'Eagles Stadium Run',
            description: 'Run around the iconic Lincoln Financial Field with crowd sounds and stadium atmosphere. Experience the energy of game day as you complete your workout.',
            thumbnailUrl: null,
            duration: 3600,
            distance: 3.5,
            difficulty: 'medium',
            tags: ['sports', 'stadium', 'urban', 'motivational'],
            isPublic: true,
            requiresSubscription: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sample-2',
            name: 'Adventure Time - Land of Ooo',
            description: 'Explore the colorful and whimsical world of Adventure Time. Run through the Candy Kingdom, past the Tree Fort, and into the Land of Ooo.',
            thumbnailUrl: null,
            duration: 2400,
            distance: 2.5,
            difficulty: 'easy',
            tags: ['fantasy', 'cartoon', 'adventure', 'fun'],
            isPublic: true,
            requiresSubscription: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sample-3',
            name: 'Japanese Cherry Blossom Forest',
            description: 'A serene run through a beautiful cherry blossom forest in spring. Experience the tranquility of nature with pink petals falling around you.',
            thumbnailUrl: null,
            duration: 1800,
            distance: 2.0,
            difficulty: 'easy',
            tags: ['nature', 'peaceful', 'spring', 'japan'],
            isPublic: true,
            requiresSubscription: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sample-4',
            name: 'Mountain Sunrise Trail',
            description: 'Climb through mountain trails as the sun rises. Experience breathtaking views and challenging terrain perfect for your morning workout.',
            thumbnailUrl: null,
            duration: 4200,
            distance: 5.0,
            difficulty: 'hard',
            tags: ['mountain', 'sunrise', 'challenging', 'scenic'],
            isPublic: true,
            requiresSubscription: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sample-5',
            name: 'Urban Night Run',
            description: 'Run through a vibrant cityscape at night. Neon lights, bustling streets, and the energy of the city keep you motivated through your workout.',
            thumbnailUrl: null,
            duration: 3000,
            distance: 4.0,
            difficulty: 'medium',
            tags: ['urban', 'night', 'city', 'energetic'],
            isPublic: true,
            requiresSubscription: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sample-6',
            name: 'Tropical Beach Paradise',
            description: 'Run along pristine white sand beaches with crystal clear turquoise water. Feel the ocean breeze as you complete your coastal workout.',
            thumbnailUrl: null,
            duration: 2700,
            distance: 3.0,
            difficulty: 'easy',
            tags: ['beach', 'tropical', 'relaxing', 'ocean'],
            isPublic: true,
            requiresSubscription: true,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 6,
      })
    }

    // Transform trails to include requiresSubscription
    const transformedTrails = trails.map((trail) => ({
      ...trail,
      requiresSubscription: false, // In real app, check subscription requirements
    }))

    const total = await prisma.trail.count({ where })

    return NextResponse.json({
      trails: transformedTrails,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching trails:', error)
    // Return sample data on error
    return NextResponse.json({
      trails: [
        {
          id: 'sample-1',
          name: 'Eagles Stadium Run',
          description: 'Run around the iconic Lincoln Financial Field with crowd sounds and stadium atmosphere.',
          thumbnailUrl: null,
          duration: 3600,
          distance: 3.5,
          difficulty: 'medium',
          tags: ['sports', 'stadium', 'urban'],
          isPublic: true,
          requiresSubscription: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sample-2',
          name: 'Adventure Time - Land of Ooo',
          description: 'Explore the colorful and whimsical world of Adventure Time.',
          thumbnailUrl: null,
          duration: 2400,
          distance: 2.5,
          difficulty: 'easy',
          tags: ['fantasy', 'cartoon', 'adventure'],
          isPublic: true,
          requiresSubscription: true,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 2,
    })
  }
}
