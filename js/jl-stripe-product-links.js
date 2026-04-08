/**
 * Central Stripe Payment Link URLs (product slug → checkout).
 * Used by /get-started after pre-checkout intake; keep in sync with Stripe Dashboard.
 *
 * After purchase, buyers must land on post-purchase intake. In Stripe Dashboard → each Payment Link
 * → After payment → Don’t show confirmation page → Use your own success page, set URL to:
 *   https://YOUR_PRODUCTION_DOMAIN/onboarding?service=quick-setup
 *   https://YOUR_PRODUCTION_DOMAIN/onboarding?service=priority-quick-setup
 *   https://YOUR_PRODUCTION_DOMAIN/onboarding?service=full-system-deposit
 *   https://YOUR_PRODUCTION_DOMAIN/onboarding?service=ai-intake
 *   https://YOUR_PRODUCTION_DOMAIN/onboarding?service=fix-app
 *   https://YOUR_PRODUCTION_DOMAIN/onboarding?service=scheduling
 *   https://YOUR_PRODUCTION_DOMAIN/onboarding?service=lead-engine
 * (Netlify maps /onboarding → onboarding/index.html; query locks the right package in the form.)
 *
 * Legacy /get-started slugs `fix-my-app` and `ai-intake` reuse the Quick Setup and Full System Deposit
 * checkout links above; each Payment Link still needs its own success URL in Stripe (quick-setup vs full-system-deposit).
 *
 * Verify each Payment Link success URL uses the onboarding *service* slug (not the keys below):
 * | Link key in stripeLinks   | Stripe Dashboard success URL must end with        |
 * |---------------------------|---------------------------------------------------|
 * | quick-setup               | /onboarding?service=quick-setup                   |
 * | priority-quick-setup      | /onboarding?service=priority-quick-setup        |
 * | full-system-deposit       | /onboarding?service=full-system-deposit         |
 * | ai-intake                 | /onboarding?service=ai-intake                   |
 * | fix-my-app                | /onboarding?service=fix-app                     |
 * | scheduling                | /onboarding?service=scheduling                  |
 * | lead-gen                  | /onboarding?service=lead-engine                 |
 */
(function (global) {
  'use strict';

  /** Slug → Stripe Payment Link (single source for checkout redirects) */
  var stripeLinks = {
    'quick-setup': 'https://buy.stripe.com/9B614g1LO2wA7Vs2ZN3Ru04',
    'priority-quick-setup': 'https://buy.stripe.com/bJedR26245IMa3Abwj3Ru05',
    'full-system-deposit': 'https://buy.stripe.com/8x23co4Y03AEgrYdEr3Ru06',
    'ai-intake': 'https://buy.stripe.com/8x23co4Y03AEgrYdEr3Ru06',
    'fix-my-app': 'https://buy.stripe.com/9B614g1LO2wA7Vs2ZN3Ru04',
    'lead-gen': 'https://buy.stripe.com/3cIfZacqsgnq6Ro6bZ3Ru03',
    scheduling: 'https://buy.stripe.com/7sYcMY8acc7aejQ0RF3Ru02',
  };

  global.JL_STRIPE_PRODUCT_LINKS = stripeLinks;
  global.JL_STRIPE_LINKS = stripeLinks;

  /** Legacy keys for any page that still references STRIPE_LINK_* */
  global.JL_SERVICE_STRIPE_LINKS = {
    STRIPE_LINK_FIX_MY_APP: stripeLinks['fix-my-app'],
    STRIPE_LINK_AI_INTAKE: stripeLinks['ai-intake'],
    STRIPE_LINK_SCHEDULING: stripeLinks.scheduling,
    STRIPE_LINK_LEAD_ENGINE: stripeLinks['lead-gen'],
  };
})(typeof window !== 'undefined' ? window : globalThis);
