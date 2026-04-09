'use strict';

const path = require('path');
const fs = require('fs');

const DEFAULT_ICP_V2_PATH = path.join(__dirname, 'icp-v2.json');
const DEFAULT_ICP_V1_PATH = path.join(__dirname, 'icp-v1.json');

/** Bundle-safe defaults (no runtime fs on Netlify for stock config). */
const EMBEDDED_ICP_V2 = require('./icp-v2.json');
const EMBEDDED_ICP_V1 = require('./icp-v1.json');

function readJsonIfExists(p) {
  if (!p || !fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * Default: embedded icp-v2. Override with explicitPath or LEAD_ENGINE_ICP_CONFIG (file on disk).
 */
function loadIcpConfig(explicitPath) {
  const candidates = [];
  if (explicitPath) {
    candidates.push(
      path.isAbsolute(explicitPath) ? explicitPath : path.join(__dirname, explicitPath)
    );
  }
  const envPath = process.env.LEAD_ENGINE_ICP_CONFIG && String(process.env.LEAD_ENGINE_ICP_CONFIG).trim();
  if (envPath) {
    candidates.push(path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath));
  }
  for (const c of candidates) {
    const j = readJsonIfExists(c);
    if (j) return j;
  }
  return EMBEDDED_ICP_V2;
}

function loadIcpV1Config(explicitPath) {
  if (explicitPath) {
    const p = path.isAbsolute(explicitPath) ? explicitPath : path.join(__dirname, explicitPath);
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  }
  return EMBEDDED_ICP_V1;
}

/**
 * @param {object} prospect — { company_name, website_url }
 * @param {object} icp
 */
function evaluateIcpBaseUrlAndName(prospect, icp) {
  const version = icp && icp.version ? String(icp.version) : 'icp-v1';
  const rules = (icp && icp.rules) || {};
  const tiers = (icp && icp.tiers) || {};
  const hits = [];

  const company = String(prospect.company_name || '').trim();
  const urlStr = String(prospect.website_url || '').trim();

  const minLen = rules.min_company_name_len != null ? Number(rules.min_company_name_len) : 2;
  const maxLen = rules.max_company_name_len != null ? Number(rules.max_company_name_len) : 200;
  if (company.length < minLen) {
    hits.push({ rule: 'min_company_name_len', detail: { minLen, actual: company.length } });
    return {
      pass: false,
      tier: null,
      blockReason: 'company_name_too_short',
      ruleHits: hits,
      version,
    };
  }
  if (company.length > maxLen) {
    hits.push({ rule: 'max_company_name_len', detail: { maxLen, actual: company.length } });
    return {
      pass: false,
      tier: null,
      blockReason: 'company_name_too_long',
      ruleHits: hits,
      version,
    };
  }

  let u;
  try {
    u = new URL(urlStr);
  } catch {
    hits.push({ rule: 'url_parse', detail: {} });
    return { pass: false, tier: null, blockReason: 'invalid_url', ruleHits: hits, version };
  }

  const proto = u.protocol.toLowerCase();
  const allowedProtos = Array.isArray(rules.allowed_url_protocols)
    ? rules.allowed_url_protocols.map((x) => String(x).toLowerCase())
    : ['https:', 'http:'];
  if (!allowedProtos.includes(proto)) {
    hits.push({ rule: 'allowed_url_protocols', detail: { proto } });
    return { pass: false, tier: null, blockReason: 'protocol_not_allowed', ruleHits: hits, version };
  }

  if (rules.require_https && proto === 'http:') {
    hits.push({ rule: 'require_https', detail: {} });
    return { pass: false, tier: null, blockReason: 'http_not_https', ruleHits: hits, version };
  }

  const host = u.hostname.toLowerCase();
  const fullLower = urlStr.toLowerCase();
  const blockedHosts = Array.isArray(rules.blocked_host_substrings) ? rules.blocked_host_substrings : [];
  for (const sub of blockedHosts) {
    if (!sub) continue;
    if (host.includes(String(sub).toLowerCase())) {
      hits.push({ rule: 'blocked_host_substrings', detail: { matched: sub } });
      return { pass: false, tier: null, blockReason: 'blocked_host', ruleHits: hits, version };
    }
  }

  const blockedUrlSubs = Array.isArray(rules.blocked_url_substrings) ? rules.blocked_url_substrings : [];
  for (const sub of blockedUrlSubs) {
    if (!sub) continue;
    if (fullLower.includes(String(sub).toLowerCase())) {
      hits.push({ rule: 'blocked_url_substrings', detail: { matched: sub } });
      return { pass: false, tier: null, blockReason: 'blocked_url', ruleHits: hits, version };
    }
  }

  const blockedRes = Array.isArray(rules.blocked_url_regex) ? rules.blocked_url_regex : [];
  for (const pat of blockedRes) {
    try {
      const re = new RegExp(pat, 'i');
      if (re.test(urlStr)) {
        hits.push({ rule: 'blocked_url_regex', detail: { pattern: pat } });
        return { pass: false, tier: null, blockReason: 'blocked_url_regex', ruleHits: hits, version };
      }
    } catch {
      hits.push({ rule: 'blocked_url_regex_invalid', detail: { pattern: pat } });
    }
  }

  const defaultTier = tiers.default_pass_tier ? String(tiers.default_pass_tier) : 'standard';
  hits.push({ rule: 'pass_base_url_name', detail: { tier: defaultTier } });

  return {
    pass: true,
    tier: defaultTier,
    blockReason: null,
    ruleHits: hits,
    version,
  };
}

function scoutPayloadFromProspect(prospect) {
  const raw = prospect && prospect.raw_payload;
  if (!raw || typeof raw !== 'object') return null;
  return raw.scout_normalized && typeof raw.scout_normalized === 'object' ? raw.scout_normalized : null;
}

function typesFromScout(sn) {
  if (!sn || !Array.isArray(sn.types)) return [];
  return sn.types.map((t) => String(t).toLowerCase());
}

function groupMatch(groupPrefixes, groupName, typesJoined) {
  const list = groupPrefixes && groupPrefixes[groupName];
  if (!Array.isArray(list) || !list.length) return false;
  return list.some((pref) => pref && typesJoined.includes(String(pref).toLowerCase()));
}

/**
 * v2+ extensions (no-op if version is icp-v1 only and file has no extra sections).
 * @param {object} prospect — includes source_key, raw_payload optional
 * @param {object} baseOut — successful output from evaluateIcpBaseUrlAndName
 */
function evaluateIcpV2Extensions(prospect, icp, baseOut) {
  const ver = String(icp.version || '');
  if (!ver.includes('v2') && !icp.geography && !icp.industry && !icp.compliance && !icp.signals && !icp.source_weights) {
    return baseOut;
  }

  const hits = baseOut.ruleHits.slice();
  const sn = scoutPayloadFromProspect(prospect);
  const typesJoined = typesFromScout(sn).join(' ');
  const company = String(prospect.company_name || '').trim();
  const sourceKey = prospect.source_key ? String(prospect.source_key) : '';

  const fail = (blockReason, rule, detail) => {
    hits.push({ rule, detail: detail || {} });
    return {
      pass: false,
      tier: null,
      blockReason,
      ruleHits: hits,
      version: icp.version || baseOut.version,
    };
  };

  const sw = (icp.source_weights && icp.source_weights[sourceKey]) != null ? Number(icp.source_weights[sourceKey]) : 1;
  const policy = icp.source_policy || {};
  if (policy.block_zero_weight_sources !== false && sw === 0) {
    return fail('source_weight_zero', 'source_weights', { source_key: sourceKey, weight: sw });
  }
  const minW = policy.minimum_weight != null ? Number(policy.minimum_weight) : null;
  if (minW != null && Number.isFinite(minW) && sw < minW) {
    return fail('source_weight_below_minimum', 'source_weights', { source_key: sourceKey, weight: sw, minimum_weight: minW });
  }

  const geo = icp.geography || {};
  const allowedCountries = Array.isArray(geo.allowed_countries) ? geo.allowed_countries.map((x) => String(x).toUpperCase()) : [];
  if (allowedCountries.length && sn && sn.address_country) {
    const c = String(sn.address_country).toUpperCase();
    if (!allowedCountries.includes(c)) {
      return fail('geo_country_not_allowed', 'geography.allowed_countries', { country: c });
    }
  }

  const allowedStates = Array.isArray(geo.allowed_us_states)
    ? geo.allowed_us_states.map((x) => String(x).toUpperCase())
    : [];
  if (allowedStates.length && sn && sn.address_admin_area_level_1) {
    const st = String(sn.address_admin_area_level_1).toUpperCase();
    if (!allowedStates.includes(st)) {
      return fail('geo_us_state_not_allowed', 'geography.allowed_us_states', { state: st });
    }
  }

  const blockedStates = Array.isArray(geo.blocked_us_states)
    ? geo.blocked_us_states.map((x) => String(x).toUpperCase())
    : [];
  if (blockedStates.length && sn && sn.address_admin_area_level_1) {
    const st = String(sn.address_admin_area_level_1).toUpperCase();
    if (blockedStates.includes(st)) {
      return fail('geo_us_state_blocked', 'geography.blocked_us_states', { state: st });
    }
  }

  const blockedAddrSubs = Array.isArray(geo.blocked_address_substrings) ? geo.blocked_address_substrings : [];
  const addrBlob = sn ? String(sn.formatted_address || '').toLowerCase() : '';
  for (const sub of blockedAddrSubs) {
    if (!sub) continue;
    if (addrBlob.includes(String(sub).toLowerCase())) {
      return fail('geo_blocked_address', 'geography.blocked_address_substrings', { matched: sub });
    }
  }

  const ind = icp.industry || {};
  const groupPrefixes = ind.group_prefixes && typeof ind.group_prefixes === 'object' ? ind.group_prefixes : {};

  const blockedGroups = Array.isArray(ind.blocked_industry_groups) ? ind.blocked_industry_groups : [];
  for (const g of blockedGroups) {
    if (!g) continue;
    if (groupMatch(groupPrefixes, String(g), typesJoined)) {
      return fail('industry_group_blocked', 'industry.blocked_industry_groups', { group: g });
    }
  }

  const allowedGroups = Array.isArray(ind.allowed_industry_groups) ? ind.allowed_industry_groups : [];
  if (allowedGroups.length && typesJoined) {
    const ok = allowedGroups.some((g) => g && groupMatch(groupPrefixes, String(g), typesJoined));
    if (!ok) {
      return fail('industry_group_not_allowed', 'industry.allowed_industry_groups', { allowed: allowedGroups });
    }
  }

  const blockedTypeSubs = Array.isArray(ind.blocked_google_type_substrings) ? ind.blocked_google_type_substrings : [];
  for (const sub of blockedTypeSubs) {
    if (!sub) continue;
    if (typesJoined.includes(String(sub).toLowerCase())) {
      return fail('industry_type_blocked', 'industry.blocked_google_type_substrings', { matched: sub });
    }
  }

  const requiredTypeSubs = Array.isArray(ind.required_google_type_substrings) ? ind.required_google_type_substrings : [];
  if (requiredTypeSubs.length) {
    if (!typesJoined) {
      return fail('industry_types_missing', 'industry.required_google_type_substrings', {});
    }
    const any = requiredTypeSubs.some((sub) => sub && typesJoined.includes(String(sub).toLowerCase()));
    if (!any) {
      return fail('industry_required_type_missing', 'industry.required_google_type_substrings', {
        required: requiredTypeSubs,
      });
    }
  }

  const blockedNameRe = Array.isArray(ind.blocked_company_name_regex) ? ind.blocked_company_name_regex : [];
  for (const pat of blockedNameRe) {
    try {
      const re = new RegExp(pat, 'i');
      if (re.test(company)) {
        return fail('industry_company_regex_blocked', 'industry.blocked_company_name_regex', { pattern: pat });
      }
    } catch {
      hits.push({ rule: 'blocked_company_name_regex_invalid', detail: { pattern: pat } });
    }
  }

  const comp = icp.compliance || {};
  if (comp.block_sensitive_industry) {
    const sre = Array.isArray(comp.sensitive_company_regex) ? comp.sensitive_company_regex : [];
    for (const pat of sre) {
      try {
        const re = new RegExp(pat, 'i');
        if (re.test(company)) {
          return fail('compliance_sensitive_company', 'compliance.sensitive_company_regex', { pattern: pat });
        }
      } catch {
        /* skip invalid */
      }
    }
    const sts = Array.isArray(comp.sensitive_type_substrings) ? comp.sensitive_type_substrings : [];
    for (const sub of sts) {
      if (sub && typesJoined.includes(String(sub).toLowerCase())) {
        return fail('compliance_sensitive_type', 'compliance.sensitive_type_substrings', { matched: sub });
      }
    }
  }

  const sig = icp.signals || {};
  if (sn && sig.minimum_scout_rating != null && Number.isFinite(Number(sig.minimum_scout_rating))) {
    const minR = Number(sig.minimum_scout_rating);
    const r = sn.rating != null ? Number(sn.rating) : null;
    if (r == null || Number.isNaN(r) || r < minR) {
      return fail('signal_rating_below_minimum', 'signals.minimum_scout_rating', { rating: r, minimum: minR });
    }
  }
  if (sn && sig.minimum_user_ratings_total != null && Number.isFinite(Number(sig.minimum_user_ratings_total))) {
    const minU = Number(sig.minimum_user_ratings_total);
    const u = sn.user_ratings_total != null ? Number(sn.user_ratings_total) : null;
    if (u == null || Number.isNaN(u) || u < minU) {
      return fail('signal_user_ratings_below_minimum', 'signals.minimum_user_ratings_total', {
        user_ratings_total: u,
        minimum: minU,
      });
    }
  }

  const reqOne = Array.isArray(sig.require_scout_types_match_one_of) ? sig.require_scout_types_match_one_of : [];
  if (reqOne.length) {
    if (!typesJoined) {
      return fail('signal_types_required_missing', 'signals.require_scout_types_match_one_of', {});
    }
    const hit = reqOne.some((sub) => sub && typesJoined.includes(String(sub).toLowerCase()));
    if (!hit) {
      return fail('signal_types_required_no_match', 'signals.require_scout_types_match_one_of', { required: reqOne });
    }
  }

  let tier = baseOut.tier;
  if (sw < 1 && tier) {
    hits.push({ rule: 'source_weight_tier_note', detail: { weight: sw, source_key: sourceKey } });
    tier = `${tier}_w${String(sw).replace(/\./g, '_')}`;
  }

  hits.push({ rule: 'pass_icp_extensions', detail: { tier } });
  return {
    pass: true,
    tier,
    blockReason: null,
    ruleHits: hits,
    version: icp.version || baseOut.version,
  };
}

/**
 * @param {object} prospectRow — company_name, website_url, source_key?, raw_payload?
 * @param {object} icp — from loadIcpConfig()
 */
function evaluateProspectAgainstIcp(prospectRow, icp) {
  const base = evaluateIcpBaseUrlAndName(prospectRow, icp);
  if (!base.pass) return base;
  return evaluateIcpV2Extensions(prospectRow, icp, base);
}

module.exports = {
  loadIcpConfig,
  loadIcpV1Config,
  evaluateProspectAgainstIcp,
  evaluateIcpBaseUrlAndName,
  DEFAULT_ICP_V2_PATH,
  DEFAULT_ICP_V1_PATH,
};
