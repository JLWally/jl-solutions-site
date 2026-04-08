'use strict';

const { normalizeOptionalEmail } = require('./lead-engine-ingest-validate');

function parseEmailFromResendAddress(fromRaw) {
  const s = String(fromRaw || '').trim();
  if (!s) return null;
  const m = s.match(/<([^>]+)>/);
  const inner = m ? m[1].trim() : s;
  const n = normalizeOptionalEmail(inner);
  return n.ok && n.value ? n.value : null;
}

/**
 * Resend webhook `data.tags` is an object { key: value }.
 */
function leadIdsFromResendTagObject(tags) {
  const t = tags && typeof tags === 'object' && !Array.isArray(tags) ? tags : {};
  const lid = t.lead_engine_lead_id != null ? String(t.lead_engine_lead_id).trim() : '';
  const oid = t.lead_engine_outreach_id != null ? String(t.lead_engine_outreach_id).trim() : '';
  return {
    leadId: lid || null,
    outreachId: oid || null,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function findLeadIdByContactEmail(supabase, emailRaw) {
  const n = normalizeOptionalEmail(emailRaw);
  if (!n.ok || !n.value) return null;
  const { data, error } = await supabase
    .from('lead_engine_leads')
    .select('id')
    .eq('contact_email', n.value)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data || !data.id) return null;
  return String(data.id);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function findLeadIdByExternalCrmId(supabase, crmIdRaw) {
  const id = crmIdRaw != null ? String(crmIdRaw).trim() : '';
  if (!id) return null;
  const { data: a } = await supabase
    .from('lead_engine_leads')
    .select('id')
    .eq('external_crm_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (a && a.id) return String(a.id);
  const { data: b } = await supabase
    .from('lead_engine_leads')
    .select('id')
    .eq('external_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (b && b.id) return String(b.id);
  return null;
}

module.exports = {
  parseEmailFromResendAddress,
  leadIdsFromResendTagObject,
  findLeadIdByContactEmail,
  findLeadIdByExternalCrmId,
};
