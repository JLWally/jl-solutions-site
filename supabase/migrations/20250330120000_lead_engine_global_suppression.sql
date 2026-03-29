-- Slice J: global email suppression keyed by normalized email.
CREATE TABLE IF NOT EXISTS lead_engine_email_suppressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_normalized TEXT NOT NULL UNIQUE,
  suppression_source TEXT NOT NULL DEFAULT 'unsubscribe_link',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_email_suppressions_email
  ON lead_engine_email_suppressions (email_normalized);

ALTER TABLE lead_engine_email_suppressions ENABLE ROW LEVEL SECURITY;

