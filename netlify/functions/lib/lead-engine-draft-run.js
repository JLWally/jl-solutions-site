'use strict';

const {
  buildDraftSystemPrompt,
  buildDraftUserContent,
} = require('./lead-engine-draft-prompt');
const {
  parseAndValidateDraftModelText,
  composeDraftBody,
} = require('./lead-engine-draft-output');
const { completeDraftModel } = require('./lead-engine-openai-draft');
const { pickNewestSuccessfulAnalysisRow } = require('./lead-engine-analysis-pick');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lead-engine-audit-log');

const { buildOutreachDemoFooter } = require('./lead-engine-demo-templates');
const { getLeadEnginePublicSiteUrl } = require('./lead-engine-public-site-url');

const LEAD_SELECT = 'id, company_name, website_url, source, status, demo_slug';

async function runDraftForLead(supabase, leadId, channel, actor) {
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
      event_type: EVENT_TYPES.DRAFT_FAILED,
      actor: actor || null,
      message: 'Draft skipped: no successful analysis',
      metadata_json: { code: 'NO_SUCCESSFUL_ANALYSIS' },
    });
    return {
      ok: false,
      statusCode: 409,
      code: 'NO_SUCCESSFUL_ANALYSIS',
      error:
        'No successful website audit found for this lead. Run Analyze successfully before generating a draft.',
    };
  }

  const { data: aiRows, error: aiErr } = await supabase
    .from('lead_engine_ai_scores')
    .select('id, analysis_id, scores, recommended_offer, model_version, created_at')
    .eq('analysis_id', analysisRow.id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (aiErr) return { ok: false, statusCode: 500, code: 'AI_SCORE_LOAD_FAILED', error: 'Failed to load AI scores' };

  const aiScoreRow = aiRows && aiRows[0];
  if (!aiScoreRow) {
    await logLeadEngineEvent(supabase, {
      lead_id: leadId,
      analysis_id: analysisRow.id,
      event_type: EVENT_TYPES.DRAFT_FAILED,
      actor: actor || null,
      message: 'Draft skipped: no AI score',
      metadata_json: { code: 'NO_AI_SCORE_FOR_ANALYSIS' },
    });
    return {
      ok: false,
      statusCode: 409,
      code: 'NO_AI_SCORE_FOR_ANALYSIS',
      error:
        'No AI score found for this lead’s successful audit. Run Score first (scores are stored in lead_engine_ai_scores).',
    };
  }

  const systemPrompt = buildDraftSystemPrompt();
  const userContent = buildDraftUserContent(lead, analysisRow.signals, aiScoreRow);
  let rawText;
  try {
    const out = await completeDraftModel({ systemPrompt, userContent });
    rawText = out.text;
  } catch (e) {
    return {
      ok: false,
      statusCode: 502,
      code: 'DRAFT_GENERATION_FAILED',
      error: 'OpenAI request failed',
      details: e.message || String(e),
    };
  }
  if (!rawText || !String(rawText).trim()) {
    return { ok: false, statusCode: 502, code: 'DRAFT_GENERATION_FAILED', error: 'Empty response from model' };
  }

  const parsed = parseAndValidateDraftModelText(rawText);
  if (!parsed.ok) {
    return {
      ok: false,
      statusCode: 502,
      code: 'DRAFT_GENERATION_FAILED',
      error: 'Model returned invalid draft JSON',
      errors: parsed.errors,
    };
  }

  let draftBody = composeDraftBody(parsed.value.body, parsed.value.follow_up_body);
  const publicBase = getLeadEnginePublicSiteUrl().replace(/\/+$/, '');
  const pathUrl = lead.demo_slug ? `/demo/${String(lead.demo_slug).trim()}` : '';
  if (pathUrl) {
    const absoluteUrl = publicBase ? `${publicBase}${pathUrl}` : pathUrl;
    if (!String(draftBody).includes(pathUrl)) {
      draftBody += buildOutreachDemoFooter(pathUrl, absoluteUrl);
    }
  }
  const nowIso = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from('lead_engine_outreach')
    .insert({
      lead_id: leadId,
      channel,
      draft_subject: parsed.value.subject,
      draft_body: draftBody,
      status: 'draft',
      updated_at: nowIso,
    })
    .select('id, status, created_at')
    .single();
  if (insErr) return { ok: false, statusCode: 500, code: 'DRAFT_SAVE_FAILED', error: 'Failed to save draft' };

  await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    outreach_id: inserted.id,
    analysis_id: analysisRow.id,
    ai_score_id: aiScoreRow.id,
    event_type: EVENT_TYPES.DRAFT_GENERATED,
    actor: actor || null,
    message: 'Draft generated',
    metadata_json: { channel: channel || 'email' },
  });

  await supabase
    .from('lead_engine_leads')
    .update({
      first_email_subject: parsed.value.subject,
      first_email_draft: draftBody,
      linkedin_dm_draft: parsed.value.linkedin_dm_draft || null,
      updated_at: nowIso,
    })
    .eq('id', leadId);

  return {
    ok: true,
    statusCode: 200,
    value: {
      success: true,
      leadId,
      outreachId: inserted.id,
      status: inserted.status,
      draft: {
        subject: parsed.value.subject,
        body: draftBody,
        has_follow_up: !!parsed.value.follow_up_body,
        linkedin_dm_draft: parsed.value.linkedin_dm_draft || null,
      },
    },
  };
}

module.exports = { runDraftForLead };

