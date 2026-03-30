/**
 * Absolute site URL for public links (unsubscribe) in outbound email.
 * Netlify sets URL on deploy; override when needed (custom domain vs deploy URL).
 */
const { envVarFromB64 } = require('./runtime-process-env');

function getLeadEnginePublicSiteUrl() {
  const raw =
    envVarFromB64('TEVBRF9FTkdJTkVfUFVCTElDX1NJVEVfVVJM') ||
    envVarFromB64('VVJM') ||
    envVarFromB64('REVQTE9ZX1BSSU1FX1VSTA==') ||
    '';
  return String(raw).replace(/\/+$/, '');
}

module.exports = { getLeadEnginePublicSiteUrl };
