-- =============================================================================
-- V1 revenue setup — run ONCE in Supabase → SQL Editor → New query → Run
-- Safe to re-run: uses IF NOT EXISTS / idempotent indexes.
-- Requires: nothing else (service role from Netlify bypasses RLS on these tables).
-- After run: redeploy not required for DB; refresh /lead-engine/ in browser.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- public.consultations — website contact + book-a-call mirror (send-form-email)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  service TEXT,
  message TEXT,
  challenge TEXT,
  goals TEXT,
  referral_code TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'converted', 'closed')),
  source TEXT DEFAULT 'website',
  selected_datetime TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_created ON consultations(created_at DESC);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Lead engine (manual leads, analyze, score, draft, CSV import, activity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_engine_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL DEFAULT 'manual',
  company_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  contact_email TEXT,
  email_opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  outreach_unsubscribe_token TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'analyzed', 'review', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  external_id TEXT,
  external_crm_id TEXT,
  idempotency_key TEXT,
  crm_source TEXT,
  sync_status TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  business_name TEXT,
  contact_name TEXT,
  contact_role TEXT,
  website TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  phone TEXT,
  email TEXT,
  niche TEXT,
  city TEXT,
  state TEXT,
  source_place_id TEXT,
  page_speed_score INTEGER,
  performance_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  seo_score INTEGER,
  accessibility_flags JSONB,
  booking_present BOOLEAN,
  chat_present BOOLEAN,
  form_present BOOLEAN,
  form_quality TEXT,
  trust_signals JSONB,
  lead_score INTEGER,
  pain_points JSONB,
  outreach_angle TEXT,
  first_email_subject TEXT,
  first_email_draft TEXT,
  linkedin_dm_draft TEXT,
  last_reviewed_at TIMESTAMPTZ,
  audited_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_engine_leads_idempotency_key
  ON lead_engine_leads (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_engine_leads_outreach_unsub_token
  ON lead_engine_leads (outreach_unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_status ON lead_engine_leads (status);
CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_created ON lead_engine_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_external_crm_id
  ON lead_engine_leads (external_crm_id)
  WHERE external_crm_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_engine_leads_source_place_id_unique
  ON lead_engine_leads (source_place_id)
  WHERE source_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_url_company_created
  ON lead_engine_leads (website_url, company_name, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_engine_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES lead_engine_leads(id) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ,
  signals JSONB NOT NULL DEFAULT '{}',
  scores JSONB,
  recommended_offer TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_analysis_lead ON lead_engine_analysis (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_engine_analysis_lead_created
  ON lead_engine_analysis (lead_id, created_at DESC);

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

CREATE TABLE IF NOT EXISTS lead_engine_outreach (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES lead_engine_leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  draft_subject TEXT,
  draft_body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT,
  sent_at TIMESTAMPTZ,
  send_started_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_engine_outreach_lead ON lead_engine_outreach (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_engine_outreach_lead_created
  ON lead_engine_outreach (lead_id, created_at DESC);

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

ALTER TABLE lead_engine_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engine_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engine_ai_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engine_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engine_email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engine_events ENABLE ROW LEVEL SECURITY;

-- Done. Netlify functions use SUPABASE_SERVICE_ROLE_KEY → RLS bypassed.
