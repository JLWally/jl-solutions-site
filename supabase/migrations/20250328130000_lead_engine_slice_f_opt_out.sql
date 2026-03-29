-- Slice F: per-lead email opt-out + stable unsubscribe token for outreach footers.
ALTER TABLE lead_engine_leads
  ADD COLUMN IF NOT EXISTS email_opted_out BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lead_engine_leads
  ADD COLUMN IF NOT EXISTS outreach_unsubscribe_token TEXT;

UPDATE lead_engine_leads
SET outreach_unsubscribe_token = uuid_generate_v4()::text
WHERE outreach_unsubscribe_token IS NULL;

ALTER TABLE lead_engine_leads
  ALTER COLUMN outreach_unsubscribe_token SET NOT NULL;

ALTER TABLE lead_engine_leads
  ALTER COLUMN outreach_unsubscribe_token SET DEFAULT uuid_generate_v4()::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_engine_leads_outreach_unsub_token
  ON lead_engine_leads (outreach_unsubscribe_token);
