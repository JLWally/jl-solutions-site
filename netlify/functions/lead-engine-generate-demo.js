/**
 * Create or update smart intake demo for a lead (Netlify Blobs + optional Supabase).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { validateAnalyzeBody } = require('./lib/lead-engine-analyze-validate');
const { runLeadEngineDemoGenerate } = require('./lib/lead-engine-demo-generate');

function failBody(payload) {
  return JSON.stringify({ ok: false, ...payload });
}

function normalizeGuardResponse(res) {
  const { statusCode, headers, body } = res;
  try {
    const o = JSON.parse(body);
    let code = o.code;
    if (!code) {
      if (statusCode === 401) code = 'UNAUTHORIZED';
      else if (statusCode === 403) code = 'LEAD_ENGINE_DISABLED';
      else if (statusCode === 503) code = 'LEAD_ENGINE_AUTH_NOT_CONFIGURED';
    }
    return {
      statusCode,
      headers,
      body: failBody({
        error: o.error || 'Request failed',
        ...(code ? { code } : {}),
        ...(o.details ? { details: o.details } : {}),
      }),
    };
  } catch {
    return res;
  }
}

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: failBody({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      };
    }

    const g = guardLeadEngineRequest(event, { requireAuth: true });
    if (!g.ok) {
      return normalizeGuardResponse(g.response);
    }

    const supabase = getLeadEngineSupabase();
    if (!supabase) {
      console.error('[lead-engine-generate-demo] supabase_missing', {
        hasUrl: !!(process.env.SUPABASE_URL && String(process.env.SUPABASE_URL).trim()),
        hasServiceKey: !!(
          process.env.SUPABASE_SERVICE_ROLE_KEY && String(process.env.SUPABASE_SERVICE_ROLE_KEY).trim()
        ),
      });
      return {
        statusCode: 503,
        headers,
        body: failBody({
          error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
          code: 'SUPABASE_NOT_CONFIGURED',
          details:
            'Lead lookup and demo_slug updates require Supabase. Demo payload can fall back to jl_demo_configs when Blobs are missing, but this function still needs Supabase for leads.',
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
        body: failBody({ error: 'Invalid JSON body', code: 'INVALID_JSON' }),
      };
    }

    const validated = validateAnalyzeBody(body);
    if (!validated.ok) {
      return {
        statusCode: 400,
        headers,
        body: failBody({
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: validated.errors.join('; '),
        }),
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
        body: failBody({
          error: out.error || 'Request failed',
          ...(out.code ? { code: out.code } : {}),
          ...(out.details ? { details: out.details } : {}),
        }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(out.value) };
  } catch (e) {
    const name = e && e.name ? e.name : 'Error';
    const msg = e && e.message ? String(e.message).slice(0, 400) : 'unknown';
    console.error('[lead-engine-generate-demo] unhandled', name, msg);
    return {
      statusCode: 500,
      headers,
      body: failBody({
        error: 'Internal server error',
        code: 'INTERNAL',
        details: 'An unexpected error occurred. Check function logs for the error name (no stack is returned to clients).',
      }),
    };
  }
};
