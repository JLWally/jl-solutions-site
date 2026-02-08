/**
 * Load Supabase config from Netlify function, then load Supabase + auth scripts.
 * Call window.onReferralReady() when done (or show config error).
 */
(function () {
  const CONFIG_URL = '/.netlify/functions/referral-config';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function init() {
    try {
      const r = await fetch(CONFIG_URL);
      const d = await r.json();
      if (d.supabaseUrl && d.supabaseAnonKey) {
        window.JL_SUPABASE = { url: d.supabaseUrl, anonKey: d.supabaseAnonKey };
        window.JL_REFERRAL_CONFIGURED = true;
      } else {
        window.JL_SUPABASE = { url: '', anonKey: '' };
        window.JL_REFERRAL_CONFIGURED = false;
      }
    } catch (e) {
      window.JL_SUPABASE = { url: '', anonKey: '' };
      window.JL_REFERRAL_CONFIGURED = false;
    }

    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    await loadScript('/js/supabase-client.js');
    await loadScript('/js/referral-auth.js');

    if (typeof window.onReferralReady === 'function') {
      window.onReferralReady();
    }
  }

  init();
})();
