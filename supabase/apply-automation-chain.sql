-- One-shot bundle: automation → scout branches → enrichment ops → guardrails/outcomes.
-- Run in Supabase Dashboard → SQL Editor (or psql) if you are not using `supabase db push`.
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS columns where applicable.
-- After success: `npm run verify:lead-engine-automation-schema`

-- === 20260407193000_lead_engine_automation_orchestration.sql ===
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

-- === 20260408120000_lead_engine_scout_strategy_and_prospect_branches.sql ===
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

-- === 20260408140000_lead_engine_operations_split_enrichment.sql ===
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

-- === 20260408170000_lead_engine_feedback_guardrails_and_outcomes.sql ===
-- Feedback-driven guardrail state and operator overrides.

ALTER TABLE lead_engine_scout_query_state
  ADD COLUMN IF NOT EXISTS health_status TEXT,
  ADD COLUMN IF NOT EXISTS health_reason_summary TEXT,
  ADD COLUMN IF NOT EXISTS feedback_metrics JSONB;

CREATE TABLE IF NOT EXISTS lead_engine_source_guardrail_state (
  source_key TEXT PRIMARY KEY,
  health_status TEXT NOT NULL DEFAULT 'healthy',
  reason_summary TEXT,
  paused_until TIMESTAMPTZ,
  throttle_factor NUMERIC,
  feedback_metrics JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_engine_guardrail_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  forced_status TEXT NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope_type, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_guardrail_overrides_scope
  ON lead_engine_guardrail_overrides (scope_type, scope_key);

CREATE INDEX IF NOT EXISTS idx_lead_engine_guardrail_overrides_expires
  ON lead_engine_guardrail_overrides (expires_at DESC NULLS LAST);

ALTER TABLE lead_engine_source_guardrail_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engine_guardrail_overrides ENABLE ROW LEVEL SECURITY;
