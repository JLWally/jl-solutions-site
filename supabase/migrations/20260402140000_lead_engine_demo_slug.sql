-- Personalized smart demo slug per lead (see lead-engine-generate-demo Netlify function).
ALTER TABLE lead_engine_leads
  ADD COLUMN IF NOT EXISTS demo_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_engine_leads_demo_slug
  ON lead_engine_leads (demo_slug)
  WHERE demo_slug IS NOT NULL;
