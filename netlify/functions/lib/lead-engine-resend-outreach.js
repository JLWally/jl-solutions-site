/**
 * Single-recipient outreach send via Resend (same dependency as send-form-email).
 */

const { getLeadEngineOutreachFromEmail, DEFAULT_REPLY_TO } = require('./lead-engine-outreach-email');
const { envVarFromB64 } = require('./runtime-process-env');

/**
 * @param {{ to: string, subject: string, html: string, replyTo?: string }} opts
 * @returns {Promise<object>} Resend API data on success
 */
async function sendLeadEngineOutreachEmail(opts) {
  const key = envVarFromB64('UkVTRU5EX0FQSV9LRVk=');
  if (!key) {
    const err = new Error('RESEND_API_KEY is not configured');
    err.code = 'NO_RESEND';
    throw err;
  }
  const { Resend } = require('resend');
  const resend = new Resend(key);
  const from = getLeadEngineOutreachFromEmail();
  const { data, error } = await resend.emails.send({
    from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo || DEFAULT_REPLY_TO,
  });
  if (error) {
    const e = new Error(error.message || 'Resend send failed');
    e.code = 'RESEND_ERROR';
    e.resendError = error;
    throw e;
  }
  return data;
}

module.exports = { sendLeadEngineOutreachEmail };
