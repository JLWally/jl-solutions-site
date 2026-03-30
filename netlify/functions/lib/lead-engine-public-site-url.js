/**
 * Absolute site URL for public links (unsubscribe) in outbound email.
 * Netlify sets URL on deploy; override when needed (custom domain vs deploy URL).
 */
function getLeadEnginePublicSiteUrl() {
  const raw =
    process.env["LEAD_ENGINE_PUBLIC_SITE_URL"] ||
    process.env["URL"] ||
    process.env["DEPLOY_PRIME_URL"] ||
    '';
  return String(raw).replace(/\/+$/, '');
}

module.exports = { getLeadEnginePublicSiteUrl };
