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
  const short = msg.length <= 500 ? msg : msg.slice(0, 497) + '…';
  return {
    error: fallbackError,
    code,
    details: short || undefined,
  };
}

module.exports = { supabaseErrorPayload };
