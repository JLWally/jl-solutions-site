-- Custom-demo follow-up queue: due date + optional last-contact timestamp
ALTER TABLE lead_engine_leads
  ADD COLUMN IF NOT EXISTS demo_followup_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_demo_followup_due_at
  ON lead_engine_leads (demo_followup_due_at)
  WHERE demo_followup_due_at IS NOT NULL;
