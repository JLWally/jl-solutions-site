/**
 * Returns public config for referral/sales portal.
 * Supports two modes:
 * 1. Supabase: SUPABASE_URL + SUPABASE_ANON_KEY
 * 2. Simple internal auth: REFERRAL_AGENTS + REFERRAL_SECRET + REFERRAL_USE_SIMPLE_AUTH=true
 */
exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  const useSimpleAuth = process.env.REFERRAL_USE_SIMPLE_AUTH === 'true' || process.env.REFERRAL_USE_SIMPLE_AUTH === '1';
  const agentsStr = process.env.REFERRAL_AGENTS || '';
  const hasSimpleAuth = useSimpleAuth && agentsStr && process.env.REFERRAL_SECRET;

  const configured = hasSimpleAuth || (!!(supabaseUrl && supabaseAnonKey));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({
      supabaseUrl: hasSimpleAuth ? '' : supabaseUrl,
      supabaseAnonKey: hasSimpleAuth ? '' : supabaseAnonKey,
      configured,
      useSimpleAuth: !!hasSimpleAuth,
    }),
  };
};
