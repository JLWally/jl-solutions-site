'use strict';

const {
  buildScoreSystemPrompt,
  buildScoreUserContent,
} = require('./lead-engine-score-prompt');
const { parseAndValidateScoreModelTextWithFixedOffer } = require('./lead-engine-score-output');
const { computeDeterministicOfferSelection } = require('./lead-engine-offer-deterministic');
const { completeLeadScoreModel } = require('./lead-engine-openai-score');
const { pickNewestSuccessfulAnalysisRow } = require('./lead-engine-analysis-pick');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lead-engine-audit-log');

const LEAD_SELECT = 'id, company_name, website_url, source, status';
const SCORE_MODEL_VERSION_SUFFIX = 'jl-lead-score-v2-deterministic-offer';

async function runScoreForLead(supabase, leadId, actor) {
  const { data: lead, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select(LEAD_SELECT)
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr) return { ok: false, statusCode: 500, code: 'LEAD_LOAD_FAILED', error: 'Failed to load lead' };
  if (!lead) return { ok: false, statusCode: 404, code: 'LEAD_NOT_FOUND', error: 'Lead not found' };

  const { data: analysisRows, error: aErr } = await supabase
    .from('lead_engine_analysis')
    .select('id, signals, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (aErr) return { ok: false, statusCode: 500, code: 'ANALYSIS_LOAD_FAILED', error: 'Failed to load analyses' };

  const analysisRow = pickNewestSuccessfulAnalysisRow(analysisRows || []);
  if (!analysisRow) {
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      event_type: EVENT_TYPES.SCORE_FAILURE,
      actor: actor || null,
      message: 'Score skipped: no successful analysis',
      metadata_json: { code: 'NO_SUCCESSFUL_ANALYSIS' },
    });
    return {
      ok: false,
      statusCode: 409,
      code: 'NO_SUCCESSFUL_ANALYSIS',
      error:
        'No successful website audit found for this lead. Run Analyze first and ensure the audit completes successfully.',
    };
  }

  const deterministic = computeDeterministicOfferSelection(lead, analysisRow.signals);
  const systemPrompt = buildScoreSystemPrompt(deterministic);
  const userContent = buildScoreUserContent(lead, analysisRow.signals, deterministic);
  let rawText;
  let usedModel;
  try {
    const out = await completeLeadScoreModel({ systemPrompt, userContent });
    rawText = out.text;
    usedModel = out.model;
  } catch (e) {
    return {
      ok: false,
      statusCode: 502,
      code: 'OPENAI_REQUEST_FAILED',
      error: 'OpenAI request failed',
      details: e.message || String(e),
    };
  }
  if (!rawText || !String(rawText).trim()) {
    return { ok: false, statusCode: 502, code: 'EMPTY_MODEL_RESPONSE', error: 'Empty response from model' };
  }

  const parsed = parseAndValidateScoreModelTextWithFixedOffer(rawText, deterministic.selected_offer);
  if (!parsed.ok) {
    return {
      ok: false,
      statusCode: 502,
      code: 'INVALID_MODEL_SCORING_JSON',
      error: 'Model returned invalid scoring JSON',
      errors: parsed.errors,
    };
  }

  const offerFinal = deterministic.selected_offer;

  const scoresPayload = {
    fit_score: parsed.value.fit_score,
    confidence: parsed.value.confidence,
    pain_points: parsed.value.pain_points,
    outreach_angle: parsed.value.outreach_angle,
    offer_rationale: parsed.value.offer_rationale || null,
    selected_offer: offerFinal,
    offer_scores: deterministic.offer_scores,
    top_supporting_signals: deterministic.top_supporting_signals,
    draft_angle: deterministic.draft_angle,
    is_hvac_niche: deterministic.is_hvac,
    fix_my_app_eligible: deterministic.fix_my_app_eligible,
  };
  const modelVersion = `${usedModel}|${SCORE_MODEL_VERSION_SUFFIX}`;

  const { data: inserted, error: insErr } = await supabase
    .from('lead_engine_ai_scores')
    .insert({
      lead_id: leadId,
      analysis_id: analysisRow.id,
      scores: scoresPayload,
      recommended_offer: offerFinal,
      model_version: modelVersion,
    })
    .select('id')
    .single();
  if (insErr) return { ok: false, statusCode: 500, code: 'SCORE_SAVE_FAILED', error: 'Failed to save AI scores' };

  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    analysis_id: analysisRow.id,
    ai_score_id: inserted.id,
    event_type: EVENT_TYPES.SCORE_SUCCESS,
    actor: actor || null,
    message: 'Score generated',
  });

  await supabase
    .from('lead_engine_leads')
    .update({
      lead_score: parsed.value.fit_score,
      pain_points: parsed.value.pain_points,
      outreach_angle: parsed.value.outreach_angle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  return {
    ok: true,
    statusCode: 200,
    value: {
      success: true,
      leadId,
      analysisId: analysisRow.id,
      aiScoreId: inserted.id,
      scores: scoresPayload,
      recommended_offer: offerFinal,
      model_version: modelVersion,
    },
  };
}

module.exports = { runScoreForLead };

