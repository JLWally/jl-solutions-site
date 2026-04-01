/**
 * Central Stripe Payment Link URLs (product slug → checkout).
 * Used by /get-started after intake; keep in sync with Stripe Dashboard.
 */
(function (global) {
  'use strict';

  const stripeLinks = {
    'ai-intake': 'https://buy.stripe.com/dRmaEQ9eg9Z2a3A6bZ3Ru01',
    'fix-my-app': 'https://buy.stripe.com/3cI9AM1LOfjmdfM1VJ3Ru00',
    'lead-gen': 'https://buy.stripe.com/3cIfZacqsgnq6Ro6bZ3Ru03',
    scheduling: 'https://buy.stripe.com/7sYcMY8acc7aejQ0RF3Ru02',
  };

  global.JL_STRIPE_PRODUCT_LINKS = stripeLinks;

  /** Legacy keys for any page that still references STRIPE_LINK_* */
  global.JL_SERVICE_STRIPE_LINKS = {
    STRIPE_LINK_FIX_MY_APP: stripeLinks['fix-my-app'],
    STRIPE_LINK_AI_INTAKE: stripeLinks['ai-intake'],
    STRIPE_LINK_SCHEDULING: stripeLinks.scheduling,
    STRIPE_LINK_LEAD_ENGINE: stripeLinks['lead-gen'],
  };
})(typeof window !== 'undefined' ? window : globalThis);
