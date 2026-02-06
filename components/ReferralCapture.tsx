'use client'

import { useEffect } from 'react'
import { setStoredReferralCode } from '@/lib/referral'

export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref && ref.trim()) setStoredReferralCode(ref.trim())
  }, [])
  return null
}
