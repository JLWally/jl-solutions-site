/**
 * AI outreach draft generation (Slice E). No send. Requires successful audit + lead_engine_ai_scores row.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { isLeadEngineOpenAiAllowed } = require('./lib/lead-engine-config');
const { validateDraftBody } = require('./lib/lead-engine-draft-validate');
const { runDraftForLead } = require('./lib/lead-engine-draft-run');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
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

  if (!isLeadEngineOpenAiAllowed()) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error:
          'AI drafting is disabled. Set LEAD_ENGINE_ALLOW_OPENAI to true (e.g. in Netlify environment variables).',
      }),
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'OpenAI is not configured. Set OPENAI_API_KEY for draft generation.',
      }),
    };
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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const validated = validateDraftBody(body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const { leadId, channel } = validated.value;

  const out = await runDraftForLead(supabase, leadId, channel, g.session.username);
  if (!out.ok) {
    if ((out.statusCode || 500) >= 500) {
      await logLeadEngineEvent(supabase, {
        lead_id: leadId,
        event_type: EVENT_TYPES.DRAFT_FAILED,
        actor: g.session.username || null,
        message: out.error || 'Draft failed',
        metadata_json: { code: out.code || null },
      });
    }
    return {
      statusCode: out.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: out.error,
        code: out.code,
        details: out.details,
        errors: out.errors,
      }),
    };
  }
  return { statusCode: out.statusCode || 200, headers, body: JSON.stringify(out.value) };
};
