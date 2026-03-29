'use strict';

const { normalizeEmailForSuppression } = require('./lead-engine-email-normalize');

function buildSuppressionLookup(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const n = normalizeEmailForSuppression(r && r.email_normalized);
    if (!n) continue;
    if (!map.has(n)) map.set(n, r);
  }
  return map;
}

function isLeadGloballySuppressed(lead, lookup) {
  if (!lead || !lookup) return false;
  const n = normalizeEmailForSuppression(lead.contact_email);
  if (!n) return false;
  return lookup.has(n);
}

async function isEmailGloballySuppressed(supabase, emailRaw) {
  const normalized = normalizeEmailForSuppression(emailRaw);
  if (!normalized) return { suppressed: false, normalized: null, row: null };
  const { data, error } = await supabase
    .from('lead_engine_email_suppressions')
    .select('id, email_normalized, suppression_source, reason, created_at, created_by')
    .eq('email_normalized', normalized)
    .maybeSingle();
  if (error) {
    return { suppressed: false, normalized, row: null, error };
  }
  return { suppressed: !!data, normalized, row: data || null };
}

async function ensureEmailGloballySuppressed(supabase, { emailRaw, suppressionSource, reason, createdBy }) {
  const normalized = normalizeEmailForSuppression(emailRaw);
  if (!normalized) {
    return { ok: true, skipped: true, normalized: null, row: null };
  }

  const ins = {
    email_normalized: normalized,
    suppression_source: suppressionSource || 'unsubscribe_link',
    reason: reason || null,
    created_by: createdBy || null,
  };

  const { error: upErr } = await supabase
    .from('lead_engine_email_suppressions')
    .upsert(ins, { onConflict: 'email_normalized', ignoreDuplicates: true });
  if (upErr) {
    return { ok: false, normalized, error: upErr };
  }

  const { data: row, error: loadErr } = await supabase
    .from('lead_engine_email_suppressions')
    .select('id, email_normalized, suppression_source, reason, created_at, created_by')
    .eq('email_normalized', normalized)
    .maybeSingle();
  if (loadErr) {
    return { ok: false, normalized, error: loadErr };
  }
  return { ok: true, skipped: false, normalized, row: row || null };
}

async function fetchSuppressionLookupForLeads(supabase, leads) {
  const normalized = [];
  const seen = new Set();
  for (const l of leads || []) {
    const n = normalizeEmailForSuppression(l && l.contact_email);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    normalized.push(n);
  }
  if (normalized.length === 0) return new Map();

  const { data, error } = await supabase
    .from('lead_engine_email_suppressions')
    .select('id, email_normalized, suppression_source, reason, created_at, created_by')
    .in('email_normalized', normalized);
  if (error) throw error;
  return buildSuppressionLookup(data || []);
}

module.exports = {
  buildSuppressionLookup,
  isLeadGloballySuppressed,
  isEmailGloballySuppressed,
  ensureEmailGloballySuppressed,
  fetchSuppressionLookupForLeads,
};

