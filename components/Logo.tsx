'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  className?: string
  showText?: boolean
  showTagline?: boolean
  size?: 'small' | 'medium' | 'large'
}

export default function Logo({ className = '', showText = true, showTagline = true, size = 'medium' }: LogoProps) {
  // Logo image URL - JL Solutions logo
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || ''
  
  const sizeClasses = {
    small: 'w-16 h-16 md:w-20 md:h-20',
    medium: 'w-24 h-24 md:w-32 md:h-32',
    large: 'w-32 h-32 md:w-40 md:h-40'
  }

  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      {logoUrl && (
        <div className={`relative ${sizeClasses[size]} flex-shrink-0`}>
          <Image
            src={logoUrl}
            alt="JL Solutions Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      )}
      {showText && (
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold text-white">
            JL Solutions
          </div>
          {showTagline && (
            <div className="text-xs md:text-sm text-gray-400 mt-1 font-medium">
              Fix, Build, Manage Apps
            </div>
          )}
        </div>
      )}
    </Link>
  )
}
