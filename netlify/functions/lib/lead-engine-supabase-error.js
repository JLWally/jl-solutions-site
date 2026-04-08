'use strict';

/** Collect all text Supabase/PostgREST may put the failure in (message vs details, wrappers). */
function flattenSupabaseErrorText(err) {
  if (!err || typeof err !== 'object') return '';
  const parts = [
    err.message,
    err.details,
    err.hint,
    err.code,
    err.statusText,
    err.error_description,
  ];
  if (err.error && typeof err.error === 'object') {
    parts.push(err.error.message, err.error.details, err.error.hint, err.error.code);
  }
  try {
    parts.push(JSON.stringify(err));
  } catch (_e) {
    /* ignore */
  }
  return parts
    .filter((x) => x != null && String(x).trim() !== '')
    .map((x) => String(x))
    .join(' ');
}

/**
 * True when the error is almost certainly missing demo_* columns on lead_engine_leads
 * (migrations not applied). Used to fall back or skip prefilters safely.
 */
function isMissingLeadEngineDemoColumnError(err) {
  if (typeof err === 'string') {
    return isMissingLeadEngineDemoColumnError({ message: err });
  }
  const t = flattenSupabaseErrorText(err);
  if (!t) return false;
  if (/\b42703\b/.test(t)) return true;
  if (/column .+ does not exist/i.test(t)) return true;
  if (/does not exist/i.test(t) && /demo_(slug|outreach|followup|last_contacted)/i.test(t)) return true;
  if (/Could not find the ['"]demo_/i.test(t)) return true;
  return false;
}

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
        'Run newer migrations in Supabase SQL Editor, e.g. supabase/migrations/20260402140000_lead_engine_demo_slug.sql, 20260402160000_lead_engine_demo_outreach_status.sql, 20260403100000_lead_engine_demo_followup_due.sql, 20260407180000_lead_engine_demo_outreach_status_expand.sql (or refresh from supabase/schema.sql). Then reload the lead engine.',
    };
  }
  const short = msg.length <= 500 ? msg : msg.slice(0, 497) + '…';
  return {
    error: fallbackError,
    code,
    details: short || undefined,
  };
}

module.exports = {
  supabaseErrorPayload,
  flattenSupabaseErrorText,
  isMissingLeadEngineDemoColumnError,
};
