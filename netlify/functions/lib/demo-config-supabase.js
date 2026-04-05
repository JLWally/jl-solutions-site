/**
 * Optional audit trail for smart demos when Supabase is configured.
 * Uses upsert on slug so lead-engine regenerations stay idempotent.
 * Table: public.jl_demo_configs (see supabase/jl_demo_configs.sql).
 */
const { getLeadEngineSupabase } = require('./lead-engine-supabase');

/**
 * @param {{ config: object, notes?: string|null }} payload
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: unknown }>}
 */
async function insertJlDemoConfig(payload) {
  const supabase = getLeadEngineSupabase();
  if (!supabase) return { ok: true, skipped: true };

  const { config, notes } = payload;
  if (!config || !config.slug) return { ok: false, error: new Error('missing config') };

  const row = {
    slug: config.slug,
    business_name: config.businessName,
    industry: config.industry,
    services_json: config.services,
    issue_options_json: config.issueOptions,
    cta_service: config.ctaService || 'ai-intake',
    notes: notes != null && String(notes).trim() ? String(notes).trim().slice(0, 4000) : null,
    config_json: config,
  };

  const { error } = await supabase.from('jl_demo_configs').upsert(row, { onConflict: 'slug' });
  if (error) {
    console.warn('[demo-config-supabase] upsert failed:', error.message);
    return { ok: false, error };
  }
  return { ok: true };
}

module.exports = { insertJlDemoConfig };
