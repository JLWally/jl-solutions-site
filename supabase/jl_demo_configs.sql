-- JL Solutions: optional audit log for demos created via internal builder / lead engine.
-- Run in Supabase SQL Editor when you want DB-backed demo history alongside Netlify Blobs.

create table if not exists public.jl_demo_configs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  business_name text not null,
  industry text not null,
  services_json jsonb not null default '[]'::jsonb,
  issue_options_json jsonb not null default '[]'::jsonb,
  cta_service text not null default 'ai-intake',
  notes text,
  config_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists jl_demo_configs_created_at_idx
  on public.jl_demo_configs (created_at desc);

comment on table public.jl_demo_configs is 'Internal demo builder / lead-engine generated smart intake configs (mirror of blob store + notes).';
