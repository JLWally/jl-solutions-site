/**
 * App config from environment.
 * Set in your host (e.g. Netlify) or .env.local for dev.
 *
 * Free consultation / Calendly:
 * Set NEXT_PUBLIC_CALENDLY_URL to your existing Calendly (or booking) link.
 * Example: https://calendly.com/yourname/30min
 * Then "Book your free call" will link there. No other setup needed.
 */
export const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''
export const hasCalendly = Boolean(CALENDLY_URL?.startsWith('http'))
