/**
 * Returns public Supabase config for referral/sales portal (anon key is safe to expose).
 * Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify environment variables.
 */
exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({
      supabaseUrl,
      supabaseAnonKey,
      configured: !!(supabaseUrl && supabaseAnonKey),
    }),
  };
};
