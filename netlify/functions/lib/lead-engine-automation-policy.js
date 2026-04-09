'use strict';

const path = require('path');
const fs = require('fs');

/** Bundle-safe default (no runtime fs read on Netlify). */
const EMBEDDED_AUTOMATION_POLICY = require('./automation-policy-v1.json');

function loadAutomationPolicy(explicitPath) {
  if (explicitPath) {
    const raw = fs.readFileSync(explicitPath, 'utf8');
    return JSON.parse(raw);
  }
  const envP =
    process.env.LEAD_ENGINE_AUTOMATION_POLICY_PATH &&
    String(process.env.LEAD_ENGINE_AUTOMATION_POLICY_PATH).trim();
  if (envP) {
    const p = path.isAbsolute(envP) ? envP : path.join(process.cwd(), envP);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  return EMBEDDED_AUTOMATION_POLICY;
}

const DEFAULT_POLICY_PATH = path.join(__dirname, 'automation-policy-v1.json');

module.exports = {
  loadAutomationPolicy,
  DEFAULT_POLICY_PATH,
};
