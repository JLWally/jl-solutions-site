/**
 * Pair with send-form-email Netlify function: send Accept: application/json
 * and use handleResponse(). success:true means the server accepted the submission;
 * emailed:false means notification email did not send (checkout flows may still proceed).
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
     * @returns {Promise<{ ok: boolean, emailed?: boolean, message?: string, legacy?: boolean, code?: string }>}
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
        if (body.success === true) {
          return {
            ok: true,
            emailed: body.emailed === false ? false : true,
            code: body.code,
          };
        }
        return {
          ok: false,
          message:
            body.error ||
            'We could not complete your request. Email info@jlsolutions.io or try again.',
          code: body.code,
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
