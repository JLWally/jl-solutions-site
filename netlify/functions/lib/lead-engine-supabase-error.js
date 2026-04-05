'use strict';

/**
 * Map PostgREST / Postgres errors to operator-facing JSON (no secrets).
 */
function supabaseErrorPayload(supabaseError, fallbackError) {
  const e = supabaseError;
  if (!e || typeof e !== 'object') {
    return { error: fallbackError };
  }
  const msg = String(e.message || '');
  const code = e.code || undefined;
  if (
    code === 'PGRST205' ||
    /could not find the table|schema cache|relation .* does not exist/i.test(msg)
  ) {
    return {
      error: 'Lead engine tables are missing in this Supabase project.',
      code,
      details:
        'Apply the Lead engine DDL: open supabase/schema.sql in the repo, copy the block from CREATE TABLE lead_engine_leads through the lead_engine_events indexes (or run migrations in supabase/migrations/ in timestamp order). In dashboard: Supabase → SQL Editor → paste and run. Then refresh this page.',
    };
  }
  if (
    code === '42703' ||
    /column .* does not exist/i.test(msg) ||
    /Could not find the 'demo_/i.test(msg)
  ) {
    return {
      error: 'Database schema is behind this deploy (missing column on lead_engine_leads).',
      code,
      details:
        'Run newer migrations in Supabase SQL Editor, e.g. supabase/migrations/20260402140000_lead_engine_demo_slug.sql, 20260402160000_lead_engine_demo_outreach_status.sql, and 20260403100000_lead_engine_demo_followup_due.sql (or refresh from supabase/schema.sql). Then reload the lead engine.',
    };
  }
  const short = msg.length <= 500 ? msg : msg.slice(0, 497) + '…';
  return {
    error: fallbackError,
    code,
    details: short || undefined,
  };
}

module.exports = { supabaseErrorPayload };
