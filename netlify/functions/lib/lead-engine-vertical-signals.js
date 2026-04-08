'use strict';

/**
 * Cross-vertical normalized signals derived from audit bundle (not industry-specific branches).
 * @param {object} signals - success signal bundle from buildSuccessSignalBundle
 */
function buildNormalizedVerticalSignals(signals) {
  const aggregate = (signals && signals.aggregate) || {};
  const ux = Array.isArray(signals && signals.ux_hints) ? signals.ux_hints : [];
  const pages = signals && Array.isArray(signals.pages) ? signals.pages : [];
  const psiPrimary = signals && signals.psi && signals.psi.primary_scores ? signals.psi.primary_scores : null;

  const forms = Number(aggregate.forms_count_total || 0);
  const booking = !!aggregate.booking_detected;
  const trustCount = Array.isArray(aggregate.trust_markers) ? aggregate.trust_markers.length : 0;

  let formQualityTier = 'none';
  if (forms <= 0) formQualityTier = 'none';
  else if (forms === 1 && ux.includes('missing_contact_form')) formQualityTier = 'weak';
  else if (forms < 2 && (ux.includes('missing_clear_cta') || ux.includes('missing_contact_form')))
    formQualityTier = 'weak';
  else if (forms >= 3) formQualityTier = forms >= 5 ? 'strong' : 'medium';
  else formQualityTier = 'medium';

  const parts = [];
  for (const p of pages) {
    if (p.page_title) parts.push(p.page_title);
    if (p.h1) parts.push(p.h1);
    if (p.meta_description) parts.push(p.meta_description);
    for (const c of p.ctas || []) {
      if (c && c.text) parts.push(c.text);
    }
  }
  const corpus = String(parts.join(' | ')).toLowerCase();

  const multiStepLikely =
    forms >= 2 ||
    /\b(step\s*1|step\s*one|next\s*step|multi[-\s]?step|wizard|progress)\b/i.test(corpus);

  const complianceLanguage =
    /\b(hipaa|phi|pii|privacy policy|data processing agreement|consent|gdpr|pci[\s-]?dss|soc\s?2|iso\s?27001|fedramp|state\s?ramp|cmmc|nist\s?800|confidential|protected health|business associate|baa|ferpa|coppa|regulated industry|breach notification)\b/i.test(
      corpus
    );

  const b2bOrEnterpriseCues =
    /\b(b2b|saas|enterprise\s+(software|solution|platform|customer|client)\b|for\s+organizations|for\s+businesses|corporate\s+clients|digital\s+transformation|managed\s+services|systems\s+integra|request\s+a\s+demo|contact\s+sales|book\s+a\s+demo|schedule\s+a\s+demo|talk\s+to\s+sales|partner\s+program|reseller)\b/i.test(
      corpus
    );

  const rfqOrEstimate =
    /\b(request\s+(a\s+)?quote|free\s+estimate|get\s+(a\s+)?quote|rfq|proposal\s+request)\b/i.test(
      corpus
    );

  const appointmentIntake =
    /\b(appointment|schedule\s+(a\s+)?(visit|call|consult)|book\s+(online|now)|intake|screening|eligibility|new\s+patient|consultation)\b/i.test(
      corpus
    );

  const manualProcess =
    /\b(call\s+us\s+to|call\s+today|phone\s+to\s+schedule|contact\s+us\s+to\s+book)\b/i.test(
      corpus
    ) && !booking;

  const perf = psiPrimary && psiPrimary.performance_score != null ? Number(psiPrimary.performance_score) : null;
  const mobilePerfConcern = perf != null && perf < 55;

  const serviceAreaSignal = /\b(service\s+area|areas?\s+we\s+serve|coverage|zip\s*codes?\s+we)\b/i.test(
    corpus
  );

  let trustStrength = 'thin';
  if (trustCount >= 3) trustStrength = 'rich';
  else if (trustCount >= 1) trustStrength = 'moderate';

  return {
    version: 1,
    online_booking: booking ? 'present' : forms > 0 || corpus.length > 80 ? 'absent' : 'unclear',
    multi_step_intake: multiStepLikely ? 'likely' : forms <= 1 ? 'unlikely' : 'unknown',
    form_quality_tier: formQualityTier,
    form_count: forms,
    service_area_language: serviceAreaSignal,
    trust_signal_strength: trustStrength,
    trust_marker_count: trustCount,
    mobile_performance_concern: mobilePerfConcern,
    lighthouse_performance: perf,
    ux_friction_hint_count: ux.length,
    compliance_sensitive_language: complianceLanguage,
    b2b_or_enterprise_cues: b2bOrEnterpriseCues,
    rfq_or_estimate_language: rfqOrEstimate,
    appointment_or_intake_language: appointmentIntake,
    manual_scheduling_language: manualProcess,
  };
}

module.exports = {
  buildNormalizedVerticalSignals,
};
