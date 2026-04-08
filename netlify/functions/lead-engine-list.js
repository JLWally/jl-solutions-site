/**
 * List leads (Slice B). Supabase service role only.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { parseListQueryParams } = require('./lib/lead-engine-list-params');
const { buildCompactSummary } = require('./lib/lead-engine-audit-signals');
const {
  resolveScoringPayloadWithLegacyCompat,
} = require('./lib/lead-engine-analysis-pick');
const {
  buildPreferredAnalysisByLead,
  buildLatestAiScoreByAnalysis,
  pickLatestAiScoreForPreferredAnalysis,
} = require('./lib/lead-engine-canonical-select');
const { buildOutreachSummaryByLead } = require('./lib/lead-engine-outreach-classify');
const {
  buildSearchOrFilter,
  matchesSliceGRowFilters,
  resolvePreFilteredLeadIds,
  fetchLeadsByIdsChained,
} = require('./lib/lead-engine-list-filters');
const {
  summarizeLeadRowsCore,
  buildPipelineCountsForLeads,
  buildSummaryStandardPath,
  summarizeDemoOutreachQueueFromRows,
} = require('./lib/lead-engine-list-summary');
const { describeApprovedSendRecovery } = require('./lib/lead-engine-send-recovery');
const { fetchSuppressionLookupForLeads, isLeadGloballySuppressed } = require('./lib/lead-engine-global-suppression');
const { fetchLatestFeedbackByLeadIds } = require('./lib/lead-engine-lead-quality-feedback');
const {
  supabaseErrorPayload,
  isMissingLeadEngineDemoColumnError,
} = require('./lib/lead-engine-supabase-error');

/** Works on older DBs before demo migrations; list falls back to this if demo columns are missing. */
const COMPACT_SELECT_BASE =
  'id, company_name, website_url, contact_email, email_opted_out, status, source, created_at, created_by, external_crm_id, crm_source, sync_status, last_synced_at, sync_error';

const COMPACT_SELECT = `${COMPACT_SELECT_BASE}, demo_slug, demo_outreach_status, demo_outreach_status_at, demo_followup_due_at, demo_last_contacted_at`;

function patchLeadDemoFields(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    demo_slug: row.demo_slug ?? null,
    demo_outreach_status: row.demo_outreach_status ?? null,
    demo_outreach_status_at: row.demo_outreach_status_at ?? null,
    demo_followup_due_at: row.demo_followup_due_at ?? null,
    demo_last_contacted_at: row.demo_last_contacted_at ?? null,
  };
}

async function fetchLeadsByIdsWithDemoFallback(supabase, ids) {
  const full = await fetchLeadsByIdsChained(supabase, ids, COMPACT_SELECT);
  if (!full.error) return full;
  if (!isMissingLeadEngineDemoColumnError(full.error)) return full;
  console.warn(
    '[lead-engine-list] demo columns missing on lead_engine_leads; using base select. Apply supabase/migrations/20260402140000_* through 20260403100000_* (or schema.sql).',
    full.error.message || full.error
  );
  const leg = await fetchLeadsByIdsChained(supabase, ids, COMPACT_SELECT_BASE);
  if (leg.error) return leg;
  return { data: (leg.data || []).map(patchLeadDemoFields), error: null };
}

function emptyDemoQueue() {
  return {
    demoFollowupDueToday: 0,
    demoFollowupOverdue: 0,
    demoOutreachSendFailed: 0,
    demoOutreachReplied: 0,
    demoOutreachInterested: 0,
  };
}

function emptySummary() {
  return {
    totalMatching: 0,
    byLeadStatus: { new: 0, analyzed: 0, review: 0, archived: 0 },
    flags: { optedOut: 0, globallySuppressed: 0, missingContactEmail: 0 },
    pipeline: null,
    pipelineNote: null,
    demoQueue: emptyDemoQueue(),
  };
}

exports.handler = async (event) => {
  const headers = withCors('GET, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) {
    return g.response;
  }

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      }),
    };
  }

  const parsed = parseListQueryParams(event.queryStringParameters);
  if (!parsed.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid query', errors: parsed.errors }),
    };
  }

  const {
    page,
    pageSize,
    status,
    search,
    rangeFrom,
    rangeTo,
    optedOut,
    suppressed,
    outreachStatus,
    recommendedOffer,
    reviewQueue,
    needsAttentionSend,
    demoOutreachStatus,
    demoFollowupDue,
    demoRecentSentDays,
    demoQueuePreset,
    includeSummary,
  } = parsed.value;

  const qsRaw = event.queryStringParameters || {};
  const includeLatestAnalysis = ['1', 'true', 'yes'].includes(
    String(qsRaw.includeLatestAnalysis || '').trim().toLowerCase()
  );
  const includeLatestOutreach = ['1', 'true', 'yes'].includes(
    String(qsRaw.includeLatestOutreach || '').trim().toLowerCase()
  );

  const sliceGRow = { status, search, optedOut };

  const pre = await resolvePreFilteredLeadIds(supabase, {
    outreachStatus,
    recommendedOffer,
    needsAttentionSend,
    suppressed,
    reviewQueue,
    demoOutreachStatus,
    demoFollowupDue,
    demoRecentSentDays,
    demoQueuePreset,
  });
  if (!pre.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: pre.error }),
    };
  }

  let outLeads = [];
  let total = 0;
  let summaryPayload = undefined;

  if (pre.ids != null) {
    const idList = [...pre.ids];
    if (idList.length === 0) {
      outLeads = [];
      total = 0;
      if (includeSummary) summaryPayload = emptySummary();
    } else {
      const { data: batchRows, error: batchErr } = await fetchLeadsByIdsWithDemoFallback(
        supabase,
        idList
      );
      if (batchErr) {
        console.error('[lead-engine-list] batch by ids', batchErr);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify(supabaseErrorPayload(batchErr, 'Failed to list leads')),
        };
      }
      const filtered = (batchRows || []).filter((r) => matchesSliceGRowFilters(r, sliceGRow));
      filtered.sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return tb - ta;
      });
      total = filtered.length;
      outLeads = filtered.slice(rangeFrom, rangeTo + 1);

      if (includeSummary) {
        const core = summarizeLeadRowsCore(filtered);
        const suppressionLookup = await fetchSuppressionLookupForLeads(supabase, filtered);
        const globallySuppressedCount = filtered.reduce(
          (n, l) => n + (isLeadGloballySuppressed(l, suppressionLookup) ? 1 : 0),
          0
        );
        let pipeline = null;
        try {
          pipeline = await buildPipelineCountsForLeads(
            supabase,
            filtered.map((r) => r.id)
          );
        } catch (e) {
          console.error('[lead-engine-list] pipeline summary', e);
        }
        summaryPayload = {
          totalMatching: total,
          byLeadStatus: core.byLeadStatus,
          flags: {
            optedOut: core.optedOut,
            missingContactEmail: core.missingContactEmail,
            globallySuppressed: globallySuppressedCount,
          },
          pipeline,
          pipelineNote: null,
          demoQueue: summarizeDemoOutreachQueueFromRows(filtered),
        };
      }
    }
  } else {
    const buildFilteredListQuery = (selectCols) => {
      let q = supabase
        .from('lead_engine_leads')
        .select(selectCols, { count: 'exact' })
        .order('created_at', { ascending: false });
      if (status) {
        q = q.eq('status', status);
      }
      if (search) {
        q = q.or(buildSearchOrFilter(search));
      }
      if (optedOut === true) {
        q = q.eq('email_opted_out', true);
      }
      if (optedOut === false) {
        q = q.eq('email_opted_out', false);
      }
      return q.range(rangeFrom, rangeTo);
    };

    let { data: leads, error, count } = await buildFilteredListQuery(COMPACT_SELECT);

    if (error && isMissingLeadEngineDemoColumnError(error)) {
      console.warn(
        '[lead-engine-list] demo columns missing; retrying list with base select. Apply demo migrations in supabase/migrations/.',
        error.message || error
      );
      const retry = await buildFilteredListQuery(COMPACT_SELECT_BASE);
      leads = retry.data;
      error = retry.error;
      count = retry.count;
      if (!error && leads) {
        leads = leads.map(patchLeadDemoFields);
      }
    }

    if (error) {
      console.error('[lead-engine-list]', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(supabaseErrorPayload(error, 'Failed to list leads')),
      };
    }

    total = count == null ? (leads || []).length : count;
    outLeads = leads || [];

    if (includeSummary) {
      try {
        summaryPayload = await buildSummaryStandardPath(supabase, {
          status,
          search,
          optedOut,
          suppressed,
          total,
        });
      } catch (e) {
        console.error('[lead-engine-list] summary', e);
        summaryPayload = { ...emptySummary(), totalMatching: total };
      }
    }
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  if (includeLatestAnalysis && outLeads.length > 0) {
    const ids = outLeads.map((l) => l.id);
    const { data: analysisRows, error: aErr } = await supabase
      .from('lead_engine_analysis')
      .select(
        'id, lead_id, fetched_at, signals, scores, recommended_offer, model_version, created_at'
      )
      .in('lead_id', ids);

    if (aErr) {
      console.error('[lead-engine-list] latest analysis', aErr);
    } else {
      const preferredByLead = buildPreferredAnalysisByLead(analysisRows || []);

      const preferredAnalysisIds = [...preferredByLead.values()]
        .filter(Boolean)
        .map((r) => r.id);

      let latestAiByAnalysis = new Map();
      if (preferredAnalysisIds.length > 0) {
        const { data: aiRows, error: aiErr } = await supabase
          .from('lead_engine_ai_scores')
          .select('id, analysis_id, scores, recommended_offer, model_version, created_at')
          .in('analysis_id', preferredAnalysisIds)
          .order('created_at', { ascending: false });

        if (aiErr) {
          console.error('[lead-engine-list] ai_scores', aiErr);
        } else {
          latestAiByAnalysis = buildLatestAiScoreByAnalysis(aiRows || []);
        }
      }

      outLeads = outLeads.map((l) => {
        const row = preferredByLead.get(l.id);
        const aiRow = pickLatestAiScoreForPreferredAnalysis(row, latestAiByAnalysis);
        const scoring = resolveScoringPayloadWithLegacyCompat(row, aiRow);
        return {
          ...l,
          latest_analysis: row
            ? {
                id: row.id,
                fetched_at: row.fetched_at,
                created_at: row.created_at,
                summary: buildCompactSummary(row.signals),
                scoring,
              }
            : null,
        };
      });
    }
  }

  if (includeLatestOutreach && outLeads.length > 0) {
    const leadIds = outLeads.map((l) => l.id);
    const { data: outreachRows, error: oErr } = await supabase
      .from('lead_engine_outreach')
      .select(
        'id, lead_id, draft_subject, draft_body, status, created_at, approved_by, sent_at, send_started_at'
      )
      .in('lead_id', leadIds)
      .eq('channel', 'email')
      .order('created_at', { ascending: false });

    if (oErr) {
      console.error('[lead-engine-list] outreach', oErr);
    } else {
      const summaryByLead = buildOutreachSummaryByLead(leadIds, outreachRows || []);
      outLeads = outLeads.map((l) => {
        const sum = summaryByLead.get(l.id);
        const opted = l.email_opted_out === true;
        const apr = sum ? sum.latest_approved : null;
        const send_recovery = describeApprovedSendRecovery(apr);
        return {
          ...l,
          email_opted_out: opted,
          latest_outreach: sum ? sum.latest : null,
          outreach: sum
            ? {
                latest_draft: sum.latest_draft,
                latest_approved: sum.latest_approved,
                latest_sent: sum.latest_sent,
                draft_rows_count: sum.draft_rows_count || 0,
                has_multiple_drafts: sum.has_multiple_drafts === true,
                total_rows_count: sum.total_rows_count || 0,
                send_recovery,
              }
            : {
                latest_draft: null,
                latest_approved: null,
                latest_sent: null,
                draft_rows_count: 0,
                has_multiple_drafts: false,
                total_rows_count: 0,
                send_recovery: null,
              },
        };
      });
    }
  }

  if (outLeads.length > 0) {
    try {
      const leadIdsForFb = outLeads.map((l) => l.id);
      const fbMap = await fetchLatestFeedbackByLeadIds(supabase, leadIdsForFb);
      outLeads = outLeads.map((l) => ({
        ...l,
        latest_quality_feedback: fbMap[l.id] || null,
      }));
    } catch (e) {
      console.error('[lead-engine-list] quality feedback', e);
    }
  }

  if (outLeads.length > 0) {
    try {
      const suppressionLookup = await fetchSuppressionLookupForLeads(supabase, outLeads);
      outLeads = outLeads.map((l) => ({
        ...l,
        global_email_suppressed: isLeadGloballySuppressed(l, suppressionLookup),
      }));
    } catch (e) {
      console.error('[lead-engine-list] global suppression', e);
      outLeads = outLeads.map((l) => ({ ...l, global_email_suppressed: false }));
    }
  }

  const body = {
    leads: outLeads,
    total,
    page,
    pageSize,
    totalPages,
  };
  if (includeSummary) {
    body.summary = summaryPayload != null ? summaryPayload : emptySummary();
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(body),
  };
};
