'use strict';

const { LEAD_QUALITY_FEEDBACK_EVENT } = require('./lead-engine-lead-quality-feedback');
const { LEAD_OUTCOME_EVENT, isNativePipelineOutcomeMeta } = require('./lead-engine-outcome-events');

const SCOUT_WORKERS = ['scout_google_places', 'scout_mvp_json'];
const EVENT_DRAFT = 'draft_generated';

function sinceIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function emptyBuckets() {
  return { hours_24: {}, hours_168: {} };
}

function countMapIncrement(m, key, n) {
  const k = key || '_unknown';
  m[k] = (m[k] || 0) + (n != null ? n : 1);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function buildValidationReport(supabase) {
  const since24 = sinceIso(24);
  const since7d = sinceIso(24 * 7);

  const [
    prospects24,
    prospects7d,
    leadsAuto24,
    leadsAuto7d,
    blocked24,
    blocked7d,
    branchSnap,
    branchNew24Parts,
    branchNew7dParts,
    drafts24,
    drafts7d,
    hot24,
    hot7d,
    scoutRuns24,
    scoutRuns7d,
    feedback24,
    feedback7d,
    outcomes24,
    outcomes7d,
  ] = await Promise.all([
    supabase.from('lead_engine_prospects').select('id', { count: 'exact', head: true }).gte('created_at', since24),
    supabase.from('lead_engine_prospects').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    supabase
      .from('lead_engine_leads')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', 'automation')
      .gte('created_at', since24),
    supabase
      .from('lead_engine_leads')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', 'automation')
      .gte('created_at', since7d),
    supabase
      .from('lead_engine_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'blocked')
      .gte('updated_at', since24),
    supabase
      .from('lead_engine_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'blocked')
      .gte('updated_at', since7d),
    Promise.all([
      supabase.from('lead_engine_prospects').select('id', { count: 'exact', head: true }).eq('status', 'no_website'),
      supabase.from('lead_engine_prospects').select('id', { count: 'exact', head: true }).eq('status', 'weak_web_presence'),
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'alternate_enrichment_needed'),
    ]),
    Promise.all([
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'no_website')
        .gte('created_at', since24),
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'weak_web_presence')
        .gte('created_at', since24),
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'alternate_enrichment_needed')
        .gte('created_at', since24),
    ]),
    Promise.all([
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'no_website')
        .gte('created_at', since7d),
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'weak_web_presence')
        .gte('created_at', since7d),
      supabase
        .from('lead_engine_prospects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'alternate_enrichment_needed')
        .gte('created_at', since7d),
    ]),
    supabase.from('lead_engine_events').select('id', { count: 'exact', head: true }).eq('event_type', EVENT_DRAFT).gte('created_at', since24),
    supabase.from('lead_engine_events').select('id', { count: 'exact', head: true }).eq('event_type', EVENT_DRAFT).gte('created_at', since7d),
    supabase
      .from('lead_engine_leads')
      .select('id', { count: 'exact', head: true })
      .gte('lead_score', 70)
      .gte('updated_at', since24),
    supabase
      .from('lead_engine_leads')
      .select('id', { count: 'exact', head: true })
      .gte('lead_score', 70)
      .gte('updated_at', since7d),
    supabase
      .from('lead_engine_worker_runs')
      .select('id, result_summary, finished_at, status, worker_name, error_message')
      .in('worker_name', SCOUT_WORKERS)
      .gte('finished_at', since24)
      .order('finished_at', { ascending: false })
      .limit(400),
    supabase
      .from('lead_engine_worker_runs')
      .select('id, result_summary, finished_at, status, worker_name, error_message')
      .in('worker_name', SCOUT_WORKERS)
      .gte('finished_at', since7d)
      .order('finished_at', { ascending: false })
      .limit(800),
    supabase
      .from('lead_engine_events')
      .select('metadata_json, created_at')
      .eq('event_type', LEAD_QUALITY_FEEDBACK_EVENT)
      .gte('created_at', since24)
      .limit(2000),
    supabase
      .from('lead_engine_events')
      .select('metadata_json, created_at')
      .eq('event_type', LEAD_QUALITY_FEEDBACK_EVENT)
      .gte('created_at', since7d)
      .limit(5000),
    supabase
      .from('lead_engine_events')
      .select('metadata_json, lead_id, created_at')
      .eq('event_type', LEAD_OUTCOME_EVENT)
      .gte('created_at', since24)
      .limit(3000),
    supabase
      .from('lead_engine_events')
      .select('metadata_json, lead_id, created_at')
      .eq('event_type', LEAD_OUTCOME_EVENT)
      .gte('created_at', since7d)
      .limit(8000),
  ]);

  const branchSnapshot = {
    no_website: safeCount(branchSnap[0]),
    weak_web_presence: safeCount(branchSnap[1]),
    alternate_enrichment_needed: safeCount(branchSnap[2]),
  };

  function safeCount(r) {
    if (!r || r.error) return 0;
    return r.count || 0;
  }

  function aggregateScoutRuns(runResult) {
    const dupByQuery = {};
    const dupWeight = {};
    const zeroYieldRuns = [];
    const queriesTouched = new Set();
    let successInWindow = 0;
    let failedInWindow = 0;

    const rows = (runResult && runResult.data) || [];
    for (const row of rows) {
      if (row.status === 'succeeded') successInWindow += 1;
      else if (row.status === 'failed' || row.status === 'dead_letter') failedInWindow += 1;

      const rs = row.result_summary;
      const summary = typeof rs === 'string' ? safeJson(rs) : rs;
      if (!summary || typeof summary !== 'object') continue;

      const qid = summary.query_id != null ? String(summary.query_id) : null;
      if (qid) queriesTouched.add(qid);

      const dup = summary.duplicate_ratio;
      if (qid && dup != null && Number.isFinite(Number(dup))) {
        const d = Number(dup);
        dupByQuery[qid] = (dupByQuery[qid] || 0) + d;
        dupWeight[qid] = (dupWeight[qid] || 0) + 1;
      }

      const attempted = Number(summary.details_attempted) || 0;
      const insR = Number(summary.inserted_raw) || 0;
      const insB = Number(summary.inserted_branch) || 0;
      if (attempted > 0 && insR === 0 && insB === 0 && !summary.skipped) {
        zeroYieldRuns.push({ query_id: qid, finished_at: row.finished_at, worker_name: row.worker_name });
      }
    }

    const duplicate_ratio_by_query = {};
    for (const q of Object.keys(dupByQuery)) {
      const w = dupWeight[q] || 1;
      duplicate_ratio_by_query[q] = Math.round((dupByQuery[q] / w) * 1000) / 1000;
    }

    const zeroYieldByQuery = new Set();
    for (const z of zeroYieldRuns) {
      if (z.query_id) zeroYieldByQuery.add(z.query_id);
    }

    return {
      runs_succeeded: successInWindow,
      runs_failed: failedInWindow,
      duplicate_ratio_by_query,
      scout_runs_zero_yield_count: zeroYieldRuns.length,
      scout_queries_with_any_zero_yield_run: zeroYieldByQuery.size,
      queries_touched_distinct: queriesTouched.size,
    };
  }

  function safeJson(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  const scout24 = aggregateScoutRuns(scoutRuns24);
  const scout7d = aggregateScoutRuns(scoutRuns7d);

  function aggregateFeedback(rows) {
    const byCode = {};
    const hotPanel = { good_lead: 0, bad_lead: 0, other: 0 };
    for (const row of rows || []) {
      const m = row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {};
      const code = m.feedback_code ? String(m.feedback_code) : '_unknown';
      countMapIncrement(byCode, code, 1);
      if (m.context === 'hot_leads_panel') {
        if (code === 'good_lead') hotPanel.good_lead += 1;
        else if (code === 'bad_lead') hotPanel.bad_lead += 1;
        else hotPanel.other += 1;
      }
    }
    return { by_code: byCode, hot_leads_panel: hotPanel };
  }

  const fb24 = (feedback24 && feedback24.data) || [];
  const fb7 = (feedback7d && feedback7d.data) || [];

  function aggregateOutcomes(rows) {
    const native = { total: 0, by_code: {} };
    const manual = { total: 0, by_code: {} };
    const with_query = { native: 0, manual: 0 };
    for (const row of rows || []) {
      const m = row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {};
      const code = m.outcome_code ? String(m.outcome_code) : '_unknown';
      const bag = isNativePipelineOutcomeMeta(m) ? native : manual;
      bag.total += 1;
      bag.by_code[code] = (bag.by_code[code] || 0) + 1;
      if (m.scout_query_id) {
        if (isNativePipelineOutcomeMeta(m)) with_query.native += 1;
        else with_query.manual += 1;
      }
    }
    return { native, manual, attributed_to_query: with_query };
  }

  const oc24 = (outcomes24 && outcomes24.data) || [];
  const oc7 = (outcomes7d && outcomes7d.data) || [];

  return {
    generated_at: new Date().toISOString(),
    windows: { utc_hours_24: 24, utc_hours_7d: 168 },
    prospects_found: {
      hours_24: safeCount(prospects24),
      hours_168: safeCount(prospects7d),
    },
    promoted_leads_automation: {
      hours_24: safeCount(leadsAuto24),
      hours_168: safeCount(leadsAuto7d),
      note: 'Leads with created_by=automation (ICP promotion path)',
    },
    prospects_blocked_touched: {
      hours_24: safeCount(blocked24),
      hours_168: safeCount(blocked7d),
      note: 'Prospects with status blocked and updated_at in window',
    },
    enrichment_branch_snapshot: branchSnapshot,
    prospects_created_into_branch: {
      hours_24: {
        no_website: safeCount(branchNew24Parts && branchNew24Parts[0]),
        weak_web_presence: safeCount(branchNew24Parts && branchNew24Parts[1]),
        alternate_enrichment_needed: safeCount(branchNew24Parts && branchNew24Parts[2]),
      },
      hours_168: {
        no_website: safeCount(branchNew7dParts && branchNew7dParts[0]),
        weak_web_presence: safeCount(branchNew7dParts && branchNew7dParts[1]),
        alternate_enrichment_needed: safeCount(branchNew7dParts && branchNew7dParts[2]),
      },
      note: 'Counts new prospects created in window already in branch statuses',
    },
    drafts_generated: {
      hours_24: safeCount(drafts24),
      hours_168: safeCount(drafts7d),
      event_type: EVENT_DRAFT,
    },
    hot_leads_score_ge_70_touched: {
      hours_24: safeCount(hot24),
      hours_168: safeCount(hot7d),
      note: 'Leads with lead_score >= 70 and updated_at in window',
    },
    scout_source_health: {
      hours_24: scout24,
      hours_168: scout7d,
    },
    operator_feedback: {
      hours_24: aggregateFeedback(fb24),
      hours_168: aggregateFeedback(fb7),
    },
    lead_outcomes: {
      hours_24: aggregateOutcomes(oc24),
      hours_168: aggregateOutcomes(oc7),
      event_type: LEAD_OUTCOME_EVENT,
      note: 'native_pipeline = automated capture (send, unsubscribe, CRM, webhooks); operator_manual = lead-engine-lead-outcome UI/API',
    },
    hot_ranking_review_hint:
      'Compare hot_leads_panel good_lead vs bad_lead counts in operator_feedback; low good/bad ratio suggests tuning rank weights.',
    source_health_summary: {
      hours_24: summarizeScoutHealth(scout24),
      hours_168: summarizeScoutHealth(scout7d),
    },
  };
}

function summarizeScoutHealth(s) {
  if (!s) return '';
  const parts = [
    `succeeded ${s.runs_succeeded}`,
    `failed ${s.runs_failed}`,
    `zero-yield runs ${s.scout_runs_zero_yield_count}`,
    `queries w/ any zero-yield ${s.scout_queries_with_any_zero_yield_run}`,
    `queries touched ${s.queries_touched_distinct}`,
  ];
  return parts.join(' · ');
}

module.exports = { buildValidationReport, sinceIso };
