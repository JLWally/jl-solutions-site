/**
 * Lead engine Supabase client (service role only, same pattern as consultation.js).
 */
const { createClient } = require('@supabase/supabase-js');

function getLeadEngineSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key || !/^https?:\/\//i.test(url)) return null;
  try {
    return createClient(url, key);
  } catch (e) {
    console.error('[lead-engine-supabase] createClient failed:', e.message);
    return null;
  }
}

module.exports = { getLeadEngineSupabase };
