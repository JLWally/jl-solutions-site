/**
 * Ranked "hot / best today" leads for operator triage (GET, session auth).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { rankHotLeads } = require('./lib/lead-engine-hot-leads-rank');
const { fetchLatestFeedbackByLeadIds } = require('./lib/lead-engine-lead-quality-feedback');

const EVENT_DRAFT = 'draft_generated';

exports.handler = async (event) => {
  const headers = withCors('GET, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Database not configured' }),
    };
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: leads, error: leErr } = await supabase
    .from('lead_engine_leads')
    .select(
      'id, company_name, website_url, lead_score, source, status, demo_slug, email_opted_out, updated_at, created_at, automation_pipeline_status'
    )
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(120);

  if (leErr) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: leErr.message }),
    };
  }

  const ids = (leads || []).map((r) => r.id);
  let draftSet = {};
  if (ids.length) {
    const { data: evs } = await supabase
      .from('lead_engine_events')
      .select('lead_id')
      .eq('event_type', EVENT_DRAFT)
      .in('lead_id', ids)
      .limit(400);
    for (const e of evs || []) {
      if (e.lead_id) draftSet[e.lead_id] = true;
    }
  }

  let promoted = [];
  if (ids.length) {
    const pr = await supabase
      .from('lead_engine_prospects')
      .select('promoted_lead_id, icp_tier')
      .in('promoted_lead_id', ids);
    promoted = pr.data || [];
  }

  const metaByLeadId = {};
  for (const p of promoted) {
    if (!p.promoted_lead_id) continue;
    metaByLeadId[p.promoted_lead_id] = {
      icp_tier: p.icp_tier,
    };
  }

  const ranked = rankHotLeads(leads || [], draftSet, metaByLeadId).slice(0, 40);
  const withRank = ranked.map((L, i) => ({ ...L, hot_rank: i + 1 }));

  const hotIds = withRank.map((L) => L.id);
  const feedbackByLead = await fetchLatestFeedbackByLeadIds(supabase, hotIds);
  const withFeedback = withRank.map((L) => ({
    ...L,
    latest_quality_feedback: feedbackByLead[L.id] || null,
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      generated_at: new Date().toISOString(),
      window: 'updated_at within 7d UTC',
      ranking_note:
        'Weighted blend of fit_score, website, demo, draft event, ICP tier hint, recency; penalties for opt-out / blocked prospect / archived.',
      feedback_endpoint: 'lead-engine-lead-feedback',
      hot_leads_feedback_context: 'hot_leads_panel',
      leads: withFeedback,
    }),
  };
};
