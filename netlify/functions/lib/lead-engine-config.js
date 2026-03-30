/**
 * Lead engine feature flags and operator list (separate from REFERRAL_AGENTS / REFERRAL_SECRET).
 *
 * LEAD_ENGINE_OPERATORS: username:password per entry, comma, semicolon, or newline separated.
 * Example: ops1:long-random-password,ops2:another-secret
 */
const { envVarFromB64 } = require('./runtime-process-env');

const TRUE_VALUES = new Set(['true', '1', 'yes']);

function isTruthyEnv(v) {
  if (v == null || v === '') return false;
  return TRUE_VALUES.has(String(v).trim().toLowerCase());
}

function isLeadEngineEnabled() {
  return isTruthyEnv(envVarFromB64('TEVBRF9FTkdJTkVfRU5BQkxFRA=='));
}

function isLeadEngineOpenAiAllowed() {
  return isTruthyEnv(envVarFromB64('TEVBRF9FTkdJTkVfQUxMT1dfT1BFTkFJ'));
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
  const raw = envVarFromB64('TEVBRF9FTkdJTkVfT1BFUkFUT1JT') || '';
  return parseLeadEngineOperators(raw);
}

function getLeadEngineSecret() {
  const s = envVarFromB64('TEVBRF9FTkdJTkVfU0VDUkVU');
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
  return isTruthyEnv(envVarFromB64('TEVBRF9FTkdJTkVfUFNJX0VYVEVOREVE'));
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
