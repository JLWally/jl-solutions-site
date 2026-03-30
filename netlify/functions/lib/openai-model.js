/**
 * Resolve OpenAI model id from env. Handles common copy-paste mistakes (e.g. "4.1-mini" → "gpt-4.1-mini").
 * Uses bracket env access to avoid Netlify/esbuild stripping runtime values.
 */
const DEFAULT_MODEL = 'gpt-4.1-mini';

function normalizeOpenAiModelId(raw) {
  if (raw == null) return DEFAULT_MODEL;
  let m = String(raw).trim();
  if (
    (m.startsWith('"') && m.endsWith('"')) ||
    (m.startsWith("'") && m.endsWith("'"))
  ) {
    m = m.slice(1, -1).trim();
  }
  if (!m) return DEFAULT_MODEL;
  // Table shorthand / truncated env: "4.1-mini" → "gpt-4.1-mini"
  if (/^\d+\.\d+-mini$/i.test(m)) return `gpt-${m.toLowerCase()}`;
  return m;
}

function getOpenAiModel() {
  return normalizeOpenAiModelId(process.env['OPENAI_MODEL']);
}

module.exports = { getOpenAiModel, normalizeOpenAiModelId, DEFAULT_MODEL };
