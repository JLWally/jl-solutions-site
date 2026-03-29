-- Slice C: speed up "latest analysis per lead" batch lookups for lead-engine-list.

CREATE INDEX IF NOT EXISTS idx_lead_engine_analysis_lead_created
  ON lead_engine_analysis (lead_id, created_at DESC);
