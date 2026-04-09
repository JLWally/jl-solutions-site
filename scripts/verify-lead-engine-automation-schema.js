#!/usr/bin/env node
/**
 * Confirms Supabase has automation/scout/enrichment/guardrail objects the ops UI expects.
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from repo-root .env (same as Netlify functions).
 *
 * Usage: node scripts/verify-lead-engine-automation-schema.js
 *
 * For full HTTP checks after `netlify dev`, sign in at /lead-engine/ then in DevTools
 * Application → Cookies copy `lead_engine_session` and:
 *   curl -sS -b 'lead_engine_session=...' http://localhost:8888/.netlify/functions/lead-engine-hot-leads | jq .
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

const CHECKS = [
  {
    name: 'lead_engine_leads.automation_pipeline_status',
    run: async (sb) => {
      const { error } = await sb.from('lead_engine_leads').select('automation_pipeline_status').limit(1);
      return error ? error.message : null;
    },
  },
  {
    name: 'lead_engine_worker_runs',
    run: async (sb) => {
      const { error } = await sb.from('lead_engine_worker_runs').select('id').limit(1);
      return error ? error.message : null;
    },
  },
  {
    name: 'lead_engine_prospects',
    run: async (sb) => {
      const { error } = await sb.from('lead_engine_prospects').select('id').limit(1);
      return error ? error.message : null;
    },
  },
  {
    name: 'lead_engine_scout_query_state',
    run: async (sb) => {
      const { error } = await sb.from('lead_engine_scout_query_state').select('query_id').limit(1);
      return error ? error.message : null;
    },
  },
  {
    name: 'lead_engine_prospect_enrichment_events',
    run: async (sb) => {
      const { error } = await sb.from('lead_engine_prospect_enrichment_events').select('id').limit(1);
      return error ? error.message : null;
    },
  },
];

async function main() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  const sb = createClient(url, key);
  let ok = true;
  for (const c of CHECKS) {
    const err = await c.run(sb);
    if (err) {
      console.error(`FAIL  ${c.name}\n       ${err}`);
      ok = false;
    } else {
      console.log(`OK    ${c.name}`);
    }
  }
  if (!ok) {
    console.error(
      '\nApply migrations in order (Supabase SQL Editor or `supabase db push`), from:\n' +
        '  20260407193000_lead_engine_automation_orchestration.sql\n' +
        '  20260408120000_lead_engine_scout_strategy_and_prospect_branches.sql\n' +
        '  20260408140000_lead_engine_operations_split_enrichment.sql\n' +
        '  20260408170000_lead_engine_feedback_guardrails_and_outcomes.sql\n'
    );
    process.exit(1);
  }
  console.log('\nSchema checks passed. Re-test HTTP endpoints with a signed-in session (see script header).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
