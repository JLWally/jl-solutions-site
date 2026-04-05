-- Manual custom-demo outreach tracking (Phase 6): drafted / copied / sent_manual / followup_due
ALTER TABLE lead_engine_leads
  ADD COLUMN IF NOT EXISTS demo_outreach_status TEXT,
  ADD COLUMN IF NOT EXISTS demo_outreach_status_at TIMESTAMPTZ;

ALTER TABLE lead_engine_leads
  DROP CONSTRAINT IF EXISTS chk_lead_demo_outreach_status;

ALTER TABLE lead_engine_leads
  ADD CONSTRAINT chk_lead_demo_outreach_status CHECK (
    demo_outreach_status IS NULL
    OR demo_outreach_status IN ('drafted', 'copied', 'sent_manual', 'followup_due')
  );

CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_demo_outreach_status
  ON lead_engine_leads (demo_outreach_status)
  WHERE demo_outreach_status IS NOT NULL;
