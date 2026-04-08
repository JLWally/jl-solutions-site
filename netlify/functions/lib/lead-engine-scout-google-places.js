'use strict';

/**
 * Google Places Scout (Text Search + Details) with query strategy, pagination, and prospect branches.
 *
 * Env: SCOUT_GOOGLE_PLACES_ENABLED, GOOGLE_PLACES_API_KEY / SCOUT_GOOGLE_PLACES_API_KEY
 * Strategy: netlify/functions/lib/scout-query-strategy-v1.json (or SCOUT_QUERY_STRATEGY_PATH)
 * Legacy: SCOUT_GOOGLE_TEXT_QUERY when no enabled queries in file
 */

const { normalizeWebsiteUrl } = require('./lead-engine-ingest-validate');
const { getActiveGooglePlaceQueries } = require('./lead-engine-scout-query-strategy');

const SOURCE_KEY = 'scout_google_places';

const TEXT_SEARCH_BASE = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const DETAILS_BASE = 'https://maps.googleapis.com/maps/api/place/details/json';

const WEAK_HOST_HINTS = [
  'facebook.com',
  'instagram.com',
  'm.yelp.com',
  'yelp.com',
  'tiktok.com',
  'linkedin.com',
];

function intEnv(name, def) {
  const v = process.env[name];
  if (v == null || v === '') return def;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : def;
}

function getApiKey() {
  return (
    (process.env.GOOGLE_PLACES_API_KEY && String(process.env.GOOGLE_PLACES_API_KEY).trim()) ||
    (process.env.SCOUT_GOOGLE_PLACES_API_KEY && String(process.env.SCOUT_GOOGLE_PLACES_API_KEY).trim()) ||
    ''
  );
}

function isScoutGooglePlacesConfigured() {
  const enabled =
    String(process.env.SCOUT_GOOGLE_PLACES_ENABLED || '')
      .trim()
      .toLowerCase() === 'true' ||
    String(process.env.SCOUT_GOOGLE_PLACES_ENABLED || '').trim() === '1';
  const key = getApiKey();
  const { queries } = getActiveGooglePlaceQueries();
  return { ok: !!(enabled && key && queries.length), enabled, hasKey: !!key, queryCount: queries.length };
}

function normalizeCompanyName(name) {
  let s = String(name || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*,\s*(Inc\.?|LLC|L\.L\.C\.|Ltd\.?|PLC|Corp\.?|Corporation)\.?$/i, '').trim();
  return s || 'Unknown business';
}

/**
 * @returns {{ status: string, website_url: string|null, website_raw: string|null, detail?: string }}
 */
function classifyWebPresence(websiteRaw, mapsUrl) {
  const raw = websiteRaw && String(websiteRaw).trim();
  if (!raw) {
    return { status: 'no_website', website_url: null, website_raw: null, detail: 'no_website_field' };
  }

  const norm = normalizeWebsiteUrl(raw);
  if (!norm.ok) {
    return {
      status: 'alternate_enrichment_needed',
      website_url: null,
      website_raw: raw,
      detail: norm.error || 'invalid_url',
    };
  }

  let host = '';
  try {
    host = new URL(norm.value).hostname.toLowerCase();
  } catch {
    return { status: 'alternate_enrichment_needed', website_url: null, website_raw: raw, detail: 'parse_host' };
  }

  if (host.includes('google.') && (host.includes('maps') || /(^|\.)maps\./.test(host))) {
    return { status: 'alternate_enrichment_needed', website_url: null, website_raw: raw, detail: 'maps_only_host' };
  }

  for (const h of WEAK_HOST_HINTS) {
    if (host === h || host.endsWith(`.${h}`) || host.includes(h)) {
      return { status: 'weak_web_presence', website_url: norm.value, website_raw: raw, detail: `host:${h}` };
    }
  }

  return { status: 'raw', website_url: norm.value, website_raw: raw, detail: null };
}

function parseAddressComponents(components) {
  const out = {
    country: null,
    admin_area_level_1: null,
    locality: null,
    postal_code: null,
  };
  for (const c of components || []) {
    const types = c.types || [];
    if (types.includes('country')) out.country = c.short_name || null;
    if (types.includes('administrative_area_level_1')) out.admin_area_level_1 = c.short_name || null;
    if (types.includes('locality')) out.locality = c.long_name || null;
    if (types.includes('postal_code')) out.postal_code = c.long_name || null;
  }
  return out;
}

async function googleTextSearch({ query, key, region, language, pageToken }) {
  if (pageToken) {
    await new Promise((r) => setTimeout(r, 2200));
  }
  const params = new URLSearchParams({ query, key });
  if (language) params.set('language', language);
  if (region) params.set('region', region);
  if (pageToken) params.set('pagetoken', pageToken);

  const url = `${TEXT_SEARCH_BASE}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  return res.json();
}

async function googlePlaceDetails({ placeId, key, language }) {
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'website',
    'types',
    'rating',
    'user_ratings_total',
    'geometry',
    'address_components',
    'url',
  ].join(',');
  const params = new URLSearchParams({
    place_id: placeId,
    fields,
    key,
  });
  if (language) params.set('language', language);
  const url = `${DETAILS_BASE}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  return res.json();
}

async function funnelConflictByWebsite(supabase, { websiteUrl, placeId }) {
  if (!websiteUrl) return null;
  const { data: leadByUrl } = await supabase
    .from('lead_engine_leads')
    .select('id')
    .eq('website_url', websiteUrl)
    .limit(1)
    .maybeSingle();
  if (leadByUrl) return { reason: 'duplicate_website_in_leads', id: leadByUrl.id };

  if (placeId) {
    const { data: leadByPlace } = await supabase
      .from('lead_engine_leads')
      .select('id')
      .eq('source_place_id', placeId)
      .limit(1)
      .maybeSingle();
    if (leadByPlace) return { reason: 'duplicate_place_id_in_leads', id: leadByPlace.id };
  }

  const { data: prospectsSameUrl } = await supabase
    .from('lead_engine_prospects')
    .select('id, external_key')
    .eq('website_url', websiteUrl)
    .limit(20);

  if (prospectsSameUrl && prospectsSameUrl.some((p) => p.external_key !== placeId)) {
    const first = prospectsSameUrl.find((p) => p.external_key !== placeId);
    return { reason: 'duplicate_website_in_prospects', id: first.id };
  }

  return null;
}

async function funnelConflictPlaceOnly(supabase, placeId) {
  const { data: leadByPlace } = await supabase
    .from('lead_engine_leads')
    .select('id')
    .eq('source_place_id', placeId)
    .limit(1)
    .maybeSingle();
  if (leadByPlace) return { reason: 'duplicate_place_id_in_leads', id: leadByPlace.id };
  return null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} ctx
 * @param {object} [ctx.googleQuery] — selected query spec
 * @param {object|null} [ctx.googleQueryStateRow] — DB row for pagination token
 * @param {object} [ctx.globalBudgets] — from strategy
 */
async function runGooglePlacesScoutIngest(ctx) {
  const { supabase, correlationId, runId, googleQuery, googleQueryStateRow, globalBudgets: gbIn } = ctx;

  const cfg = isScoutGooglePlacesConfigured();
  if (!cfg.ok) {
    throw new Error(
      'Google Places scout not configured: enable SCOUT_GOOGLE_PLACES_ENABLED, set API key, and add enabled queries (strategy file or SCOUT_GOOGLE_TEXT_QUERY).'
    );
  }

  if (!googleQuery || !googleQuery.text_query) {
    throw new Error('Google Places scout invoked without a selected query spec');
  }

  const key = getApiKey();
  const qSpec = googleQuery;
  const queryLabel = String(qSpec.label || qSpec.id);
  const textQuery = String(qSpec.text_query).trim();
  const region = qSpec.region ? String(qSpec.region).trim() : 'us';
  const language = qSpec.language ? String(qSpec.language).trim() : 'en';
  const gb = gbIn || {
    max_detail_calls_per_tick: intEnv('SCOUT_GLOBAL_MAX_DETAILS', 32),
    duplicate_ratio_abort_pagination_threshold: 0.82,
    max_text_search_pages_per_tick: 1,
  };

  const perQueryMax = Math.min(
    40,
    Math.max(
      1,
      qSpec.max_details_per_run != null && Number.isFinite(Number(qSpec.max_details_per_run))
        ? Number(qSpec.max_details_per_run)
        : 12
    )
  );
  const detailBudget = Math.min(gb.max_detail_calls_per_tick, perQueryMax);

  const pageTokenIn = googleQueryStateRow && googleQueryStateRow.last_next_page_token
    ? String(googleQueryStateRow.last_next_page_token).trim()
    : null;

  const health = {
    source: SOURCE_KEY,
    query_id: String(qSpec.id),
    query_label: queryLabel,
    correlation_id: correlationId,
    text_query: textQuery,
    text_search_status: null,
    text_search_error_message: null,
    text_search_page_token_used: !!pageTokenIn,
    next_page_token_saved: null,
    results_from_search: 0,
    text_search_pages_used: 0,
    details_attempted: 0,
    detail_errors: 0,
    inserted_raw: 0,
    inserted_branch: 0,
    duplicates_place_id: 0,
    duplicates_website_in_funnel: 0,
    skipped_duplicate_heavy_abort: false,
    duplicate_ratio: null,
    error_summary: [],
    failures_preview: [],
  };

  let searchJson;
  try {
    searchJson = await googleTextSearch({
      query: textQuery,
      key,
      region,
      language,
      pageToken: pageTokenIn,
    });
    health.text_search_pages_used = 1;
  } catch (e) {
    health.text_search_status = 'fetch_error';
    health.text_search_error_message = e.message || String(e);
    health.error_summary.push({ phase: 'text_search', error: health.text_search_error_message });
    throw e;
  }

  health.text_search_status = searchJson.status || 'unknown';
  if (searchJson.error_message) {
    health.text_search_error_message = searchJson.error_message;
  }

  if (searchJson.status === 'REQUEST_DENIED' || searchJson.status === 'INVALID_REQUEST') {
    const msg = `Google Places Text Search ${searchJson.status}: ${searchJson.error_message || 'no message'}`;
    health.error_summary.push({ phase: 'text_search', status: searchJson.status });
    throw new Error(msg);
  }

  const rawResults = Array.isArray(searchJson.results) ? searchJson.results : [];
  health.results_from_search = rawResults.length;
  const slice = rawResults.slice(0, detailBudget);

  for (let i = 0; i < slice.length; i += 1) {
    const hit = slice[i];
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    const placeId = hit.place_id && String(hit.place_id).trim();
    if (!placeId) continue;

    if (health.details_attempted >= detailBudget) break;
    health.details_attempted += 1;

    let detailsJson;
    try {
      detailsJson = await googlePlaceDetails({ placeId, key, language });
    } catch (e) {
      health.detail_errors += 1;
      health.failures_preview.push({ place_id: placeId, phase: 'details_fetch', error: e.message || String(e) });
      continue;
    }

    if (!detailsJson || detailsJson.status !== 'OK' || !detailsJson.result) {
      health.detail_errors += 1;
      health.failures_preview.push({
        place_id: placeId,
        phase: 'details_response',
        status: detailsJson && detailsJson.status,
        error_message: detailsJson && detailsJson.error_message,
      });
      continue;
    }

    const r = detailsJson.result;
    const companyName = normalizeCompanyName(r.name);
    const webClass = classifyWebPresence(r.website, r.url);
    const addr = parseAddressComponents(r.address_components);
    const types = Array.isArray(r.types) ? r.types.map((t) => String(t).toLowerCase()) : [];

    const scoutNormalized = {
      provider: 'google_places',
      place_id: placeId,
      types,
      rating: r.rating != null ? Number(r.rating) : null,
      user_ratings_total: r.user_ratings_total != null ? Number(r.user_ratings_total) : null,
      formatted_address: r.formatted_address || null,
      maps_url: r.url || null,
      address_country: addr.country,
      address_admin_area_level_1: addr.admin_area_level_1,
      address_locality: addr.locality,
      postal_code: addr.postal_code,
      geometry: r.geometry || null,
      web_presence: webClass.status,
      web_presence_detail: webClass.detail,
      website_raw: webClass.website_raw,
    };

    const payload = {
      source: SOURCE_KEY,
      correlation_id: correlationId,
      query_id: String(qSpec.id),
      query_label: queryLabel,
      scout_normalized: scoutNormalized,
      text_search_hit: {
        name: hit.name,
        place_id: hit.place_id,
      },
    };

    const prospectStatus =
      webClass.status === 'raw'
        ? 'raw'
        : webClass.status === 'weak_web_presence'
          ? 'weak_web_presence'
          : webClass.status === 'alternate_enrichment_needed'
            ? 'alternate_enrichment_needed'
            : 'no_website';

    const websiteUrlForRow = webClass.website_url;

    const { data: existingPlace } = await supabase
      .from('lead_engine_prospects')
      .select('id, status')
      .eq('source_key', SOURCE_KEY)
      .eq('external_key', placeId)
      .maybeSingle();

    if (existingPlace) {
      health.duplicates_place_id += 1;
      await supabase
        .from('lead_engine_prospects')
        .update({
          company_name: companyName,
          website_url: websiteUrlForRow,
          raw_payload: payload,
          status: prospectStatus,
          scout_run_id: runId,
          automation_correlation_id: correlationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPlace.id);
      continue;
    }

    let dup = null;
    if (websiteUrlForRow) {
      dup = await funnelConflictByWebsite(supabase, { websiteUrl: websiteUrlForRow, placeId });
    } else {
      dup = await funnelConflictPlaceOnly(supabase, placeId);
    }
    if (dup) {
      health.duplicates_website_in_funnel += 1;
      health.failures_preview.push({
        place_id: placeId,
        phase: 'dedupe',
        reason: dup.reason,
        other_id: dup.id,
      });
      continue;
    }

    const { error: insErr } = await supabase.from('lead_engine_prospects').insert({
      source_key: SOURCE_KEY,
      external_key: placeId,
      company_name: companyName,
      website_url: websiteUrlForRow,
      raw_payload: payload,
      status: prospectStatus,
      scout_run_id: runId,
      automation_correlation_id: correlationId,
    });

    if (insErr) {
      if (insErr.code === '23505') {
        health.duplicates_place_id += 1;
      } else {
        health.detail_errors += 1;
        health.failures_preview.push({ place_id: placeId, phase: 'insert', error: insErr.message });
      }
      continue;
    }
    if (prospectStatus === 'raw') health.inserted_raw += 1;
    else health.inserted_branch += 1;
  }

  const dupTotal = health.duplicates_place_id + health.duplicates_website_in_funnel;
  health.duplicate_ratio = health.details_attempted > 0 ? dupTotal / health.details_attempted : 0;

  let nextTok = searchJson.next_page_token ? String(searchJson.next_page_token).trim() : null;
  if (health.duplicate_ratio >= gb.duplicate_ratio_abort_pagination_threshold && health.details_attempted >= 4) {
    health.skipped_duplicate_heavy_abort = true;
    nextTok = null;
    health.error_summary.push({
      phase: 'pagination',
      note: 'cleared_next_page_token_duplicate_heavy',
      duplicate_ratio: health.duplicate_ratio,
    });
  }
  health.next_page_token_saved = nextTok;

  health.failures_preview = health.failures_preview.slice(0, 18);
  health.detail_budget_applied = detailBudget;
  health.global_budget_max_details = gb.max_detail_calls_per_tick;

  return health;
}

module.exports = {
  SOURCE_KEY,
  isScoutGooglePlacesConfigured,
  runGooglePlacesScoutIngest,
  parseAddressComponents,
  normalizeCompanyName,
  classifyWebPresence,
  googlePlaceDetails,
  getApiKey,
};
