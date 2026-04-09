'use strict';

const {
  sanitizeCompanyName,
  normalizeWebsiteUrl,
  normalizeOptionalEmail,
  normalizeIdempotencyKey,
  dedupeCutoffIso,
} = require('./lead-engine-ingest-validate');

const CREATED_SELECT =
  'id, company_name, website_url, contact_email, status, source, created_at, created_by';

function normalizeImportSource(raw) {
  const s = raw == null || raw === '' ? 'manual_import' : String(raw).trim().toLowerCase();
  if (s !== 'manual' && s !== 'manual_import') {
    return { ok: false, error: 'source must be "manual" or "manual_import"' };
  }
  return { ok: true, value: s };
}

function trimLocationField(raw, maxLen) {
  const m = maxLen == null ? 200 : maxLen;
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return null;
  return s.length > m ? s.slice(0, m) : s;
}

function normalizeImportRow(rawValues) {
  const errors = [];
  const company = sanitizeCompanyName(rawValues.company_name);
  if (!company.ok) errors.push(company.error);
  const url = normalizeWebsiteUrl(rawValues.website_url);
  if (!url.ok) errors.push(url.error);
  const email = normalizeOptionalEmail(rawValues.contact_email);
  if (!email.ok) errors.push(email.error);
  const source = normalizeImportSource(rawValues.source);
  if (!source.ok) errors.push(source.error);
  const idem = normalizeIdempotencyKey(rawValues.idempotency_key);
  if (!idem.ok) errors.push(idem.error);

  if (errors.length) return { ok: false, errors };
  const city = trimLocationField(rawValues.city);
  const state = trimLocationField(rawValues.state);
  return {
    ok: true,
    value: {
      company_name: company.value,
      website_url: url.value,
      contact_email: email.value,
      source: source.value,
      idempotency_key: idem.value,
      city,
      state,
    },
  };
}

async function loadImportLookups(supabase, normalizedRows) {
  const idemKeys = [...new Set(normalizedRows.map((r) => r.idempotency_key).filter(Boolean))];
  const websites = [...new Set(normalizedRows.map((r) => r.website_url).filter(Boolean))];
  const cutoff = dedupeCutoffIso();

  const idempotencyByKey = new Map();
  const recentDupByPair = new Map();

  if (idemKeys.length > 0) {
    const { data, error } = await supabase
      .from('lead_engine_leads')
      .select(CREATED_SELECT + ', idempotency_key')
      .in('idempotency_key', idemKeys);
    if (error) throw new Error('Failed to check idempotency keys');
    for (const row of data || []) {
      if (row.idempotency_key && !idempotencyByKey.has(row.idempotency_key)) {
        idempotencyByKey.set(row.idempotency_key, row);
      }
    }
  }

  if (websites.length > 0) {
    const { data, error } = await supabase
      .from('lead_engine_leads')
      .select(CREATED_SELECT)
      .in('source', ['manual', 'manual_import'])
      .in('website_url', websites)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to check duplicate rows');
    for (const row of data || []) {
      const key = `${row.company_name}||${row.website_url}`;
      if (!recentDupByPair.has(key)) {
        recentDupByPair.set(key, row);
      }
    }
  }

  return { idempotencyByKey, recentDupByPair };
}

function classifyImportRows(parsedRows, lookups) {
  const out = [];
  for (const row of parsedRows || []) {
    const normalized = normalizeImportRow(row.values);
    if (!normalized.ok) {
      out.push({
        rowNumber: row.rowNumber,
        status: 'invalid',
        errors: normalized.errors,
        normalized: null,
      });
      continue;
    }
    const v = normalized.value;
    if (v.idempotency_key && lookups.idempotencyByKey.has(v.idempotency_key)) {
      out.push({
        rowNumber: row.rowNumber,
        status: 'duplicate',
        reason: 'idempotency_replay',
        normalized: v,
      });
      continue;
    }
    const pairKey = `${v.company_name}||${v.website_url}`;
    if (lookups.recentDupByPair.has(pairKey)) {
      out.push({
        rowNumber: row.rowNumber,
        status: 'duplicate',
        reason: 'recent_manual_duplicate',
        normalized: v,
      });
      continue;
    }
    out.push({
      rowNumber: row.rowNumber,
      status: 'ready',
      normalized: v,
    });
  }
  return out;
}

async function insertImportRowWithSafeguards(supabase, normalizedRow, createdBy) {
  if (normalizedRow.idempotency_key) {
    const { data: existing, error: exErr } = await supabase
      .from('lead_engine_leads')
      .select(CREATED_SELECT)
      .eq('idempotency_key', normalizedRow.idempotency_key)
      .maybeSingle();
    if (exErr) throw new Error('Failed to check idempotency key');
    if (existing) return { status: 'duplicate', reason: 'idempotency_replay', lead: existing };
  }

  const cutoff = dedupeCutoffIso();
  const { data: recentDup, error: dupErr } = await supabase
    .from('lead_engine_leads')
    .select(CREATED_SELECT)
    .in('source', ['manual', 'manual_import'])
    .eq('website_url', normalizedRow.website_url)
    .eq('company_name', normalizedRow.company_name)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dupErr) throw new Error('Failed to check duplicate lead');
  if (recentDup) return { status: 'duplicate', reason: 'recent_manual_duplicate', lead: recentDup };

  const insertRow = {
    company_name: normalizedRow.company_name,
    website_url: normalizedRow.website_url,
    contact_email: normalizedRow.contact_email,
    source: normalizedRow.source,
    status: 'new',
    created_by: createdBy,
    idempotency_key: normalizedRow.idempotency_key,
  };
  if (normalizedRow.city) insertRow.city = normalizedRow.city;
  if (normalizedRow.state) insertRow.state = normalizedRow.state;
  const { data: created, error: insErr } = await supabase
    .from('lead_engine_leads')
    .insert(insertRow)
    .select(CREATED_SELECT)
    .single();

  if (insErr) {
    if (insErr.code === '23505' && normalizedRow.idempotency_key) {
      const { data: raceRow, error: raceErr } = await supabase
        .from('lead_engine_leads')
        .select(CREATED_SELECT)
        .eq('idempotency_key', normalizedRow.idempotency_key)
        .maybeSingle();
      if (!raceErr && raceRow) {
        return { status: 'duplicate', reason: 'idempotency_replay', lead: raceRow };
      }
    }
    throw new Error('Failed to create lead');
  }

  return { status: 'inserted', lead: created };
}

module.exports = {
  normalizeImportSource,
  normalizeImportRow,
  loadImportLookups,
  classifyImportRows,
  insertImportRowWithSafeguards,
};

