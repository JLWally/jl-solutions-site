CREATE TABLE IF NOT EXISTS lead_engine_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES lead_engine_leads(id) ON DELETE CASCADE,
  outreach_id UUID REFERENCES lead_engine_outreach(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES lead_engine_analysis(id) ON DELETE SET NULL,
  ai_score_id UUID REFERENCES lead_engine_ai_scores(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor TEXT,
  message TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_events_lead_created
  ON lead_engine_events (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_engine_events_type_created
  ON lead_engine_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_engine_events_actor_created
  ON lead_engine_events (actor, created_at DESC);

