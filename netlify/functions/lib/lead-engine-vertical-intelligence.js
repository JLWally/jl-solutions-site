'use strict';

const { buildNormalizedVerticalSignals } = require('./lead-engine-vertical-signals');
const { inferIndustryProfile } = require('./lead-engine-industry-inference');

const VI_VERSION = 1;

/**
 * Mutates successful audit signal bundle in-place (before DB insert).
 * @param {object} signalBundle - from buildSuccessSignalBundle
 * @param {object} lead - row with company_name, business_name, website_url, niche, source
 */
function attachVerticalIntelligenceToSignalBundle(signalBundle, lead) {
  if (!signalBundle || signalBundle.success !== true) return signalBundle;
  const normalized_signals = buildNormalizedVerticalSignals(signalBundle);
  const industry_inference = inferIndustryProfile({ lead, signals: signalBundle });
  signalBundle.vertical_intelligence = {
    version: VI_VERSION,
    normalized_signals,
    industry_inference,
  };
  return signalBundle;
}

module.exports = {
  attachVerticalIntelligenceToSignalBundle,
  VI_VERSION,
};
