-- Operational overrides for scout queries, enrichment audit trail, prospect enrichment timestamps,
-- and guardrail columns on scout query state.

ALTER TABLE lead_engine_scout_query_state
  ADD COLUMN IF NOT EXISTS consecutive_zero_yield_runs INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS detail_calls_day_utc DATE,
  ADD COLUMN IF NOT EXISTS detail_calls_count_day INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS lead_engine_scout_query_operational (
  query_id TEXT PRIMARY KEY,
  enabled_override BOOLEAN,
  priority_override INTEGER,
  cooldown_seconds_override INTEGER,
  paused_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_scout_query_operational_updated
  ON lead_engine_scout_query_operational (updated_at DESC);

ALTER TABLE lead_engine_scout_query_operational ENABLE ROW LEVEL SECURITY;

ALTER TABLE lead_engine_prospects
  ADD COLUMN IF NOT EXISTS enrichment_last_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_last_outcome TEXT;

CREATE TABLE IF NOT EXISTS lead_engine_prospect_enrichment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES lead_engine_prospects (id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  outcome TEXT NOT NULL,
  detail JSONB,
  worker_run_id UUID REFERENCES lead_engine_worker_runs (id) ON DELETE SET NULL,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_enrichment_events_prospect
  ON lead_engine_prospect_enrichment_events (prospect_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_engine_enrichment_events_created
  ON lead_engine_prospect_enrichment_events (created_at DESC);

ALTER TABLE lead_engine_prospect_enrichment_events ENABLE ROW LEVEL SECURITY;
