/**
 * App config from environment.
 * Set in your host (e.g. Netlify) or .env.local for dev.
 *
 * Free consultation / Calendly:
 * Set NEXT_PUBLIC_CALENDLY_URL to your existing Calendly (or booking) link.
 *
 * Academy (separate codebase):
 * Set NEXT_PUBLIC_ACADEMY_URL to the Academy site (e.g. https://academy.jlsolutions.io).
 * If set, nav and footer show an "Academy" link.
 */
export const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''
export const hasCalendly = Boolean(CALENDLY_URL?.startsWith('http'))

export const ACADEMY_URL = process.env.NEXT_PUBLIC_ACADEMY_URL ?? 'https://academy.jlsolutions.io'
export const hasAcademy = Boolean(ACADEMY_URL?.startsWith('http'))
