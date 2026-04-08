/**
 * Operator outcome events (closed-loop) on lead_engine_events.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const { resolveSourceContextForLead } = require('./lib/lead-engine-lead-quality-feedback');
const { LEAD_OUTCOME_EVENT, OUTCOME_CODES, isValidOutcomeCode } = require('./lib/lead-engine-outcome-events');

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
  const outcome_code = body.outcome_code && String(body.outcome_code).trim();
  if (!leadId || !outcome_code) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'leadId and outcome_code required' }) };
  }
  if (!isValidOutcomeCode(outcome_code)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid outcome_code', allowed: OUTCOME_CODES }) };
  }

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
  const actor = g.session && g.session.username ? `operator:${g.session.username}` : 'operator:unknown';
  const metadata = {
    outcome_code,
    version: 1,
    capture_kind: 'operator_manual',
    context: body.context ? String(body.context).slice(0, 64) : 'operator_manual',
    lead_source: src.lead_source || (leadRow.source ? String(leadRow.source) : null),
    scout_query_id: src.scout_query_id || null,
    source_place_id: src.source_place_id || (leadRow.source_place_id ? String(leadRow.source_place_id) : null),
    note: body.note ? String(body.note).slice(0, 250) : null,
    company_name_snapshot: leadRow.company_name ? String(leadRow.company_name).slice(0, 200) : null,
  };

  const logged = await logLeadEngineEvent(supabase, {
    lead_id: leadId,
    event_type: LEAD_OUTCOME_EVENT,
    actor,
    message: outcome_code,
    metadata_json: metadata,
  });
  if (!logged.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: logged.error && logged.error.message }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, lead_id: leadId, outcome_code, metadata }),
  };
};
