/**
 * Operator overrides for guardrails (source/query).
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');

const ALLOWED_SCOPE = ['source', 'query'];
const ALLOWED_STATUS = ['healthy', 'warning', 'throttled', 'paused'];

exports.handler = async (event) => {
  const headers = withCors('GET, PATCH, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;

  const supabase = getLeadEngineSupabase();
  if (!supabase) return { statusCode: 503, headers, body: JSON.stringify({ error: 'Database not configured' }) };

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('lead_engine_guardrail_overrides')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(120);
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, overrides: data || [] }) };
  }

  if (event.httpMethod !== 'PATCH') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const scope_type = body.scope_type ? String(body.scope_type).trim() : '';
  const scope_key = body.scope_key ? String(body.scope_key).trim() : '';
  const forced_status = body.forced_status ? String(body.forced_status).trim() : '';
  if (!ALLOWED_SCOPE.includes(scope_type) || !scope_key) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'scope_type/source_key invalid' }) };
  }
  if (forced_status && !ALLOWED_STATUS.includes(forced_status)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'forced_status invalid', allowed: ALLOWED_STATUS }) };
  }

  if (!forced_status || forced_status === 'auto') {
    const { error } = await supabase
      .from('lead_engine_guardrail_overrides')
      .delete()
      .eq('scope_type', scope_type)
      .eq('scope_key', scope_key);
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, cleared: true }) };
  }

  let expiresAt = null;
  if (body.expires_hours != null) {
    const h = Number(body.expires_hours);
    if (Number.isFinite(h) && h > 0) expiresAt = new Date(Date.now() + h * 3600000).toISOString();
  }

  const actor = g.session && g.session.username ? `operator:${g.session.username}` : 'operator:unknown';
  const row = {
    scope_type,
    scope_key,
    forced_status,
    reason: body.reason ? String(body.reason).slice(0, 240) : null,
    expires_at: expiresAt,
    actor,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('lead_engine_guardrail_overrides').upsert(row, {
    onConflict: 'scope_type,scope_key',
  });
  if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, override: row }) };
};
