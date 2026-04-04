/**
 * Pair with send-form-email Netlify function: send Accept: application/json
 * and use handleResponse() so failed Resend/missing key does not look like success.
 */
(function (g) {
  'use strict';

  g.jlSendFormEmail = {
    jsonHeaders: function () {
      return {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      };
    },

    /**
     * @param {Response} res
     * @returns {Promise<{ ok: boolean, message?: string, legacy?: boolean }>}
     */
    handleResponse: async function (res) {
      var ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.indexOf('application/json') !== -1) {
        var body = {};
        try {
          body = await res.json();
        } catch (_) {}
        if (body.filtered) {
          return { ok: true };
        }
        if (body.success === true && body.emailed === true) {
          return { ok: true };
        }
        return {
          ok: false,
          message:
            body.error ||
            'We could not complete your request. Email info@jlsolutions.io or try again.',
        };
      }
      var legacyOk =
        res.ok ||
        res.status === 302 ||
        res.status === 303 ||
        res.type === 'opaqueredirect' ||
        res.redirected;
      return { ok: legacyOk, legacy: true };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
