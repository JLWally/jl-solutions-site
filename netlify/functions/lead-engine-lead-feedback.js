/**
 * Operator lead quality feedback → lead_engine_events (structured metadata).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const {
  LEAD_QUALITY_FEEDBACK_EVENT,
  FEEDBACK_CODES,
  isValidFeedbackCode,
  resolveSourceContextForLead,
  buildFeedbackMetadata,
} = require('./lib/lead-engine-lead-quality-feedback');

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const leadId = body.leadId && String(body.leadId).trim();
  const feedback_code = body.feedback_code && String(body.feedback_code).trim();
  if (!leadId || !feedback_code) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'leadId and feedback_code required' }),
    };
  }
  if (!isValidFeedbackCode(feedback_code)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid feedback_code', allowed: FEEDBACK_CODES }),
    };
  }

  const context = body.context != null ? String(body.context).trim().slice(0, 64) : null;
  const hot_rank = body.hot_rank != null ? Number(body.hot_rank) : null;
  const hot_score = body.hot_score != null ? Number(body.hot_score) : null;

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Database not configured' }) };
  }

  const { data: leadRow, error: leadErr } = await supabase
    .from('lead_engine_leads')
    .select('id, company_name, source, source_place_id')
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr || !leadRow) {
    return {
      statusCode: leadErr ? 500 : 404,
      headers,
      body: JSON.stringify({ error: leadErr ? leadErr.message : 'Lead not found' }),
    };
  }

  const src = await resolveSourceContextForLead(supabase, leadId);
  const metadata = buildFeedbackMetadata({
    feedback_code,
    context: context || undefined,
    scout_query_id: src.scout_query_id,
    lead_source: src.lead_source || (leadRow.source ? String(leadRow.source) : null),
    source_place_id:
      src.source_place_id ||
      (leadRow.source_place_id ? String(leadRow.source_place_id).trim() : null),
    hot_rank: Number.isFinite(hot_rank) ? hot_rank : null,
    hot_score: Number.isFinite(hot_score) ? hot_score : null,
    company_name: leadRow.company_name,
  });

  const actor = g.session && g.session.username ? `operator:${g.session.username}` : 'operator:unknown';

  const logged = await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    event_type: LEAD_QUALITY_FEEDBACK_EVENT,
    actor,
    message: feedback_code,
    metadata_json: metadata,
  });

  if (!logged.ok) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: logged.error && logged.error.message }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      lead_id: leadId,
      feedback_code,
      metadata,
    }),
  };
};
