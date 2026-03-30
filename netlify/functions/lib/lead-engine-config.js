/**
 * Lead engine feature flags and operator list (separate from REFERRAL_AGENTS / REFERRAL_SECRET).
 *
 * LEAD_ENGINE_OPERATORS: username:password per entry, comma, semicolon, or newline separated.
 * Example: ops1:long-random-password,ops2:another-secret
 */
const TRUE_VALUES = new Set(['true', '1', 'yes']);

function isTruthyEnv(v) {
  if (v == null || v === '') return false;
  return TRUE_VALUES.has(String(v).trim().toLowerCase());
}

/** Bracket access avoids Netlify/esbuild inlining empty build-time values for secrets and flags. */
function isLeadEngineEnabled() {
  return isTruthyEnv(process.env["LEAD_ENGINE_ENABLED"]);
}

function isLeadEngineOpenAiAllowed() {
  return isTruthyEnv(process.env["LEAD_ENGINE_ALLOW_OPENAI"]);
}

function parseLeadEngineOperators(envStr) {
  if (!envStr || typeof envStr !== 'string') return [];
  return envStr
    .trim()
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':');
      if (idx === -1) return null;
      return {
        username: part.slice(0, idx).trim().toLowerCase(),
        password: part.slice(idx + 1).trim(),
      };
    })
    .filter((o) => o && o.username && o.password);
}

function getLeadEngineOperators() {
  return parseLeadEngineOperators(process.env["LEAD_ENGINE_OPERATORS"] || '');
}

function getLeadEngineSecret() {
  const s = process.env["LEAD_ENGINE_SECRET"];
  return s == null ? '' : String(s).trim();
}

function isLeadEngineAuthConfigured() {
  const ops = getLeadEngineOperators();
  const secret = getLeadEngineSecret();
  return ops.length > 0 && !!secret;
}

/**
 * When false (default): analyze runs PSI on the homepage only (fewer API calls, lower timeout risk).
 * Set LEAD_ENGINE_PSI_EXTENDED=true to also run PSI on same-origin contact + primary service URLs.
 */
function isLeadEnginePsiExtended() {
  return isTruthyEnv(process.env["LEAD_ENGINE_PSI_EXTENDED"]);
}

module.exports = {
  isLeadEngineEnabled,
  isLeadEngineOpenAiAllowed,
  parseLeadEngineOperators,
  getLeadEngineOperators,
  getLeadEngineSecret,
  isLeadEngineAuthConfigured,
  isLeadEnginePsiExtended,
};
