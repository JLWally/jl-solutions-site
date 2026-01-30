'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  className?: string
  showText?: boolean
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  // Logo image URL - update this after generating the logo
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || '/logo.svg'

  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10 md:w-12 md:h-12">
        <Image
          src={logoUrl}
          alt="TrailCrafter Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className="text-xl md:text-2xl font-bold text-white">
          TrailCrafter
        </span>
      )}
    </Link>
  )
}
