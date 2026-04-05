/**
 * Create or update smart intake demo for a lead (Netlify Blobs + optional Supabase).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateAnalyzeBody } = require('./lib/lead-engine-analyze-validate');
const { runLeadEngineDemoGenerate } = require('./lib/lead-engine-demo-generate');

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

  const validated = validateAnalyzeBody(body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const out = await runLeadEngineDemoGenerate({
    supabase,
    leadId: validated.value.leadId,
    event,
    actor: g.session.username,
  });

  if (!out.ok) {
    return {
      statusCode: out.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: out.error,
        code: out.code,
      }),
    };
  }

  return { statusCode: 200, headers, body: JSON.stringify(out.value) };
};
