-- JL Solutions: Referral, Consultation, and Payment Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends Supabase auth.users - we use auth.uid() for foreign keys)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'sales_agent', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral codes (owned by sales agents)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'sales_agent' CHECK (type IN ('sales_agent', 'client')),
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);

-- Referrals (track when a code is used - sale or signup)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount_cents INTEGER DEFAULT 0,
  commission_cents INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  stripe_session_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code_id);

-- Free consultation form submissions
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

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update/insert own profile (insert for signup trigger)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Referral codes: users see own codes, admins see all
DROP POLICY IF EXISTS "Users can view own referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Sales agents can insert own codes" ON referral_codes;
CREATE POLICY "Users can view own referral codes" ON referral_codes FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Sales agents can insert own codes" ON referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Referrals: referrers see their referrals
DROP POLICY IF EXISTS "Referrers can view own referrals" ON referrals;
CREATE POLICY "Referrers can view own referrals" ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Consultations: admins only (sensitive lead data)
DROP POLICY IF EXISTS "Admins can manage consultations" ON consultations;
CREATE POLICY "Admins can manage consultations" ON consultations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role bypasses RLS (used by Netlify Functions)
-- No additional policy needed - service_role key bypasses RLS

-- Trigger: Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Lead engine (internal AI-assisted leads). Supabase source of truth.
-- Netlify Functions use the service role key (bypasses RLS). No anon policies.
-- Incremental SQL:
--   supabase/migrations/20250324120000_lead_engine_slice_b_indexes.sql
--   supabase/migrations/20250325120000_lead_engine_analysis_latest_idx.sql
--   supabase/migrations/20250326120000_lead_engine_ai_scores.sql
--   supabase/migrations/20250327120000_lead_engine_outreach_lead_created.sql
--   supabase/migrations/20250328130000_lead_engine_slice_f_opt_out.sql
--   supabase/migrations/20250329120000_lead_engine_send_claim.sql
--   supabase/migrations/20250330120000_lead_engine_global_suppression.sql
--   supabase/migrations/20250331120000_lead_engine_external_crm_id.sql
--   supabase/migrations/20250401120000_lead_engine_events.sql
--   supabase/migrations/20250402120000_lead_engine_leads_extended.sql
--   supabase/migrations/20250403120000_lead_engine_source_place_id_unique.sql
--   supabase/migrations/20260402140000_lead_engine_demo_slug.sql
--   supabase/migrations/20260402160000_lead_engine_demo_outreach_status.sql
--   supabase/migrations/20260403100000_lead_engine_demo_followup_due.sql
--   supabase/migrations/20260407180000_lead_engine_demo_outreach_status_expand.sql
--   supabase/migrations/20260407193000_lead_engine_automation_orchestration.sql
--   supabase/migrations/20260408120000_lead_engine_scout_strategy_and_prospect_branches.sql
-- ---------------------------------------------------------------------------

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
  -- Discovery / contact fields (Slice: discovery-ready schema)
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
  -- PageSpeed Insights / PSI metrics
  page_speed_score INTEGER,
  performance_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  seo_score INTEGER,
  accessibility_flags JSONB,
  -- Website UX presence flags
  booking_present BOOLEAN,
  chat_present BOOLEAN,
  form_present BOOLEAN,
  form_quality TEXT,
  trust_signals JSONB,
  -- AI scoring + outreach snapshot
  lead_score INTEGER,
  pain_points JSONB,
  outreach_angle TEXT,
  first_email_subject TEXT,
  first_email_draft TEXT,
  linkedin_dm_draft TEXT,
  -- Personalized smart demo (lead-engine-generate-demo)
  demo_slug TEXT,
  -- Custom-demo email pipeline (internal /internal/outreach); not automated sends
  demo_outreach_status TEXT,
  demo_outreach_status_at TIMESTAMPTZ,
  demo_followup_due_at TIMESTAMPTZ,
  demo_last_contacted_at TIMESTAMPTZ,
  -- Operator workflow timestamps
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

-- Slice B: dedupe + list helpers (same as migrations/20250324120000_lead_engine_slice_b_indexes.sql)
CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_url_company_created
  ON lead_engine_leads (website_url, company_name, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_engine_leads_demo_slug
  ON lead_engine_leads (demo_slug)
  WHERE demo_slug IS NOT NULL;

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

CREATE INDEX IF NOT EXISTS idx_lead_engine_leads_demo_outreach_status
  ON lead_engine_leads (demo_outreach_status)
  WHERE demo_outreach_status IS NOT NULL;

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
-- Note: scores / recommended_offer / model_version on lead_engine_analysis are legacy only.
-- New AI scoring writes to lead_engine_ai_scores (see below).

CREATE INDEX IF NOT EXISTS idx_lead_engine_analysis_lead ON lead_engine_analysis (lead_id);

-- Slice C: latest analysis per lead (same as migrations/20250325120000_lead_engine_analysis_latest_idx.sql)
CREATE INDEX IF NOT EXISTS idx_lead_engine_analysis_lead_created
  ON lead_engine_analysis (lead_id, created_at DESC);

-- AI scoring (model output) keyed to the deterministic audit row; does not mutate signals.
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
