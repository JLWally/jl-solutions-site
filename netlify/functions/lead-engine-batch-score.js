const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { isLeadEngineOpenAiAllowed } = require('./lib/lead-engine-config');
const { validateBatchLeadIdsBody } = require('./lib/lead-engine-batch-validate');
const { summarizeBatchOutcomes } = require('./lib/lead-engine-batch-result');
const { runScoreForLead } = require('./lib/lead-engine-score-run');
const { envVarFromB64 } = require('./lib/runtime-process-env');

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  if (!isLeadEngineOpenAiAllowed()) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: 'AI scoring is disabled. Set LEAD_ENGINE_ALLOW_OPENAI to true (e.g. in Netlify environment variables).',
      }),
    };
  }
  if (!envVarFromB64('T1BFTkFJX0FQSV9LRVk=')) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'OpenAI is not configured. Set OPENAI_API_KEY for scoring.' }),
    };
  }

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
  const v = validateBatchLeadIdsBody(body);
  if (!v.ok) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Validation failed', errors: v.errors, code: v.code }) };
  }

  const results = [];
  for (const leadId of v.value.leadIds) {
    try {
      const out = await runScoreForLead(supabase, leadId, g.session.username);
      if (!out.ok) {
        results.push({
          leadId,
          outcome: out.statusCode && out.statusCode < 500 ? 'skipped' : 'failed',
          code: out.code || 'SCORE_FAILED',
          message: out.error || 'Score failed',
        });
      } else {
        results.push({
          leadId,
          outcome: 'succeeded',
          code: 'SCORE_SUCCESS',
          analysisId: out.value.analysisId,
          aiScoreId: out.value.aiScoreId,
        });
      }
    } catch (e) {
      results.push({
        leadId,
        outcome: 'failed',
        code: 'SCORE_EXCEPTION',
        message: e.message || String(e),
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      summary: summarizeBatchOutcomes(results),
      results,
    }),
  };
};

