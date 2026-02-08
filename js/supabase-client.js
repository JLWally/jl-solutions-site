/**
 * JL Solutions - Supabase Client
 * Requires window.JL_SUPABASE = { url, anonKey } to be set before loading.
 * Add to pages: <script>window.JL_SUPABASE={url:'YOUR_URL',anonKey:'YOUR_ANON_KEY'};</script>
 */
(function () {
  const cfg = window.JL_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey) {
    console.warn('JL_SUPABASE not configured. Add url and anonKey.');
    window.supabaseClient = null;
    return;
  }
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    window.supabaseClient = supabase.createClient(cfg.url, cfg.anonKey);
  } else {
    console.warn('Supabase JS not loaded. Add: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    window.supabaseClient = null;
  }
})();
