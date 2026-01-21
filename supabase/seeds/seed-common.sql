-- ========================================
-- TenantFlow Seed Common - Shared Helpers
-- ========================================
-- Purpose: Provides version tracking and helper functions used by all seed tiers
-- This file should be run BEFORE any tier-specific seed file
--
-- Usage: psql $DATABASE_URL -f supabase/seeds/seed-common.sql

-- ----------------------------------------------------------------------------
-- Seed Version Tracking Table
-- ----------------------------------------------------------------------------
-- Tracks which seed versions have been applied to prevent duplicate runs
-- and provide audit trail for data seeding

create table if not exists public.seed_versions (
  version text primary key,
  tier text not null check (tier in ('smoke', 'development', 'performance')),
  applied_at timestamptz default now() not null,
  notes text
);

-- Enable RLS (required by TenantFlow conventions)
alter table public.seed_versions enable row level security;

-- Allow authenticated users to view seed versions (for debugging)
drop policy if exists "seed_versions_select_authenticated" on public.seed_versions;
create policy "seed_versions_select_authenticated"
  on public.seed_versions
  for select
  to authenticated
  using (true);

-- Only service role can insert/update seed versions
drop policy if exists "seed_versions_insert_service" on public.seed_versions;
create policy "seed_versions_insert_service"
  on public.seed_versions
  for insert
  to service_role
  with check (true);

comment on table public.seed_versions is 'Tracks applied seed data versions for idempotency';
comment on column public.seed_versions.version is 'Semantic version of the seed data (e.g., smoke-v1.0.0)';
comment on column public.seed_versions.tier is 'Seed tier: smoke (CI), development, or performance';
comment on column public.seed_versions.applied_at is 'Timestamp when this seed version was applied';
comment on column public.seed_versions.notes is 'Optional notes about what this version includes';

-- ----------------------------------------------------------------------------
-- Helper Functions
-- ----------------------------------------------------------------------------

-- Returns a random date within the last N months
-- Usage: seed_random_date(24) returns a date within the last 24 months
create or replace function public.seed_random_date(months_back int default 24)
returns timestamptz
language sql
as $$
  select now() - (random() * months_back * interval '30 days')
$$;

comment on function public.seed_random_date is 'Returns a random timestamp within the last N months for seed data temporal distribution';

-- Returns a random element from a text array
-- Usage: seed_random_choice(ARRAY['open', 'closed', 'pending'])
create or replace function public.seed_random_choice(choices text[])
returns text
language sql
as $$
  select choices[1 + floor(random() * array_length(choices, 1))::int]
$$;

comment on function public.seed_random_choice is 'Returns a random element from the provided text array for seed data variation';

-- Returns a random integer between min and max (inclusive)
-- Usage: seed_random_int(1, 10) returns 1-10
create or replace function public.seed_random_int(min_val int, max_val int)
returns int
language sql
as $$
  select min_val + floor(random() * (max_val - min_val + 1))::int
$$;

comment on function public.seed_random_int is 'Returns a random integer between min and max (inclusive)';

-- Returns a random decimal between min and max
-- Usage: seed_random_decimal(1000.00, 5000.00)
create or replace function public.seed_random_decimal(min_val numeric, max_val numeric)
returns numeric
language sql
as $$
  select round((min_val + random() * (max_val - min_val))::numeric, 2)
$$;

comment on function public.seed_random_decimal is 'Returns a random decimal between min and max with 2 decimal places';

-- Generates a realistic street address
-- Usage: seed_random_address()
create or replace function public.seed_random_address()
returns text
language sql
as $$
  select (100 + floor(random() * 9900)::int)::text || ' ' ||
         public.seed_random_choice(ARRAY['Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Birch', 'Willow', 'Cherry']) || ' ' ||
         public.seed_random_choice(ARRAY['Street', 'Avenue', 'Drive', 'Lane', 'Court', 'Boulevard', 'Way', 'Place'])
$$;

comment on function public.seed_random_address is 'Generates a realistic random street address for seed data';

-- Generates a realistic phone number
-- Usage: seed_random_phone()
create or replace function public.seed_random_phone()
returns text
language sql
as $$
  select '+1' ||
         (200 + floor(random() * 800)::int)::text ||
         (100 + floor(random() * 900)::int)::text ||
         (1000 + floor(random() * 9000)::int)::text
$$;

comment on function public.seed_random_phone is 'Generates a realistic US phone number for seed data';

-- Log message for seed script progress
do $$
begin
  raise notice '✓ Seed common helpers loaded successfully';
end $$;
