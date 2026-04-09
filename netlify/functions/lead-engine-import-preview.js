const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { parseCsvText } = require('./lib/lead-engine-import-csv');
const {
  normalizeImportRow,
  loadImportLookups,
  classifyImportRows,
} = require('./lib/lead-engine-import-ops');

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
      body: JSON.stringify({
        error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  const csvText = body && typeof body.csvText === 'string' ? body.csvText : '';
  const parsed = parseCsvText(csvText);
  if (!parsed.ok) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: parsed.error, code: 'CSV_PARSE_FAILED' }) };
  }

  let classified;
  try {
    const normalizedRows = parsed.value.rows
      .map((r) => normalizeImportRow(r.values))
      .filter((r) => r.ok)
      .map((r) => r.value);
    const lookups = await loadImportLookups(supabase, normalizedRows);
    classified = classifyImportRows(parsed.value.rows, lookups);
  } catch (e) {
    console.error('[lead-engine-import-preview]', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to classify CSV rows' }),
    };
  }

  const counts = { total: classified.length, ready: 0, duplicate: 0, invalid: 0 };
  for (const r of classified) {
    if (r.status === 'ready') counts.ready += 1;
    else if (r.status === 'duplicate') counts.duplicate += 1;
    else counts.invalid += 1;
  }

  const ignoredHeaders = (parsed.value && parsed.value.ignoredHeaders) || [];

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      ignoredHeaders,
      counts,
      rows: classified.map((r) => ({
        rowNumber: r.rowNumber,
        status: r.status,
        reason: r.reason || null,
        errors: r.errors || [],
        normalized: r.normalized || null,
      })),
    }),
  };
};

