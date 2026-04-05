#!/usr/bin/env node
/**
 * Pre-flight for production revenue automation:
 * - Stripe secret + webhook secret present (via same resolution as Functions)
 * - Warns if keys look like test mode when checking "live readiness"
 * - Resend + form From for package-kickoff email
 * - Supabase for webhook consultations + referral DB path
 * - Simple referral path alternative
 *
 * Loads repo-root .env (never prints values). Run before copying vars to Netlify.
 */
'use strict';

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const {
  getStripeSecretKey,
  getStripeWebhookSecret,
} = require('../netlify/functions/lib/stripe-env');

function isSet(k) {
  const v = process.env[k];
  return v != null && String(v).trim() !== '';
}

function main() {
  let ok = true;
  const root = path.join(__dirname, '..');

  console.log('=== Live revenue / automation (.env mirror) ===\n');

  const sk = getStripeSecretKey();
  const whsec = getStripeWebhookSecret();

  console.log('--- Stripe ---');
  if (!sk) {
    ok = false;
    console.log('  MISSING: Stripe secret key (STRIPE_SECRET_KEY or alternates in stripe-env.js)');
  } else {
    const mode = sk.startsWith('sk_live_') ? 'live' : sk.startsWith('sk_test_') ? 'test' : 'unknown';
    console.log(`  OK     Secret key present (mode: ${mode})`);
    if (mode === 'test') {
      console.log('  WARN   Production Netlify should use sk_live_ for real revenue.');
    }
  }
  if (!whsec) {
    ok = false;
    console.log('  MISSING: STRIPE_WEBHOOK_SECRET (whsec_ from Stripe webhook endpoint)');
  } else {
    console.log('  OK     Webhook signing secret present');
  }
  console.log(`  Webhook URL must be: https://YOUR_DOMAIN/.netlify/functions/stripe-webhook\n`);

  console.log('--- Post-purchase email (package-kickoff) ---');
  const missEmail = ['RESEND_API_KEY', 'FORM_FROM_EMAIL'].filter((k) => !isSet(k));
  if (missEmail.length) {
    ok = false;
    missEmail.forEach((k) => console.log(`  MISSING: ${k}`));
  } else {
    console.log('  OK     RESEND_API_KEY + FORM_FROM_EMAIL');
  }
  if (!isSet('ONBOARDING_OPS_EMAIL')) {
    console.log('  NOTE   ONBOARDING_OPS_EMAIL unset (optional extra internal copy)');
  }
  console.log('');

  const simple = process.env.REFERRAL_USE_SIMPLE_AUTH === 'true' || process.env.REFERRAL_USE_SIMPLE_AUTH === '1';
  console.log('--- Stripe webhook → database ---');
  if (!isSet('SUPABASE_URL') || !isSet('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('  WARN   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
    console.log('         stripe-webhook will not insert consultations rows (paid leads may be invisible in DB).');
    if (!simple) {
      ok = false;
      console.log('         Referral attribution needs Supabase OR REFERRAL_USE_SIMPLE_AUTH=true + REFERRAL_* .');
    } else {
      console.log('         Referrals may still use Blobs (simple auth); add Supabase for consultation logging.');
    }
  } else {
    console.log('  OK     Supabase URL + service role (webhook can log consultations)');
  }
  if (simple) {
    const missSimple = ['REFERRAL_AGENTS', 'REFERRAL_SECRET'].filter((k) => !isSet(k));
    if (missSimple.length) {
      ok = false;
      missSimple.forEach((k) => console.log(`  MISSING: ${k} (required with REFERRAL_USE_SIMPLE_AUTH)`));
    } else {
      console.log('  OK     Simple referral auth env (REFERRAL_AGENTS + REFERRAL_SECRET)');
    }
  }
  console.log('');

  console.log('--- Site URL consistency (optional) ---');
  const pub = process.env.LEAD_ENGINE_PUBLIC_SITE_URL || process.env.URL || '';
  if (!String(pub).trim()) {
    console.log('  NOTE   LEAD_ENGINE_PUBLIC_SITE_URL and URL unset (Netlify usually sets URL in prod)');
  } else {
    console.log(`  OK     Public base hint set (${String(pub).slice(0, 48)}…)`);
  }
  console.log('');

  console.log('--- Stripe Payment Link success URLs (set in Dashboard, not in .env) ---');
  console.log('  See js/jl-stripe-product-links.js and docs/LIVE-REVENUE.md');
  console.log('  ai-intake   → /onboarding?service=ai-intake');
  console.log('  fix-my-app  → /onboarding?service=fix-app');
  console.log('  scheduling  → /onboarding?service=scheduling');
  console.log('  lead-gen    → /onboarding?service=lead-engine\n');

  try {
    const linksPath = path.join(root, 'js', 'jl-stripe-product-links.js');
    const fs = require('fs');
    if (fs.existsSync(linksPath)) {
      const txt = fs.readFileSync(linksPath, 'utf8');
      const hasBuy = txt.includes('buy.stripe.com');
      console.log(`--- Payment link URLs in repo ---`);
      console.log(hasBuy ? '  OK     jl-stripe-product-links.js contains buy.stripe.com links' : '  WARN   No buy.stripe.com found in jl-stripe-product-links.js');
      console.log('');
    }
  } catch (_) {
    /* ignore */
  }

  console.log(ok ? 'Result: ready to mirror these keys to Netlify Production (Functions).\n' : 'Result: fix MISSING items; review WARN before going live.\n');
  console.log('Full checklist: docs/LIVE-REVENUE.md\n');
  process.exit(ok ? 0 : 1);
}

main();
