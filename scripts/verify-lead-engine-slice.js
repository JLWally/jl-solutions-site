#!/usr/bin/env node
/**
 * Pre-flight for custom-demo + one-click send slice:
 * - Confirms demo-related migration files exist
 * - Lists Stripe Payment Link → /onboarding?service= mapping (Dashboard must match)
 * - Reports missing/empty env vars in repo-root .env (does not print values)
 */
'use strict';

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGRATIONS = [
  '20260402140000_lead_engine_demo_slug.sql',
  '20260402160000_lead_engine_demo_outreach_status.sql',
  '20260403100000_lead_engine_demo_followup_due.sql',
];

const ENV_ONE_CLICK_SEND = [
  'RESEND_API_KEY',
  'LEAD_ENGINE_PHYSICAL_ADDRESS',
  'LEAD_ENGINE_PUBLIC_SITE_URL',
  'LEAD_ENGINE_OUTREACH_FROM_EMAIL',
  'FORM_FROM_EMAIL',
];

const ENV_LEAD_ENGINE_AUTH = ['LEAD_ENGINE_ENABLED', 'LEAD_ENGINE_OPERATORS', 'LEAD_ENGINE_SECRET'];

function isSet(k) {
  const v = process.env[k];
  return v != null && String(v).trim() !== '';
}

function main() {
  const root = path.join(__dirname, '..');
  const migDir = path.join(root, 'supabase', 'migrations');
  let ok = true;

  console.log('--- Migration files (apply to Supabase in this order) ---');
  for (const f of MIGRATIONS) {
    const p = path.join(migDir, f);
    const exists = fs.existsSync(p);
    console.log(exists ? `  OK  ${f}` : `  MISSING ${f}`);
    if (!exists) ok = false;
  }
  console.log(
    '  Apply: supabase link && supabase db push   (or run SQL in Supabase SQL Editor)\n'
  );

  console.log('--- Stripe Payment Links (Dashboard → success URL must match) ---');
  console.log('  ai-intake   → …/onboarding?service=ai-intake');
  console.log('  fix-my-app  → …/onboarding?service=fix-app');
  console.log('  scheduling  → …/onboarding?service=scheduling');
  console.log('  lead-gen    → …/onboarding?service=lead-engine');
  console.log('  Source: js/jl-stripe-product-links.js\n');

  console.log('--- Env: one-click send (/internal/outreach) ---');
  const missSend = ENV_ONE_CLICK_SEND.filter((k) => !isSet(k));
  if (missSend.length) {
    ok = false;
    missSend.forEach((k) => console.log(`  MISSING/EMPTY: ${k}`));
  } else {
    console.log('  All one-click send keys present in .env');
  }

  console.log('\n--- Env: lead engine auth ---');
  const missAuth = ENV_LEAD_ENGINE_AUTH.filter((k) => !isSet(k));
  if (missAuth.length) {
    ok = false;
    missAuth.forEach((k) => console.log(`  MISSING/EMPTY: ${k}`));
  } else {
    console.log('  All lead-engine auth keys present in .env');
  }

  console.log('\n--- Repo features (should already be in tree) ---');
  const checks = [
    ['demo_followup_due_at in schema', fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8').includes('demo_followup_due_at')],
    ['demo-config POST accepts lead_engine_session', fs.readFileSync(path.join(root, 'netlify', 'functions', 'demo-config.js'), 'utf8').includes('getLeadEngineSession')],
    ['internal demo-builder auth wall', fs.readFileSync(path.join(root, 'internal-demo-builder.html'), 'utf8').includes('idbAuthWall')],
    ['outreach Advanced templates', fs.readFileSync(path.join(root, 'internal-outreach.html'), 'utf8').includes('ioShowAdvancedTemplates')],
    ['Mark as drafted UI', fs.readFileSync(path.join(root, 'internal-outreach.html'), 'utf8').includes('ioMarkDrafted')],
    ['Activity demo_outreach_sent counts', fs.readFileSync(path.join(root, 'netlify', 'functions', 'lib', 'lead-engine-activity-report.js'), 'utf8').includes("'demo_outreach_sent'")],
  ];
  for (const [label, pass] of checks) {
    console.log(pass ? `  OK  ${label}` : `  FAIL ${label}`);
    if (!pass) ok = false;
  }

  console.log(ok ? '\nVerifier: all automated checks passed.\n' : '\nVerifier: fix items above before go-live.\n');
  process.exit(ok ? 0 : 1);
}

main();
