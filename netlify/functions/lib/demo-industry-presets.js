/**
 * Demo service/issue defaults — delegated to config-driven industry-profiles.js.
 * This module keeps the same exports for demo-config, lead-engine-demo-generate, and demo builder.
 */
'use strict';

const ip = require('./industry-profiles');

function listIndustryKeys() {
  return ip.listDemoPresetKeys();
}

function getPreset(key) {
  return ip.getDemoPreset(key);
}

/**
 * Normalize services: unique, non-empty, capped.
 */
function normalizeServices(userList, industryKey, max = 12) {
  const preset = getPreset(industryKey);
  const base = Array.isArray(userList)
    ? userList.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const seen = new Set();
  const out = [];
  for (const s of base) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  if (out.length === 0) {
    return preset.defaultServices.slice(0, max);
  }
  return out;
}

/**
 * Normalize issue / symptom options for multi-step demo (wizard step 2).
 */
function normalizeIssueOptions(userList, industryKey, max = 12) {
  const preset = getPreset(industryKey);
  const fallback = preset.defaultIssueOptions || getPreset('unknown').defaultIssueOptions;
  const base = Array.isArray(userList)
    ? userList.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const seen = new Set();
  const out = [];
  for (const s of base) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  if (out.length === 0) {
    return fallback.slice(0, max);
  }
  return out;
}

/** @deprecated use industry-profiles PROFILES — kept for rare requires of raw map */
const PRESETS = ip.PROFILES;

module.exports = {
  PRESETS,
  getPreset,
  listIndustryKeys,
  normalizeServices,
  normalizeIssueOptions,
};
