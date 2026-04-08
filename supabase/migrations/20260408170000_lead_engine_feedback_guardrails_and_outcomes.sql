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
