-- Align DB CHECK with API + UI: send_failed, replied, interested, not_interested
-- (see netlify/functions/lib/lead-engine-demo-outreach-contract.js)
ALTER TABLE lead_engine_leads
  DROP CONSTRAINT IF EXISTS chk_lead_demo_outreach_status;

ALTER TABLE lead_engine_leads
  ADD CONSTRAINT chk_lead_demo_outreach_status CHECK (
    demo_outreach_status IS NULL
    OR demo_outreach_status IN (
      'drafted',
      'copied',
      'sent_manual',
      'followup_due',
      'send_failed',
      'replied',
      'interested',
      'not_interested'
    )
  );
