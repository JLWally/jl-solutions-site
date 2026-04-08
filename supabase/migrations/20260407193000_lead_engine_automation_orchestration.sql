-- 24/7 automation: worker runs, append-only events, prospect staging, pipeline queue on leads.

CREATE TABLE IF NOT EXISTS lead_engine_worker_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  correlation_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  worker_name TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'dead_letter', 'retry_scheduled')),
  trigger TEXT NOT NULL DEFAULT 'schedule',
  lead_id UUID REFERENCES lead_engine_leads(id) ON DELETE SET NULL,
  prospect_id UUID,
  input_summary JSONB,
  result_summary JSONB,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  parent_run_id UUID REFERENCES lead_engine_worker_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  dead_letter_at TIMESTAMPTZ
);

-- One succeeded run per idempotency key; failed runs can retry with the same key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_engine_worker_runs_idempotency_succeeded
  ON lead_engine_worker_runs (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status = 'succeeded';

CREATE INDEX IF NOT EXISTS idx_lead_engine_worker_runs_worker_created
  ON lead_engine_worker_runs (worker_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_engine_worker_runs_status_created
  ON lead_engine_worker_runs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_engine_worker_runs_correlation
  ON lead_engine_worker_runs (correlation_id);

CREATE TABLE IF NOT EXISTS lead_engine_worker_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES lead_engine_worker_runs(id) ON DELETE CASCADE,
  correlation_id UUID NOT NULL,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  event_type TEXT NOT NULL,
  message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_worker_events_run_created
  ON lead_engine_worker_events (run_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_lead_engine_worker_events_correlation
  ON lead_engine_worker_events (correlation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_engine_prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_key TEXT NOT NULL,
  external_key TEXT NOT NULL,
  company_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  raw_payload JSONB,
  status TEXT NOT NULL DEFAULT 'raw'
    CHECK (status IN ('raw', 'qualified', 'blocked', 'promoted', 'duplicate')),
  icp_tier TEXT,
  icp_block_reason TEXT,
  icp_rule_hits JSONB,
  icp_rules_version TEXT NOT NULL DEFAULT 'icp-v1',
  promoted_lead_id UUID REFERENCES lead_engine_leads(id) ON DELETE SET NULL,
  scout_run_id UUID REFERENCES lead_engine_worker_runs(id) ON DELETE SET NULL,
  qualify_run_id UUID REFERENCES lead_engine_worker_runs(id) ON DELETE SET NULL,
  automation_correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_key, external_key)
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_prospects_status_updated
  ON lead_engine_prospects (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_engine_prospects_source
  ON lead_engine_prospects (source_key, created_at DESC);

ALTER TABLE lead_engine_worker_runs
  ADD CONSTRAINT fk_lead_engine_worker_runs_prospect
  FOREIGN KEY (prospect_id) REFERENCES lead_engine_prospects(id) ON DELETE SET NULL;

ALTER TABLE lead_engine_leads
  ADD COLUMN IF NOT EXISTS automation_pipeline_status TEXT,
  ADD COLUMN IF NOT EXISTS automation_correlation_id UUID;

ALTER TABLE lead_engine_leads DROP CONSTRAINT IF EXISTS chk_lead_automation_pipeline_status;
ALTER TABLE lead_engine_leads ADD CONSTRAINT chk_lead_automation_pipeline_status CHECK (
  automation_pipeline_status IS NULL
  OR automation_pipeline_status IN ('pending', 'running', 'completed', 'failed', 'skipped_openai')
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_automation_pipeline
  ON lead_engine_leads (automation_pipeline_status)
  WHERE automation_pipeline_status IS NOT NULL;

ALTER TABLE lead_engine_worker_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engine_worker_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engine_prospects ENABLE ROW LEVEL SECURITY;
