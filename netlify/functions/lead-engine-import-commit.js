const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const { parseCsvText } = require('./lib/lead-engine-import-csv');
const {
  normalizeImportRow,
  loadImportLookups,
  classifyImportRows,
  insertImportRowWithSafeguards,
} = require('./lib/lead-engine-import-ops');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');

exports.handler = async (event) => {
  const headers = withCors('POST, OPTIONS');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const g = guardLeadEngineRequest(event, { requireAuth: true });
  if (!g.ok) return g.response;
  const createdBy = g.session.username;

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
  const confirm = body && body.confirm === true;
  if (!confirm) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'confirm=true is required to commit import' }),
    };
  }

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
    console.error('[lead-engine-import-commit] classify', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to classify CSV rows before commit' }),
    };
  }

  const readyRows = classified.filter((r) => r.status === 'ready' && r.normalized);
  const result = {
    total: classified.length,
    inserted: 0,
    duplicate: classified.filter((r) => r.status === 'duplicate').length,
    invalid: classified.filter((r) => r.status === 'invalid').length,
  };
  const insertedLeadIds = [];

  for (const row of readyRows) {
    try {
      const out = await insertImportRowWithSafeguards(supabase, row.normalized, createdBy);
      if (out.status === 'inserted') {
        result.inserted += 1;
        if (out.lead && out.lead.id) {
          insertedLeadIds.push(out.lead.id);
          await logLeadEngineEvent(supabase, {
            lead_id: out.lead.id,
            event_type: EVENT_TYPES.CSV_IMPORT_COMMIT_INSERTED,
            actor: createdBy || null,
            message: 'Lead inserted from CSV import commit',
          });
        }
      } else {
        result.duplicate += 1;
      }
    } catch (e) {
      console.error('[lead-engine-import-commit] insert row', e);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Import commit failed while inserting rows',
          counts: result,
        }),
      };
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      counts: result,
      insertedLeadIds,
    }),
  };
};

