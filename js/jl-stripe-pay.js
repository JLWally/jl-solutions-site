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

        var raw = await res.text();
        var data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch (_) {
          data = {};
        }

        if (data.url) {
          global.location.href = data.url;
          return;
        }

        var errMsg =
          data.error ||
          (res.status >= 400
            ? 'Checkout failed (HTTP ' + res.status + ')' + (raw && raw.length < 400 ? ': ' + raw : '')
            : 'Checkout failed');
        throw new Error(errMsg);
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
