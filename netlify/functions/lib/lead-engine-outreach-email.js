/**
 * Plain outreach body → HTML for Resend + minimal compliance footer.
 */

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Double newlines → paragraphs; single newlines → <br/>.
 */
function plainTextToEmailHtml(plain) {
  const text = plain == null ? '' : String(plain);
  if (!text.trim()) {
    return '<p></p>';
  }
  return text
    .split(/\n\n+/)
    .map((block) => {
      const inner = escapeHtml(block).replace(/\n/g, '<br/>');
      return `<p style="margin:0 0 1em 0;">${inner}</p>`;
    })
    .join('');
}

/**
 * @param {{ subject: string, bodyPlain: string, unsubscribeUrl?: string, physicalAddress?: string }} opts
 */
function buildOutreachEmailHtml(opts) {
  const subject = opts.subject || '';
  const main = plainTextToEmailHtml(opts.bodyPlain);
  let footer = '';
  if (opts.unsubscribeUrl) {
    const u = escapeHtml(opts.unsubscribeUrl);
    footer = `
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
      <p style="font-size:12px;color:#666;margin:0;">
        If you prefer not to receive further emails from JL Solutions about this inquiry,
        you can <a href="${u}">unsubscribe here</a>.
      </p>`;
  }
  const addr = opts.physicalAddress && String(opts.physicalAddress).trim();
  if (addr) {
    // CAN-SPAM requires a postal address on commercial mail; keep it present but low-emphasis.
    footer += `
      <p style="font-size:10px;line-height:1.35;color:#a8a8a8;margin:14px 0 0 0;">
        ${escapeHtml(addr)}
      </p>`;
  }
  return {
    subject,
    html: `<div style="font-family:system-ui,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#111;">
${main}
${footer}
</div>`,
  };
}

const DEFAULT_REPLY_TO = 'info@jlsolutions.io';

const { envVarFromB64 } = require('./runtime-process-env');

/**
 * From address: same cascade as website forms where possible.
 */
function getLeadEngineOutreachFromEmail() {
  return (
    envVarFromB64('TEVBRF9FTkdJTkVfT1VUUkVBQ0hfRlJPTV9FTUFJTA==') ||
    envVarFromB64('Rk9STV9GUk9NX0VNQUlM') ||
    'JL Solutions <onboarding@resend.dev>'
  );
}

module.exports = {
  escapeHtml,
  plainTextToEmailHtml,
  buildOutreachEmailHtml,
  getLeadEngineOutreachFromEmail,
  DEFAULT_REPLY_TO,
};
