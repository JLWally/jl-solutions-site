/**
 * Shared: notify via send-form-email, then create Stripe Checkout session.
 */
(function (global) {
  'use strict';

  async function notifyOutcome(res) {
    if (global.jlSendFormEmail && global.jlSendFormEmail.handleResponse) {
      return global.jlSendFormEmail.handleResponse(res);
    }
    var ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.indexOf('application/json') !== -1) {
      var body = {};
      try {
        body = await res.json();
      } catch (_) {}
      if (body.filtered) return { ok: true };
      if (body.success === true) {
        return { ok: true, emailed: body.emailed === false ? false : true };
      }
      return {
        ok: false,
        message:
          body.error ||
          'We could not notify the team. Email info@jlsolutions.io or try again.',
      };
    }
    if (!res.ok && res.status !== 302 && res.status !== 303 && res.type !== 'opaqueredirect') {
      return { ok: false, message: 'Could not notify team (HTTP ' + res.status + ')' };
    }
    return { ok: true };
  }

  function setButtonLabel(btn, label) {
    if (!btn) return;
    var lab = btn.querySelector('.jl-pay-btn-label');
    if (lab) lab.textContent = label;
    else btn.textContent = label;
  }

  global.jlStripePay = {
    /**
     * @param {object} opts
     * @param {string} [opts.baseUrl]
     * @param {URLSearchParams|Record<string,string>} opts.notifyParams
     * @param {object} opts.stripePayload, JSON body for stripe-checkout
     * @param {HTMLButtonElement} [opts.button]
     * @param {HTMLButtonElement[]} [opts.extraButtons], same disabled/label treatment as button
     * @param {string} [opts.submitLabel]
     * @param {string} [opts.redirectingLabel]
     * @param {boolean} [opts.requireNotify=true]
     * @param {function(Error):void} [opts.onError]
     */
    run: async function (opts) {
      var base = opts.baseUrl || (global.location && global.location.origin) || '';
      var button = opts.button;
      var extraButtons = opts.extraButtons || [];
      var allButtons = [button].concat(extraButtons).filter(Boolean);
      var submitLabel = opts.submitLabel || 'Proceed to secure checkout';
      var redirectingLabel = opts.redirectingLabel || 'Redirecting…';
      var requireNotify = opts.requireNotify !== false;

      for (var bi = 0; bi < allButtons.length; bi++) {
        allButtons[bi].disabled = true;
        setButtonLabel(allButtons[bi], redirectingLabel);
      }

      try {
        var params =
          opts.notifyParams instanceof URLSearchParams
            ? opts.notifyParams
            : new URLSearchParams(opts.notifyParams || {});

        var notifyHeaders = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
        if (global.jlSendFormEmail && global.jlSendFormEmail.jsonHeaders) {
          notifyHeaders = global.jlSendFormEmail.jsonHeaders();
        }
        var notifyRes = await fetch(base + '/.netlify/functions/send-form-email', {
          method: 'POST',
          headers: notifyHeaders,
          body: params.toString(),
          redirect: 'manual',
        });

        if (requireNotify) {
          var nOut = await notifyOutcome(notifyRes);
          if (!nOut.ok) throw new Error(nOut.message || 'Could not notify team.');
        }

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
        for (var bj = 0; bj < allButtons.length; bj++) {
          allButtons[bj].disabled = false;
          setButtonLabel(allButtons[bj], submitLabel);
        }
        if (opts.onError) opts.onError(err);
        else if (global.alert) global.alert(err.message || 'Something went wrong. Please try again.');
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
