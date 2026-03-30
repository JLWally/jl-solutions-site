/**
 * Read process.env by key decoded at runtime (base64).
 * Prevents build/bundler steps from replacing literal process.env.LEAD_ENGINE_* with
 * empty values when secrets exist only at function runtime on Netlify.
 */
function envVarFromB64(b64) {
  const key = Buffer.from(b64, 'base64').toString('utf8');
  return process.env[key];
}

module.exports = { envVarFromB64 };
