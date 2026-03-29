-- Slice B: indexes for manual-ingest dedupe lookups and list ordering.
-- Apply after lead_engine_leads exists (see supabase/schema.sql lead engine section).

CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_url_company_created
  ON lead_engine_leads (website_url, company_name, created_at DESC);
