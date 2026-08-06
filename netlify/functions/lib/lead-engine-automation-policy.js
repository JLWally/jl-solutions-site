'use strict';

const fs = require('fs');
const path = require('path');
const { isNetlifyBundleArtifactPath } = require('./lead-engine-config-override-guard');
const defaultPolicy = require('./automation-policy-v1.json');

function readOverrideJson(resolvedPath, envVarName) {
  try {
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (e) {
    const code = e && e.code;
    const detail = code === 'ENOENT' ? 'file not found' : e.message || String(e);
    throw new Error(`${envVarName}: ${detail} (${resolvedPath})`);
  }
}

function loadAutomationPolicy() {
  const raw = process.env.LEAD_ENGINE_AUTOMATION_POLICY_PATH;
  const overridePath = raw != null ? String(raw).trim() : '';
  if (overridePath) {
    const resolved = path.resolve(overridePath);
    if (isNetlifyBundleArtifactPath(resolved)) {
      console.warn(
        '[lead-engine-automation-policy] LEAD_ENGINE_AUTOMATION_POLICY_PATH points at a Netlify bundle path; using embedded default. Unset this variable in Netlify UI and your shell.',
        resolved
      );
      return defaultPolicy;
    }
    return readOverrideJson(resolved, 'LEAD_ENGINE_AUTOMATION_POLICY_PATH');
  }
  return defaultPolicy;
}

module.exports = { loadAutomationPolicy };
