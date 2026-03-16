/**
 * Load referral config. If simple auth mode, skip Supabase and call onReferralReady.
 * If Supabase mode, load Supabase + auth scripts then call onReferralReady.
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
      const useSimpleAuth = !!d.useSimpleAuth;

      if (useSimpleAuth) {
        window.JL_REFERRAL_CONFIGURED = true;
        window.JL_REFERRAL_SIMPLE_AUTH = true;
        window.JL_SUPABASE = { url: '', anonKey: '' };
      } else if (d.supabaseUrl && d.supabaseAnonKey) {
        window.JL_SUPABASE = { url: d.supabaseUrl, anonKey: d.supabaseAnonKey };
        window.JL_REFERRAL_CONFIGURED = true;
        window.JL_REFERRAL_SIMPLE_AUTH = false;
      } else {
        window.JL_SUPABASE = { url: '', anonKey: '' };
        window.JL_REFERRAL_CONFIGURED = false;
        window.JL_REFERRAL_SIMPLE_AUTH = false;
      }
    } catch (e) {
      window.JL_SUPABASE = { url: '', anonKey: '' };
      window.JL_REFERRAL_CONFIGURED = false;
      window.JL_REFERRAL_SIMPLE_AUTH = false;
    }

    if (window.JL_REFERRAL_SIMPLE_AUTH) {
      await loadScript('/js/referral-simple-auth.js');
      if (typeof window.onReferralReady === 'function') {
        window.onReferralReady();
      }
      return;
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
