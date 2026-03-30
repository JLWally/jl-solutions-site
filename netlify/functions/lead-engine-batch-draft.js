const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { isLeadEngineOpenAiAllowed } = require('./lib/lead-engine-config');
const { summarizeBatchOutcomes } = require('./lib/lead-engine-batch-result');
const { validateBatchDraftBody } = require('./lib/lead-engine-batch-draft-validate');
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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  const v = validateBatchDraftBody(body);
  if (!v.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: v.errors, code: v.code }),
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

  const openAiEnabled = isLeadEngineOpenAiAllowed() && !!envVarFromB64('T1BFTkFJX0FQSV9LRVk=');
  const results = [];
  if (!openAiEnabled) {
    for (const leadId of v.value.leadIds) {
      results.push({
        leadId,
        outcome: 'skipped',
        code: 'OPENAI_DISABLED',
        message: 'AI drafting is disabled or OPENAI_API_KEY is missing.',
      });
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, summary: summarizeBatchOutcomes(results), results }),
    };
  }

  for (const leadId of v.value.leadIds) {
    try {
      const out = await runDraftForLead(supabase, leadId, v.value.channel, g.session.username);
      if (!out.ok) {
        const outcome = out.statusCode && out.statusCode < 500 ? 'skipped' : 'failed';
        results.push({
          leadId,
          outcome,
          code: out.code || 'DRAFT_GENERATION_FAILED',
          message: out.error || 'Draft generation failed',
        });
      } else {
        results.push({
          leadId,
          outcome: 'succeeded',
          code: 'DRAFT_SUCCESS',
          outreachId: out.value.outreachId,
        });
      }
    } catch (e) {
      results.push({
        leadId,
        outcome: 'failed',
        code: 'DRAFT_GENERATION_FAILED',
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

