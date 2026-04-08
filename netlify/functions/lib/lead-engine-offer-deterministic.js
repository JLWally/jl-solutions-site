'use strict';

/**
 * Deterministic per-offer scoring from audit signals (before AI copy).
 * Offers are chosen from weighted signal buckets — not from industry stereotypes.
 * Industry profile only supplies a small scheduling-context tie-break when the profile is dispatch-heavy.
 */

const { buildNormalizedVerticalSignals } = require('./lead-engine-vertical-signals');
const { inferIndustryProfile } = require('./lead-engine-industry-inference');
const { getProfile } = require('./industry-profiles');

const OFFERS = {
  SCHEDULING: 'Scheduling & Resource Routing',
  AI_INTAKE: 'AI Intake Form Setup',
  WEBSITE: 'Website Redesign',
  FIX_MY_APP: 'Fix My App',
};

const OFFER_PRIORITY = [
  OFFERS.SCHEDULING,
  OFFERS.AI_INTAKE,
  OFFERS.WEBSITE,
  OFFERS.FIX_MY_APP,
];

const DRAFT_ANGLE_BY_OFFER = {
  [OFFERS.SCHEDULING]:
    'Emphasize simplifying how people request time, service, or appointments—whether end customers, clients, or internal stakeholders—without friction.',
  [OFFERS.AI_INTAKE]:
    'Emphasize a smarter intake and qualification flow (routing, confirmations, structured capture) instead of a generic contact form.',
  [OFFERS.WEBSITE]:
    'Emphasize homepage and conversion improvements (clarity, mobile experience, trust, CTAs) rather than backend tools.',
  [OFFERS.FIX_MY_APP]:
    'Emphasize fixing specific broken or confusing flows in their existing app, portal, or embedded tool, not a full site redesign.',
};

const EMERGENCY_RE = /\b(emergency|same[-\s]?day|24[-\s/]*7|24\s*hr|after[-\s]?hours|nights?(\s+and\s+|\s*,\s*|\s*&\s*)?weekends?)\b/i;

const SERVICE_AREA_RE =
  /\b(service\s+area|areas?\s+we\s+serve|communities\s+we|counties|coverage\s+area|zip\s*codes?\s+we|locations?\s+we\s+serve)\b/i;

const SERVICE_TYPE_RES = [
  /\brepair\b/i,
  /\b(install|installation)\b/i,
  /\bmaintenance\b/i,
  /\b(tune[-\s]?up|tuneup)\b/i,
  /\breplacement\b/i,
];

const PORTAL_TOOL_RE =
  /\b(portal|customer\s*login|client\s*login|my\s*account|web\s*app|dispatcher|field\s*service|service\s*titan|housecall|jobber|fieldedge|workiz|servicetitan)\b/i;

const PORTAL_URL_RE = /\/(portal|login|account|app|customer|dispatch)\b/i;

/** Dispatch / field-service language that applies across verticals (not HVAC-only). */
const FIELD_DISPATCH_RE =
  /\b(repair|installation|maintenance|technician|crew|route|dispatch|field\s+service|on[-\s]?site|service\s+truck)\b/i;

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCorpus(signals) {
  const parts = [];
  const pages = signals && Array.isArray(signals.pages) ? signals.pages : [];
  for (const p of pages) {
    if (p.page_title) parts.push(p.page_title);
    if (p.h1) parts.push(p.h1);
    if (p.meta_description) parts.push(p.meta_description);
    for (const c of p.ctas || []) {
      if (c && c.text) parts.push(c.text);
    }
    for (const b of p.booking_links || []) {
      if (b && b.text) parts.push(b.text);
    }
  }
  return norm(parts.join(' | '));
}

function collectHrefCorpus(signals) {
  const urls = [];
  const pages = signals && Array.isArray(signals.pages) ? signals.pages : [];
  for (const p of pages) {
    if (p.url) urls.push(String(p.url).toLowerCase());
    for (const c of p.ctas || []) {
      if (c && c.href) urls.push(String(c.href).toLowerCase());
    }
  }
  return urls.join(' ');
}

function countServiceTypeHits(corpus) {
  const hits = new Set();
  for (const re of SERVICE_TYPE_RES) {
    if (re.test(corpus)) hits.add(re.source);
  }
  return hits.size;
}

function hasAppPortalToolSignal(corpus, hrefCorpus, aggregate) {
  if (PORTAL_TOOL_RE.test(corpus)) return true;
  if (PORTAL_URL_RE.test(hrefCorpus)) return true;
  const chat = (aggregate && aggregate.chat_widget_hints) || [];
  if (chat.length > 0) return true;
  return false;
}

function addReason(bucket, points, label) {
  if (points <= 0) return;
  bucket.total += points;
  bucket.reasons.push({ points, label });
}

function isNonLocalServiceContext(normalized, corpus) {
  if (!normalized) return false;
  if (normalized.compliance_sensitive_language) return true;
  if (normalized.b2b_or_enterprise_cues) return true;
  return false;
}

function fieldDispatchHeuristic(corpus, normalized, aggregate) {
  if (isNonLocalServiceContext(normalized, corpus)) return false;
  if (normalized && normalized.service_area_language) return true;
  if (FIELD_DISPATCH_RE.test(corpus)) return true;
  if (normalized && normalized.appointment_or_intake_language && !aggregate.booking_detected) return true;
  return false;
}

/**
 * @param {number} schedulingContextWeight from industry profile (1 = neutral)
 */
function scoreScheduling(aggregate, ux, corpus, normalized, schedulingContextWeight, profile) {
  const bucket = { total: 0, reasons: [] };
  const nonLocal = isNonLocalServiceContext(normalized, corpus);
  const parentId = profile && profile.parentId ? profile.parentId : 'unknown';

  if (!aggregate.booking_detected) {
    addReason(bucket, nonLocal ? 1 : 3, 'No obvious online booking path');
  }
  if (EMERGENCY_RE.test(corpus)) {
    addReason(bucket, 2, 'Emergency / same-day / 24-7 language');
  }
  if (countServiceTypeHits(corpus) >= 2) {
    addReason(bucket, nonLocal ? 0 : 2, 'Multiple service types (e.g. repair / install / maintenance)');
  }
  const weakRequest =
    !aggregate.booking_detected &&
    (ux.includes('missing_contact_form') || (aggregate.forms_count_total || 0) <= 1);
  if (weakRequest) {
    addReason(bucket, nonLocal ? 1 : 2, 'Weak estimate / service request flow');
  }
  if (SERVICE_AREA_RE.test(corpus)) {
    addReason(bucket, nonLocal ? 0 : 2, 'Service area / coverage complexity');
  }
  const phoneFirst =
    aggregate.has_visible_phone &&
    !aggregate.booking_detected &&
    (aggregate.has_mailto || aggregate.has_tel || aggregate.has_phone_in_text);
  if (phoneFirst) {
    addReason(bucket, nonLocal ? 1 : 2, 'Phone-first / manual scheduling workflow');
  }
  const w = Number(schedulingContextWeight) || 1;
  if (
    parentId === 'local_service' &&
    w > 1.05 &&
    fieldDispatchHeuristic(corpus, normalized, aggregate)
  ) {
    addReason(bucket, Math.min(2, Math.round((w - 1) * 2)), 'Dispatch-style service signals match this vertical profile');
  }
  return bucket;
}

function scoreAiIntake(aggregate, ux, corpus, normalized) {
  const bucket = { total: 0, reasons: [] };
  const forms = aggregate.forms_count_total || 0;
  if (normalized && normalized.compliance_sensitive_language) {
    addReason(bucket, 2, 'Compliance / sensitive-data context favors structured intake');
  }
  if (normalized && normalized.rfq_or_estimate_language) {
    addReason(bucket, 2, 'Quote, estimate, or proposal-request language');
  }
  if (normalized && normalized.b2b_or_enterprise_cues) {
    addReason(bucket, 2, 'B2B / enterprise journey (demo, sales, or qualification paths)');
  }
  if (forms < 2) {
    addReason(bucket, 3, 'No multi-step or rich intake pattern');
  }
  if (forms === 1 && ux.includes('missing_clear_cta')) {
    addReason(bucket, 2, 'Generic contact path / weak primary CTA');
  } else if (forms <= 1 && ux.includes('missing_contact_form')) {
    addReason(bucket, 2, 'Generic or missing structured contact capture');
  }
  if (!aggregate.chat_widget_hints || aggregate.chat_widget_hints.length === 0) {
    addReason(bucket, 2, 'No chat / intake automation widget');
  }
  if (!aggregate.booking_detected && !/\b(thank\s*you|confirmation|confirmed|scheduled)\b/i.test(corpus)) {
    addReason(bucket, 2, 'No obvious confirmation / booking-complete language');
  }
  if (countServiceTypeHits(corpus) < 2) {
    addReason(bucket, 2, 'Limited branching or specialization by service type in copy');
  }
  return bucket;
}

function scoreWebsiteRedesign(aggregate, ux, psiPrimary) {
  const bucket = { total: 0, reasons: [] };
  const perf = psiPrimary && psiPrimary.performance_score != null ? Number(psiPrimary.performance_score) : null;
  const bp = psiPrimary && psiPrimary.best_practices_score != null ? Number(psiPrimary.best_practices_score) : null;

  if (perf != null && perf < 50) {
    addReason(bucket, 3, 'Weak mobile performance (Lighthouse)');
  } else if (perf != null && perf < 65) {
    addReason(bucket, 2, 'Below-average mobile performance');
  }
  if (perf != null && perf < 55) {
    addReason(bucket, 2, 'Poor mobile UX signal (performance)');
  }
  if (ux.includes('missing_clear_cta') || (aggregate.cta_count_home || 0) < 2) {
    addReason(bucket, 2, 'Weak CTA placement / clarity');
  }
  if (!aggregate.trust_markers || aggregate.trust_markers.length === 0) {
    addReason(bucket, 2, 'Thin on-page trust signals');
  }
  if (ux.length >= 4 || (aggregate.forms_count_total || 0) > 4) {
    addReason(bucket, 2, 'Cluttered structure or many competing paths');
  }
  if (bp != null && bp < 70) {
    addReason(bucket, 2, 'Best-practices / quality gaps (Lighthouse)');
  }
  return bucket;
}

function scoreFixMyApp(aggregate, ux, corpus, hrefCorpus, eligible) {
  const bucket = { total: 0, reasons: [] };
  if (!eligible) {
    return bucket;
  }
  if (hasAppPortalToolSignal(corpus, hrefCorpus, aggregate)) {
    addReason(bucket, 3, 'Existing portal, app, widget, or field-service tool signal');
  }
  if (ux.length >= 3) {
    addReason(bucket, 3, 'Multiple UX friction signals');
  }
  if (aggregate.booking_detected && ux.includes('no_obvious_booking_path')) {
    addReason(bucket, 3, 'Contradictory or broken scheduling signals');
  }
  const perfProblem =
    corpus.includes('error') ||
    ux.some((h) => /missing_h1|missing_clear_title|missing_meta_description/.test(h));
  if (perfProblem) {
    addReason(bucket, 2, 'Structural or flow inconsistency');
  }
  return bucket;
}

/**
 * When inferred profile is dispatch-heavy and scheduling >= aiIntake, demote AI Intake slightly (tie-break).
 */
function applyProfileSchedulingTieBreak(offerTotals, profile) {
  const out = { ...offerTotals };
  const w = Number(profile && profile.schedulingContextWeight) || 1;
  if (!profile || profile.parentId !== 'local_service' || w < 1.35) return out;
  const s = out[OFFERS.SCHEDULING];
  const a = out[OFFERS.AI_INTAKE];
  if (s >= a) {
    out[OFFERS.AI_INTAKE] = Math.min(a, Math.max(0, s - 1));
  }
  return out;
}

function pickWinner(offerTotals) {
  let max = -Infinity;
  for (const name of OFFER_PRIORITY) {
    const t = offerTotals[name] ?? 0;
    if (t > max) max = t;
  }
  for (const name of OFFER_PRIORITY) {
    if ((offerTotals[name] ?? 0) === max) return { winner: name, maxScore: max };
  }
  return { winner: OFFERS.SCHEDULING, maxScore: 0 };
}

function topSignalsFromWinner(winnerBucket, limit = 3) {
  const sorted = [...(winnerBucket.reasons || [])].sort((x, y) => y.points - x.points);
  return sorted.slice(0, limit).map((r) => r.label);
}

function resolveVerticalIntelligence(lead, signals) {
  if (signals && signals.vertical_intelligence && signals.vertical_intelligence.normalized_signals) {
    return {
      normalized_signals: signals.vertical_intelligence.normalized_signals,
      industry_inference: signals.vertical_intelligence.industry_inference || inferIndustryProfile({ lead, signals }),
    };
  }
  return {
    normalized_signals: buildNormalizedVerticalSignals(signals),
    industry_inference: inferIndustryProfile({ lead, signals }),
  };
}

/**
 * @param {{ company_name?: string, website_url?: string, niche?: string }} lead
 * @param {object} signals - successful audit signal bundle
 * @returns {{
 *   selected_offer: string,
 *   offer_scores: Record<string, { total: number, reasons: string[] }>,
 *   top_supporting_signals: string[],
 *   draft_angle: string,
 *   industry_inference: object,
 *   normalized_signals: object,
 *   scheduling_context_weight: number,
 *   fix_my_app_eligible: boolean,
 * }}
 */
function computeDeterministicOfferSelection(lead, signals) {
  const aggregate = (signals && signals.aggregate) || {};
  const ux = Array.isArray(signals && signals.ux_hints) ? signals.ux_hints : [];
  const corpus = buildCorpus(signals);
  const hrefCorpus = collectHrefCorpus(signals);
  const psiPrimary = signals && signals.psi && signals.psi.primary_scores ? signals.psi.primary_scores : null;

  const { normalized_signals, industry_inference } = resolveVerticalIntelligence(lead, signals);
  const profile = getProfile(industry_inference.profile_id);
  const schedulingContextWeight = profile.schedulingContextWeight || 1;

  const fixMyAppEligible = hasAppPortalToolSignal(corpus, hrefCorpus, aggregate);

  const schedulingB = scoreScheduling(aggregate, ux, corpus, normalized_signals, schedulingContextWeight, profile);
  const aiB = scoreAiIntake(aggregate, ux, corpus, normalized_signals);
  const webB = scoreWebsiteRedesign(aggregate, ux, psiPrimary);
  const fixB = scoreFixMyApp(aggregate, ux, corpus, hrefCorpus, fixMyAppEligible);

  const offer_scores = {
    [OFFERS.SCHEDULING]: schedulingB,
    [OFFERS.AI_INTAKE]: aiB,
    [OFFERS.WEBSITE]: webB,
    [OFFERS.FIX_MY_APP]: fixB,
  };

  const flatTotals = {
    [OFFERS.SCHEDULING]: schedulingB.total,
    [OFFERS.AI_INTAKE]: aiB.total,
    [OFFERS.WEBSITE]: webB.total,
    [OFFERS.FIX_MY_APP]: fixMyAppEligible ? fixB.total : 0,
  };

  const adjusted = applyProfileSchedulingTieBreak(flatTotals, profile);
  const { winner } = pickWinner(adjusted);
  const winnerBucket = offer_scores[winner];

  const top_supporting_signals = topSignalsFromWinner(winnerBucket, 3);
  const draft_angle = DRAFT_ANGLE_BY_OFFER[winner] || DRAFT_ANGLE_BY_OFFER[OFFERS.SCHEDULING];

  const offer_scores_serializable = {};
  for (const k of Object.keys(offer_scores)) {
    const b = offer_scores[k];
    offer_scores_serializable[k] = {
      total: k === OFFERS.FIX_MY_APP && !fixMyAppEligible ? 0 : b.total,
      reasons: b.reasons.map((r) => `${r.label} (+${r.points})`),
    };
  }

  return {
    selected_offer: winner,
    offer_scores: offer_scores_serializable,
    top_supporting_signals,
    draft_angle,
    industry_inference,
    normalized_signals,
    scheduling_context_weight: schedulingContextWeight,
    fix_my_app_eligible: fixMyAppEligible,
  };
}

module.exports = {
  OFFERS,
  OFFER_PRIORITY,
  DRAFT_ANGLE_BY_OFFER,
  computeDeterministicOfferSelection,
  buildCorpus,
  hasAppPortalToolSignal,
  applyProfileSchedulingTieBreak,
  resolveVerticalIntelligence,
};
