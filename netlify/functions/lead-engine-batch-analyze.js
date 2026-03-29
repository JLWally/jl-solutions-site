const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateBatchLeadIdsBody } = require('./lib/lead-engine-batch-validate');
const { summarizeBatchOutcomes } = require('./lib/lead-engine-batch-result');
const { runAnalyzeForLead } = require('./lib/lead-engine-analyze-run');

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
  const v = validateBatchLeadIdsBody(body);
  if (!v.ok) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Validation failed', errors: v.errors, code: v.code }) };
  }

  const results = [];
  for (const leadId of v.value.leadIds) {
    try {
      const out = await runAnalyzeForLead(supabase, leadId, g.session.username);
      if (!out.ok) {
        results.push({
          leadId,
          outcome: out.statusCode && out.statusCode < 500 ? 'skipped' : 'failed',
          code: out.code || 'ANALYZE_FAILED',
          message: out.error || 'Analyze failed',
        });
      } else {
        results.push({
          leadId,
          outcome: 'succeeded',
          code: out.value.success ? 'ANALYZE_SUCCESS' : 'ANALYZE_RECORDED_FAILURE',
          analysisId: out.value.analysisId,
          success: out.value.success === true,
        });
      }
    } catch (e) {
      results.push({
        leadId,
        outcome: 'failed',
        code: 'ANALYZE_EXCEPTION',
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

