'use strict';

const path = require('path');
const fs = require('fs');
const { normalizeWebsiteUrl } = require('./lead-engine-ingest-validate');

const DEFAULT_SEEDS_PATH = path.join(__dirname, 'scout-mvp-seeds.json');
const SOURCE_KEY = 'scout_mvp_json';

/**
 * @returns {Promise<Array<{ company_name: string, website_url: string }>>}
 */
async function loadScoutMvpSeedRows() {
  const url = process.env.SCOUT_MVP_SOURCE_URL && String(process.env.SCOUT_MVP_SOURCE_URL).trim();
  if (url) {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      throw new Error(`SCOUT_MVP_SOURCE_URL HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('SCOUT_MVP_SOURCE_URL must return a JSON array');
    }
    return data;
  }

  const raw = fs.readFileSync(DEFAULT_SEEDS_PATH, 'utf8');
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error('Bundled scout seeds must be a JSON array');
  return arr;
}

function externalKeyForNormalizedUrl(normUrl) {
  try {
    const u = new URL(normUrl);
    const pathPart = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : '';
    return `${u.hostname.toLowerCase()}${pathPart}`;
  } catch {
    return normUrl.toLowerCase();
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} ctx
 * @param {string} ctx.correlationId
 * @param {string} ctx.runId
 */
async function runScoutMvpIngest({ supabase, correlationId, runId }) {
  const rows = await loadScoutMvpSeedRows();
  let inserted = 0;
  let duplicates = 0;
  let invalid = 0;
  const failures = [];

  for (const rawRow of rows) {
    const cn = rawRow && rawRow.company_name != null ? String(rawRow.company_name).trim() : '';
    const wu = rawRow && rawRow.website_url != null ? String(rawRow.website_url).trim() : '';
    if (!cn || !wu) {
      invalid += 1;
      failures.push({ reason: 'missing_company_or_url', row: rawRow });
      continue;
    }
    const norm = normalizeWebsiteUrl(wu);
    if (!norm.ok) {
      invalid += 1;
      failures.push({ reason: norm.error, company_name: cn, website_url: wu });
      continue;
    }
    const websiteUrl = norm.value;
    const externalKey = externalKeyForNormalizedUrl(websiteUrl);

    const payload = {
      source: SOURCE_KEY,
      correlation_id: correlationId,
      raw: rawRow,
    };

    const { data: existing } = await supabase
      .from('lead_engine_prospects')
      .select('id, status')
      .eq('source_key', SOURCE_KEY)
      .eq('external_key', externalKey)
      .maybeSingle();

    if (existing) {
      duplicates += 1;
      await supabase
        .from('lead_engine_prospects')
        .update({
          raw_payload: payload,
          scout_run_id: runId,
          automation_correlation_id: correlationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      continue;
    }

    const { error: insErr } = await supabase.from('lead_engine_prospects').insert({
      source_key: SOURCE_KEY,
      external_key: externalKey,
      company_name: cn,
      website_url: websiteUrl,
      raw_payload: payload,
      status: 'raw',
      scout_run_id: runId,
      automation_correlation_id: correlationId,
    });

    if (insErr) {
      if (insErr.code === '23505') {
        duplicates += 1;
      } else {
        invalid += 1;
        failures.push({ reason: insErr.message, external_key: externalKey });
      }
      continue;
    }
    inserted += 1;
  }

  return {
    source: SOURCE_KEY,
    correlation_id: correlationId,
    total_input: rows.length,
    inserted,
    duplicates,
    invalid,
    failures_preview: failures.slice(0, 12),
  };
}

module.exports = {
  runScoutMvpIngest,
  loadScoutMvpSeedRows,
  SOURCE_KEY,
  DEFAULT_SEEDS_PATH,
};
