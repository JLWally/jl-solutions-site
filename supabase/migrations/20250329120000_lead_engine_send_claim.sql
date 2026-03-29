-- Slice H: claim slot before Resend to reduce duplicate sends; reconcile stale claims.
ALTER TABLE lead_engine_outreach
  ADD COLUMN IF NOT EXISTS send_started_at TIMESTAMPTZ;

COMMENT ON COLUMN lead_engine_outreach.send_started_at IS
  'Set when send is in flight (approved → Resend). Cleared on success or Resend failure. Stale claims may be reclaimed after timeout.';
