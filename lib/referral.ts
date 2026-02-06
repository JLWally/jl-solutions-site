const REFERRAL_STORAGE_KEY = 'jl_referral'

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(REFERRAL_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredReferralCode(code: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, code)
  } catch {
    // ignore
  }
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
  } catch {
    // ignore
  }
}
