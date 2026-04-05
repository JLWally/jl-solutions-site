/**
 * Optional audit trail for smart demos when Supabase is configured.
 * Uses upsert on slug so lead-engine regenerations stay idempotent.
 * Table: public.jl_demo_configs (see supabase/jl_demo_configs.sql).
 */
const { getLeadEngineSupabase } = require('./lead-engine-supabase');
const { DEFAULT_DEMO_SUBTEXT } = require('./demo-config-core');
const { getPreset } = require('./demo-industry-presets');

function isJlDemoSupabaseConfigured() {
  return getLeadEngineSupabase() != null;
}

/**
 * @param {string} slug
 * @returns {Promise<boolean>} true if a row exists (or query failed — pessimistic)
 */
async function isSlugTakenInJlDemoConfigs(slug) {
  const supabase = getLeadEngineSupabase();
  if (!supabase || !slug) return false;
  const { data, error } = await supabase.from('jl_demo_configs').select('slug').eq('slug', slug).maybeSingle();
  if (error) {
    console.warn('[demo-config-supabase] slug existence check failed:', error.message);
    return true;
  }
  return data != null;
}

/**
 * @param {string} slug
 * @returns {Promise<object|null>} full demo config for GET /demo/:slug, or null
 */
async function fetchJlDemoConfigBySlug(slug) {
  const supabase = getLeadEngineSupabase();
  if (!supabase || !slug) return null;
  const { data, error } = await supabase
    .from('jl_demo_configs')
    .select('slug,business_name,industry,services_json,issue_options_json,cta_service,notes,config_json')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[demo-config-supabase] fetch by slug failed:', error.message);
    return null;
  }
  if (!data) return null;
  if (data.config_json && typeof data.config_json === 'object') {
    return data.config_json;
  }
  const preset = getPreset(data.industry);
  return {
    version: 2,
    slug: data.slug,
    businessName: data.business_name,
    industry: data.industry,
    industryLabel: preset ? preset.label : data.industry,
    services: Array.isArray(data.services_json) ? data.services_json : [],
    issueOptions: Array.isArray(data.issue_options_json) ? data.issue_options_json : [],
    ctaService: data.cta_service || 'ai-intake',
    subtext: DEFAULT_DEMO_SUBTEXT,
    headerTitle: `${data.business_name || 'Business'} – Smart Intake Demo`,
    notes: data.notes || undefined,
  };
}

/**
 * @param {{ config: object, notes?: string|null }} payload
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: unknown, message?: string }>}
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
    return { ok: false, error, message: error.message };
  }
  return { ok: true };
}

module.exports = {
  insertJlDemoConfig,
  isJlDemoSupabaseConfigured,
  isSlugTakenInJlDemoConfigs,
  fetchJlDemoConfigBySlug,
};
