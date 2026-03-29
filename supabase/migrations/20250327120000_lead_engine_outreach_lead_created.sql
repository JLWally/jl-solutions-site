-- Slice E: latest outreach draft per lead in list queries.

CREATE INDEX IF NOT EXISTS idx_lead_engine_outreach_lead_created
  ON lead_engine_outreach (lead_id, created_at DESC);
