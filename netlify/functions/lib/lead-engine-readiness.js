'use strict';

/**
 * Human-safe messages when PostgREST reports missing tables/columns (local schema drift).
 * Never forward raw SQL/PostgREST strings to operator JSON.
 */
const SCHEMA_HINT =
  'Automation schema is not applied. Run Supabase migrations from supabase/migrations in timestamp order, starting with 20260407193000_lead_engine_automation_orchestration.sql (and later 20260408120000 / 20260408140000 / 20260408170000 as needed).';

function isLikelySchemaDriftError(message) {
  const m = String(message || '').toLowerCase();
  if (!m) return false;
  return (
    m.includes('does not exist') ||
    m.includes('undefined_table') ||
    m.includes('undefined_column') ||
    (m.includes('relation') && m.includes('does not exist')) ||
    (m.includes('column') && m.includes('does not exist'))
  );
}

function readinessErrorPayload(message) {
  const raw = String(message || '');
  const schema = isLikelySchemaDriftError(raw);
  return {
    ok: false,
    readiness: {
      code: schema ? 'automation_schema_incomplete' : 'query_failed',
      message: schema ? SCHEMA_HINT : 'A database query failed. Verify Supabase connectivity and migrations.',
      schema_upgrade_needed: schema,
    },
  };
}

function sanitizeOperatorError(message) {
  return readinessErrorPayload(message).readiness.message;
}

module.exports = {
  SCHEMA_HINT,
  isLikelySchemaDriftError,
  readinessErrorPayload,
  sanitizeOperatorError,
};
