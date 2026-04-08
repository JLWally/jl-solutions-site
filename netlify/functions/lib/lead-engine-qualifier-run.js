'use strict';

const { loadIcpConfig, evaluateProspectAgainstIcp } = require('./lead-engine-qualifier-icp');
const { loadAutomationPolicy } = require('./lead-engine-automation-policy');

function qualifierBatchLimit(policy) {
  const b = policy && policy.budgets && policy.budgets.qualifier_max_prospects_per_tick;
  const p = policy && policy.pipeline && policy.pipeline.max_prospects_qualify_per_tick;
  const fromB = b != null && Number.isFinite(Number(b)) ? Number(b) : null;
  const fromP = p != null && Number.isFinite(Number(p)) ? Number(p) : 200;
  const cap = fromB != null ? Math.min(fromB, fromP) : fromP;
  return Math.min(500, Math.max(1, cap));
}
const { appendWorkerEvent } = require('./lead-engine-worker-runtime');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lead-engine-audit-log');

const ACTOR = 'automation';

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} ctx
 * @param {string} ctx.correlationId
 * @param {string} ctx.runId
 */
async function runQualifierIcpPass({ supabase, correlationId, runId }) {
  const icp = loadIcpConfig();
  const policy = loadAutomationPolicy();
  const limit = qualifierBatchLimit(policy);

  const { data: rawRows, error } = await supabase
    .from('lead_engine_prospects')
    .select('id, source_key, external_key, company_name, website_url, status, raw_payload')
    .eq('status', 'raw')
    .not('website_url', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  let passed = 0;
  let blocked = 0;
  let promoted = 0;
  const blockReasons = {};

  for (const p of rawRows || []) {
    const evalOut = evaluateProspectAgainstIcp(
      {
        company_name: p.company_name,
        website_url: p.website_url,
        source_key: p.source_key,
        raw_payload: p.raw_payload,
      },
      icp
    );

    if (!evalOut.pass) {
      blocked += 1;
      blockReasons[evalOut.blockReason || 'unknown'] =
        (blockReasons[evalOut.blockReason || 'unknown'] || 0) + 1;
      await supabase
        .from('lead_engine_prospects')
        .update({
          status: 'blocked',
          icp_tier: null,
          icp_block_reason: evalOut.blockReason,
          icp_rule_hits: evalOut.ruleHits,
          icp_rules_version: evalOut.version,
          qualify_run_id: runId,
          automation_correlation_id: correlationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id);
      continue;
    }

    passed += 1;
    const qualifyPatch = {
      icp_tier: evalOut.tier,
      icp_block_reason: null,
      icp_rule_hits: evalOut.ruleHits,
      icp_rules_version: evalOut.version,
      qualify_run_id: runId,
      automation_correlation_id: correlationId,
      updated_at: new Date().toISOString(),
    };

    const idempotencyKey = `scout_promote:${p.source_key}:${p.external_key}`;
    const { data: existingLead } = await supabase
      .from('lead_engine_leads')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingLead) {
      await supabase
        .from('lead_engine_prospects')
        .update({
          ...qualifyPatch,
          status: 'promoted',
          promoted_lead_id: existingLead.id,
        })
        .eq('id', p.id);
      continue;
    }

    const sn =
      p.raw_payload && typeof p.raw_payload === 'object' && p.raw_payload.scout_normalized
        ? p.raw_payload.scout_normalized
        : null;
    const placeId = sn && sn.place_id ? String(sn.place_id).trim() : '';

    const insertRow = {
      company_name: p.company_name,
      website_url: p.website_url,
      source: p.source_key,
      status: 'new',
      created_by: ACTOR,
      idempotency_key: idempotencyKey,
      automation_pipeline_status: 'pending',
      automation_correlation_id: correlationId,
      source_place_id: placeId || null,
    };

    const { data: created, error: insErr } = await supabase
      .from('lead_engine_leads')
      .insert(insertRow)
      .select('id')
      .single();

    if (insErr) {
      if (insErr.code === '23505') {
        const { data: raceLead } = await supabase
          .from('lead_engine_leads')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();
        if (raceLead) {
          await supabase
            .from('lead_engine_prospects')
            .update({
              ...qualifyPatch,
              status: 'promoted',
              promoted_lead_id: raceLead.id,
            })
            .eq('id', p.id);
        }
        continue;
      }
      throw new Error(insErr.message);
    }

    promoted += 1;
    await supabase
      .from('lead_engine_prospects')
      .update({
        ...qualifyPatch,
        status: 'promoted',
        promoted_lead_id: created.id,
      })
      .eq('id', p.id);

    await logLeadEngineEvent(supabase, {
      lead_id: created.id,
      event_type: EVENT_TYPES.AUTOMATION_LEAD_PROMOTED,
      actor: ACTOR,
      message: 'Prospect promoted from Scout → Qualifier into lead pipeline (pending automation)',
      metadata_json: {
        prospect_id: p.id,
        source_key: p.source_key,
        external_key: p.external_key,
        icp_tier: evalOut.tier,
        icp_rules_version: evalOut.version,
        correlation_id: correlationId,
      },
    });
  }

  await appendWorkerEvent(supabase, {
    runId,
    correlationId,
    level: 'info',
    eventType: 'qualifier_summary',
    message: 'ICP evaluation pass complete',
    payload: {
      icp_version: icp.version,
      examined: (rawRows || []).length,
      passed,
      blocked,
      promoted,
      block_reasons: blockReasons,
    },
  });

  return {
    icp_version: icp.version,
    examined: (rawRows || []).length,
    passed,
    blocked,
    promoted,
    block_reasons: blockReasons,
  };
}

module.exports = {
  runQualifierIcpPass,
};
