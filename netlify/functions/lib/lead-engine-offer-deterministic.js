'use strict';

/**
 * Deterministic per-offer scoring from audit signals (before AI copy).
 * HVAC: prefer Scheduling & Resource Routing when its score >= AI Intake (see applyHvacOfferPreference).
 */

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
    'Emphasize simplifying the service request and scheduling flow so homeowners can book or request service without friction.',
  [OFFERS.AI_INTAKE]:
    'Emphasize a smarter intake and qualification flow (routing, confirmations, structured capture) instead of a generic contact form.',
  [OFFERS.WEBSITE]:
    'Emphasize homepage and conversion improvements (clarity, mobile experience, trust, CTAs) rather than backend tools.',
  [OFFERS.FIX_MY_APP]:
    'Emphasize fixing specific broken or confusing flows in their existing app, portal, or embedded tool, not a full site redesign.',
};

const HVAC_CORPUS_RE = /\b(hvac|h\.?v\.?a\.?c\.?|heating|cooling|air conditioning|air\s*conditioning|furnace|a\/c\b|\bac\b repair|heat pump|ductwork|duct work|boiler|mini[-\s]?split|central air|refrigeration)\b/i;

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

function detectHvacNiche(lead, corpus) {
  const name = norm(lead && lead.company_name);
  const url = norm(lead && lead.website_url);
  if (HVAC_CORPUS_RE.test(name) || HVAC_CORPUS_RE.test(url)) return true;
  return HVAC_CORPUS_RE.test(corpus);
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

function scoreScheduling(aggregate, ux, corpus, isHvac) {
  const bucket = { total: 0, reasons: [] };
  if (!aggregate.booking_detected) {
    addReason(bucket, 3, 'No obvious online booking path');
  }
  if (EMERGENCY_RE.test(corpus)) {
    addReason(bucket, 2, 'Emergency / same-day / 24-7 language');
  }
  if (countServiceTypeHits(corpus) >= 2) {
    addReason(bucket, 2, 'Multiple service types (e.g. repair / install / maintenance)');
  }
  const weakRequest =
    !aggregate.booking_detected &&
    (ux.includes('missing_contact_form') || (aggregate.forms_count_total || 0) <= 1);
  if (weakRequest) {
    addReason(bucket, 2, 'Weak estimate / service request flow');
  }
  if (SERVICE_AREA_RE.test(corpus)) {
    addReason(bucket, 2, 'Service area / coverage complexity');
  }
  const phoneFirst =
    aggregate.has_visible_phone &&
    !aggregate.booking_detected &&
    (aggregate.has_mailto || aggregate.has_tel || aggregate.has_phone_in_text);
  if (phoneFirst) {
    addReason(bucket, 2, 'Phone-first / manual scheduling workflow');
  }
  if (isHvac) {
    addReason(bucket, 2, 'HVAC / mechanical trade niche');
  }
  return bucket;
}

function scoreAiIntake(aggregate, ux, corpus) {
  const bucket = { total: 0, reasons: [] };
  const forms = aggregate.forms_count_total || 0;
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
 * When HVAC and scheduling >= aiIntake, demote AI Intake so Scheduling wins ties and near-ties.
 */
function applyHvacOfferPreference(scores, isHvac) {
  const out = { ...scores };
  if (!isHvac) return out;
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

/**
 * @param {{ company_name?: string, website_url?: string }} lead
 * @param {object} signals - successful audit signal bundle
 * @returns {{
 *   selected_offer: string,
 *   offer_scores: Record<string, { total: number, reasons: { points: number, label: string }[] }>,
 *   top_supporting_signals: string[],
 *   draft_angle: string,
 *   is_hvac: boolean,
 *   fix_my_app_eligible: boolean,
 * }}
 */
function computeDeterministicOfferSelection(lead, signals) {
  const aggregate = (signals && signals.aggregate) || {};
  const ux = Array.isArray(signals && signals.ux_hints) ? signals.ux_hints : [];
  const corpus = buildCorpus(signals);
  const hrefCorpus = collectHrefCorpus(signals);
  const isHvac = detectHvacNiche(lead, corpus);
  const psiPrimary = signals && signals.psi && signals.psi.primary_scores ? signals.psi.primary_scores : null;

  const fixMyAppEligible = hasAppPortalToolSignal(corpus, hrefCorpus, aggregate);

  const schedulingB = scoreScheduling(aggregate, ux, corpus, isHvac);
  const aiB = scoreAiIntake(aggregate, ux, corpus);
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

  const adjusted = applyHvacOfferPreference(flatTotals, isHvac);
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
    is_hvac: isHvac,
    fix_my_app_eligible: fixMyAppEligible,
  };
}

module.exports = {
  OFFERS,
  OFFER_PRIORITY,
  DRAFT_ANGLE_BY_OFFER,
  computeDeterministicOfferSelection,
  buildCorpus,
  detectHvacNiche,
  hasAppPortalToolSignal,
  applyHvacOfferPreference,
};
