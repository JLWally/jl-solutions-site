-- AI scoring rows stored separately from deterministic lead_engine_analysis (signals only on analysis).

CREATE TABLE IF NOT EXISTS lead_engine_ai_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES lead_engine_leads(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES lead_engine_analysis(id) ON DELETE CASCADE,
  scores JSONB NOT NULL,
  recommended_offer TEXT NOT NULL,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_ai_scores_analysis_created
  ON lead_engine_ai_scores (analysis_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_engine_ai_scores_lead_created
  ON lead_engine_ai_scores (lead_id, created_at DESC);

ALTER TABLE lead_engine_ai_scores ENABLE ROW LEVEL SECURITY;
