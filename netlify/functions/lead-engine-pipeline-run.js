/**
 * Operator-only: run analyze → score → draft for one lead (for n8n or internal automation).
 * Does not send email.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateAnalyzeBody } = require('./lib/lead-engine-analyze-validate');
const { isLeadEngineOpenAiAllowed } = require('./lib/lead-engine-config');
const { runAnalyzeForLead } = require('./lib/lead-engine-analyze-run');
const { runScoreForLead } = require('./lib/lead-engine-score-run');
const { runDraftForLead } = require('./lib/lead-engine-draft-run');
const { envVarFromB64 } = require('./lib/runtime-process-env');

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const validated = validateAnalyzeBody(body);
  if (!validated.ok) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }) };
  }

  const { leadId } = validated.value;
  const actor = g.session.username;

  const analyzeOut = await runAnalyzeForLead(supabase, leadId, actor);
  if (!analyzeOut.ok) {
    return {
      statusCode: analyzeOut.statusCode || 500,
      headers,
      body: JSON.stringify({ error: analyzeOut.error, code: analyzeOut.code }),
    };
  }

  if (!isLeadEngineOpenAiAllowed() || !envVarFromB64('T1BFTkFJX0FQSV9LRVk=')) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analyze: analyzeOut.value,
        score: null,
        draft: null,
        skipped: 'openai_disabled',
        message: 'Analyze completed; score/draft skipped (LEAD_ENGINE_ALLOW_OPENAI / OPENAI_API_KEY).',
      }),
    };
  }

  const scoreOut = await runScoreForLead(supabase, leadId, actor);
  if (!scoreOut.ok) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analyze: analyzeOut.value,
        score: { ok: false, statusCode: scoreOut.statusCode, code: scoreOut.code, error: scoreOut.error },
        draft: null,
      }),
    };
  }

  const draftOut = await runDraftForLead(supabase, leadId, 'email', actor);
  if (!draftOut.ok) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analyze: analyzeOut.value,
        score: scoreOut.value,
        draft: { ok: false, statusCode: draftOut.statusCode, code: draftOut.code, error: draftOut.error },
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      analyze: analyzeOut.value,
      score: scoreOut.value,
      draft: draftOut.value,
    }),
  };
};
