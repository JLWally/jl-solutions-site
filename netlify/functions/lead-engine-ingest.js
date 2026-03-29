/**
 * Manual lead ingestion (Slice B). Supabase service role only.
 */
const { guardLeadEngineRequest, withCors } = require('./lib/lead-engine-guard');
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const {
  validateManualIngestBody,
  dedupeCutoffIso,
} = require('./lib/lead-engine-ingest-validate');
const { ingestSuccessBody } = require('./lib/lead-engine-ingest-response');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');
const { supabaseErrorPayload } = require('./lib/lead-engine-supabase-error');

const COMPACT_SELECT =
  'id, company_name, website_url, contact_email, status, source, created_at, created_by';

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

  const validated = validateManualIngestBody(body);
  if (!validated.ok) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Validation failed', errors: validated.errors }),
    };
  }

  const v = validated.value;
  const createdBy = g.session.username;

  if (v.idempotency_key) {
    const { data: existing, error: exErr } = await supabase
      .from('lead_engine_leads')
      .select(COMPACT_SELECT)
      .eq('idempotency_key', v.idempotency_key)
      .maybeSingle();

    if (exErr) {
      console.error('[lead-engine-ingest] idempotency lookup', exErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(supabaseErrorPayload(exErr, 'Failed to check idempotency key')),
      };
    }
    if (existing) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(ingestSuccessBody(existing, { idempotentReplay: true })),
      };
    }
  }

  const cutoff = dedupeCutoffIso();
  const { data: recentDup, error: dupErr } = await supabase
    .from('lead_engine_leads')
    .select(COMPACT_SELECT)
    .eq('source', 'manual')
    .eq('website_url', v.website_url)
    .eq('company_name', v.company_name)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dupErr) {
    console.error('[lead-engine-ingest] dedupe lookup', dupErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(supabaseErrorPayload(dupErr, 'Failed to check for duplicate lead')),
    };
  }
  if (recentDup) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(ingestSuccessBody(recentDup, { duplicateReplay: true })),
    };
  }

  const insertRow = {
    company_name: v.company_name,
    website_url: v.website_url,
    contact_email: v.contact_email,
    source: v.source,
    status: 'new',
    created_by: createdBy,
    idempotency_key: v.idempotency_key,
  };

  const { data: created, error: insErr } = await supabase
    .from('lead_engine_leads')
    .insert(insertRow)
    .select(COMPACT_SELECT)
    .single();

  if (insErr) {
    if (insErr.code === '23505' && v.idempotency_key) {
      const { data: raceRow, error: raceErr } = await supabase
        .from('lead_engine_leads')
        .select(COMPACT_SELECT)
        .eq('idempotency_key', v.idempotency_key)
        .maybeSingle();
      if (!raceErr && raceRow) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(ingestSuccessBody(raceRow, { idempotentReplay: true })),
        };
      }
    }
    console.error('[lead-engine-ingest] insert', insErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(supabaseErrorPayload(insErr, 'Failed to create lead')),
    };
  }

  await logLeadEngineEvent(supabase, {
    lead_id: created.id,
    event_type: EVENT_TYPES.MANUAL_INGEST_CREATED,
    actor: createdBy || null,
    message: 'Lead created from manual ingest',
    metadata_json: { source: v.source || 'manual' },
  });
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(ingestSuccessBody(created)),
  };
};
