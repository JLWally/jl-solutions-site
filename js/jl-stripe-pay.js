/**
 * Shared: notify via send-form-email, then create Stripe Checkout session.
 */
(function (global) {
  'use strict';

  function notifyOk(res) {
    if (!res.ok) throw new Error('Could not notify team (HTTP ' + res.status + ')');
  }

  global.jlStripePay = {
    /**
     * @param {object} opts
     * @param {string} [opts.baseUrl]
     * @param {URLSearchParams|Record<string,string>} opts.notifyParams
     * @param {object} opts.stripePayload — JSON body for stripe-checkout
     * @param {HTMLButtonElement} [opts.button]
     * @param {string} [opts.submitLabel]
     * @param {string} [opts.redirectingLabel]
     * @param {boolean} [opts.requireNotify=true]
     * @param {function(Error):void} [opts.onError]
     */
    run: async function (opts) {
      var base = opts.baseUrl || (global.location && global.location.origin) || '';
      var button = opts.button;
      var submitLabel = opts.submitLabel || 'Proceed to secure checkout';
      var redirectingLabel = opts.redirectingLabel || 'Redirecting…';
      var requireNotify = opts.requireNotify !== false;

      if (button) {
        button.disabled = true;
        button.textContent = redirectingLabel;
      }

      try {
        var params =
          opts.notifyParams instanceof URLSearchParams
            ? opts.notifyParams
            : new URLSearchParams(opts.notifyParams || {});

        var notifyRes = await fetch(base + '/.netlify/functions/send-form-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          redirect: 'follow',
        });

        if (requireNotify) notifyOk(notifyRes);

        var res = await fetch(base + '/.netlify/functions/stripe-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opts.stripePayload),
        });

        var data = {};
        try {
          data = await res.json();
        } catch (_) {
          /* ignore */
        }

        if (data.url) {
          global.location.href = data.url;
          return;
        }

        throw new Error(data.error || 'Checkout failed');
      } catch (err) {
        if (button) {
          button.disabled = false;
          button.textContent = submitLabel;
        }
        if (opts.onError) opts.onError(err);
        else if (global.alert) global.alert(err.message || 'Something went wrong. Please try again.');
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
