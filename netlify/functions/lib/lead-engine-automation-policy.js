'use strict';

const path = require('path');
const fs = require('fs');

const DEFAULT_POLICY_PATH = path.join(__dirname, 'automation-policy-v1.json');

function loadAutomationPolicy(explicitPath) {
  const p = explicitPath || DEFAULT_POLICY_PATH;
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

module.exports = {
  loadAutomationPolicy,
  DEFAULT_POLICY_PATH,
};
