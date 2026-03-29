-- Enables ON CONFLICT (source_place_id) upserts from n8n discovery when place id is present.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_engine_leads_source_place_id_unique
  ON lead_engine_leads (source_place_id)
  WHERE source_place_id IS NOT NULL;
