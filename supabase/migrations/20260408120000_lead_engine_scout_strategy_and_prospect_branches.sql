-- Scout query rotation state + prospect branches (no website / weak presence / enrichment queue).

CREATE TABLE IF NOT EXISTS lead_engine_scout_query_state (
  query_id TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ,
  last_next_page_token TEXT,
  last_result_summary JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_scout_query_state_last_run
  ON lead_engine_scout_query_state (last_run_at DESC NULLS LAST);

ALTER TABLE lead_engine_prospects DROP CONSTRAINT IF EXISTS lead_engine_prospects_status_check;

ALTER TABLE lead_engine_prospects
  ALTER COLUMN website_url DROP NOT NULL;

ALTER TABLE lead_engine_prospects ADD CONSTRAINT lead_engine_prospects_status_check CHECK (
  status IN (
    'raw',
    'qualified',
    'blocked',
    'promoted',
    'duplicate',
    'no_website',
    'weak_web_presence',
    'alternate_enrichment_needed'
  )
);

ALTER TABLE lead_engine_scout_query_state ENABLE ROW LEVEL SECURITY;
