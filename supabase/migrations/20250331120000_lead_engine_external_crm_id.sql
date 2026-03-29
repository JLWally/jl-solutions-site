-- Slice K: explicit CRM external id field for lead-engine one-way sync.
ALTER TABLE lead_engine_leads
  ADD COLUMN IF NOT EXISTS external_crm_id TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_external_crm_id
  ON lead_engine_leads (external_crm_id)
  WHERE external_crm_id IS NOT NULL;

