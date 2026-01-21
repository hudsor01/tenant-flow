-- ========================================
-- TenantFlow Seed Data - Default (Smoke Tier)
-- ========================================
--
-- This is the default seed file run by `supabase start`.
-- It uses the SMOKE tier for fast CI and quick local startup.
--
-- THREE-TIER SEED DATA SYSTEM:
-- ============================================================================
--
-- 1. SMOKE (this file, via supabase start)
--    - Minimal data for CI pipelines (<5 seconds)
--    - 2 owners, 2 tenants, 4 properties, 8 units
--    - RLS isolation test data
--    - Run: `supabase start` or `pnpm db:seed:smoke`
--
-- 2. DEVELOPMENT
--    - Realistic data for local development
--    - 10 owners, 50 tenants, varied properties/units
--    - 24-month temporal distribution
--    - Run: `pnpm db:seed:dev`
--
-- 3. PERFORMANCE
--    - Large-scale data for load testing
--    - 100 owners, 500 tenants, 1000+ properties
--    - 5000+ units, 10000+ leases, 50000+ maintenance requests
--    - Run: `pnpm db:seed:perf`
--
-- Seed files location: supabase/seeds/
-- - seed-common.sql    - Shared helpers and version tracking
-- - seed-smoke.sql     - Minimal CI data
-- - seed-development.sql - Realistic dev data
-- - seed-performance.sql - Load test data
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Include seed-common.sql (helpers and version tracking)
-- ----------------------------------------------------------------------------

-- Seed Version Tracking Table
create table if not exists public.seed_versions (
  version text primary key,
  tier text not null check (tier in ('smoke', 'development', 'performance')),
  applied_at timestamptz default now() not null,
  notes text
);

alter table public.seed_versions enable row level security;

drop policy if exists "seed_versions_select_authenticated" on public.seed_versions;
create policy "seed_versions_select_authenticated"
  on public.seed_versions
  for select
  to authenticated
  using (true);

drop policy if exists "seed_versions_insert_service" on public.seed_versions;
create policy "seed_versions_insert_service"
  on public.seed_versions
  for insert
  to service_role
  with check (true);

comment on table public.seed_versions is 'Tracks applied seed data versions for idempotency';

-- Helper functions
create or replace function public.seed_random_date(months_back int default 24)
returns timestamptz
language sql
as $$
  select now() - (random() * months_back * interval '30 days')
$$;

create or replace function public.seed_random_choice(choices text[])
returns text
language sql
as $$
  select choices[1 + floor(random() * array_length(choices, 1))::int]
$$;

create or replace function public.seed_random_int(min_val int, max_val int)
returns int
language sql
as $$
  select min_val + floor(random() * (max_val - min_val + 1))::int
$$;

create or replace function public.seed_random_decimal(min_val numeric, max_val numeric)
returns numeric
language sql
as $$
  select round((min_val + random() * (max_val - min_val))::numeric, 2)
$$;

create or replace function public.seed_random_address()
returns text
language sql
as $$
  select (100 + floor(random() * 9900)::int)::text || ' ' ||
         public.seed_random_choice(ARRAY['Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Birch', 'Willow', 'Cherry']) || ' ' ||
         public.seed_random_choice(ARRAY['Street', 'Avenue', 'Drive', 'Lane', 'Court', 'Boulevard', 'Way', 'Place'])
$$;

create or replace function public.seed_random_phone()
returns text
language sql
as $$
  select '+1' ||
         (200 + floor(random() * 800)::int)::text ||
         (100 + floor(random() * 900)::int)::text ||
         (1000 + floor(random() * 9000)::int)::text
$$;

-- ----------------------------------------------------------------------------
-- Include seed-smoke.sql (minimal CI data)
-- ----------------------------------------------------------------------------

-- Track seed version (idempotent)
insert into public.seed_versions (version, tier, notes)
values ('smoke-v1.0.0', 'smoke', 'Minimal CI seed: 2 owners, 2 tenants, 4 properties, 8 units')
on conflict (version) do update
set applied_at = now(),
    notes = excluded.notes;

-- OWNER A
do $$
declare
  v_owner_a_user_id uuid;
  v_owner_a_po_id uuid;
  v_tenant_a_user_id uuid;
  v_tenant_a_id uuid;
  v_property_a1_id uuid;
  v_property_a2_id uuid;
  v_unit_a1_id uuid;
begin
  -- Create Owner A user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values ('owner-a@test.com', 'Alice Anderson', 'Alice', 'Anderson', 'OWNER', '+15551001001', 'active')
  on conflict (email) do update set full_name = excluded.full_name, updated_at = now()
  returning id into v_owner_a_user_id;

  -- Create Owner A property_owners record
  insert into public.property_owners (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled, onboarding_status)
  values (v_owner_a_user_id, 'acct_smoke_owner_a', 'sole_prop', 'Anderson Properties LLC', true, true, 'completed')
  on conflict (user_id) do update set business_name = excluded.business_name, updated_at = now()
  returning id into v_owner_a_po_id;

  -- Create Tenant A user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values ('tenant-a@test.com', 'Tom Thompson', 'Tom', 'Thompson', 'TENANT', '+15552001001', 'active')
  on conflict (email) do update set full_name = excluded.full_name, updated_at = now()
  returning id into v_tenant_a_user_id;

  -- Create Tenant A profile
  insert into public.tenants (user_id, identity_verified, emergency_contact_name, emergency_contact_phone)
  values (v_tenant_a_user_id, true, 'Jane Thompson', '+15552001002')
  on conflict (user_id) do update set identity_verified = excluded.identity_verified
  returning id into v_tenant_a_id;

  -- Create Property A1
  insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
  values (v_owner_a_po_id, 'Sunset Apartments', '100 Sunset Blvd', 'Los Angeles', 'CA', '90001', 'residential', 'active')
  on conflict on constraint properties_pkey do nothing
  returning id into v_property_a1_id;
  if v_property_a1_id is null then
    select id into v_property_a1_id from public.properties where property_owner_id = v_owner_a_po_id and name = 'Sunset Apartments' limit 1;
  end if;

  -- Create Property A2
  insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
  values (v_owner_a_po_id, 'Downtown Office Plaza', '200 Main Street', 'Los Angeles', 'CA', '90002', 'commercial', 'active')
  on conflict on constraint properties_pkey do nothing;

  -- Create Units for Property A1
  insert into public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
  values
    (v_property_a1_id, v_owner_a_po_id, 'A101', 2, 1.0, 850, 180000, 'occupied'),
    (v_property_a1_id, v_owner_a_po_id, 'A102', 3, 2.0, 1200, 240000, 'available')
  on conflict on constraint units_pkey do nothing;

  select id into v_unit_a1_id from public.units where property_id = v_property_a1_id and unit_number = 'A101' limit 1;

  -- Create active lease for Tenant A
  insert into public.leases (unit_id, primary_tenant_id, property_owner_id, start_date, end_date, rent_amount, security_deposit, payment_day, lease_status, owner_signed_at, tenant_signed_at)
  values (v_unit_a1_id, v_tenant_a_id, v_owner_a_po_id, current_date - interval '6 months', current_date + interval '6 months', 180000, 180000, 1, 'active', current_timestamp - interval '6 months', current_timestamp - interval '6 months' + interval '1 day')
  on conflict on constraint leases_pkey do nothing;

  -- Create maintenance requests
  insert into public.maintenance_requests (unit_id, tenant_id, property_owner_id, title, description, status, priority, requested_by, created_at)
  values
    (v_unit_a1_id, v_tenant_a_id, v_owner_a_po_id, 'Leaky Kitchen Faucet', 'Kitchen sink faucet is dripping constantly', 'open', 'normal', v_tenant_a_user_id, now() - interval '2 days'),
    (v_unit_a1_id, v_tenant_a_id, v_owner_a_po_id, 'HVAC Filter Replacement', 'Annual HVAC maintenance completed', 'completed', 'low', v_tenant_a_user_id, now() - interval '30 days')
  on conflict on constraint maintenance_requests_pkey do nothing;

  update public.maintenance_requests set completed_at = created_at + interval '2 days' where status = 'completed' and property_owner_id = v_owner_a_po_id and completed_at is null;

  raise notice '✓ Owner A seeded';
end $$;

-- OWNER B
do $$
declare
  v_owner_b_user_id uuid;
  v_owner_b_po_id uuid;
  v_tenant_b_user_id uuid;
  v_tenant_b_id uuid;
  v_property_b1_id uuid;
  v_unit_b1_id uuid;
begin
  -- Create Owner B user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values ('owner-b@test.com', 'Bob Baker', 'Bob', 'Baker', 'OWNER', '+15551002002', 'active')
  on conflict (email) do update set full_name = excluded.full_name, updated_at = now()
  returning id into v_owner_b_user_id;

  -- Create Owner B property_owners record
  insert into public.property_owners (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled, onboarding_status)
  values (v_owner_b_user_id, 'acct_smoke_owner_b', 'llc', 'Baker Realty Group', true, true, 'completed')
  on conflict (user_id) do update set business_name = excluded.business_name, updated_at = now()
  returning id into v_owner_b_po_id;

  -- Create Tenant B user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values ('tenant-b@test.com', 'Sarah Smith', 'Sarah', 'Smith', 'TENANT', '+15552002002', 'active')
  on conflict (email) do update set full_name = excluded.full_name, updated_at = now()
  returning id into v_tenant_b_user_id;

  -- Create Tenant B profile
  insert into public.tenants (user_id, identity_verified, emergency_contact_name, emergency_contact_phone)
  values (v_tenant_b_user_id, true, 'Mike Smith', '+15552002003')
  on conflict (user_id) do update set identity_verified = excluded.identity_verified
  returning id into v_tenant_b_id;

  -- Create Property B1
  insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
  values (v_owner_b_po_id, 'Oak Tree Condos', '300 Oak Lane', 'San Francisco', 'CA', '94102', 'residential', 'active')
  on conflict on constraint properties_pkey do nothing
  returning id into v_property_b1_id;
  if v_property_b1_id is null then
    select id into v_property_b1_id from public.properties where property_owner_id = v_owner_b_po_id and name = 'Oak Tree Condos' limit 1;
  end if;

  -- Create Property B2
  insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
  values (v_owner_b_po_id, 'Market Street Complex', '400 Market Street', 'San Francisco', 'CA', '94103', 'mixed_use', 'active')
  on conflict on constraint properties_pkey do nothing;

  -- Create Units for Property B1
  insert into public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
  values
    (v_property_b1_id, v_owner_b_po_id, 'B101', 1, 1.0, 650, 150000, 'occupied'),
    (v_property_b1_id, v_owner_b_po_id, 'B102', 2, 1.5, 950, 200000, 'available')
  on conflict on constraint units_pkey do nothing;

  select id into v_unit_b1_id from public.units where property_id = v_property_b1_id and unit_number = 'B101' limit 1;

  -- Create active lease for Tenant B
  insert into public.leases (unit_id, primary_tenant_id, property_owner_id, start_date, end_date, rent_amount, security_deposit, payment_day, lease_status, owner_signed_at, tenant_signed_at)
  values (v_unit_b1_id, v_tenant_b_id, v_owner_b_po_id, current_date - interval '3 months', current_date + interval '9 months', 150000, 150000, 1, 'active', current_timestamp - interval '3 months', current_timestamp - interval '3 months' + interval '2 days')
  on conflict on constraint leases_pkey do nothing;

  -- Create maintenance request
  insert into public.maintenance_requests (unit_id, tenant_id, property_owner_id, title, description, status, priority, requested_by, created_at)
  values (v_unit_b1_id, v_tenant_b_id, v_owner_b_po_id, 'Broken Window Latch', 'Bedroom window latch is broken', 'in_progress', 'high', v_tenant_b_user_id, now() - interval '5 days')
  on conflict on constraint maintenance_requests_pkey do nothing;

  raise notice '✓ Owner B seeded';
end $$;

-- Verification summary
do $$
declare
  v_user_count int;
  v_property_count int;
  v_unit_count int;
  v_lease_count int;
begin
  select count(*) into v_user_count from public.users where email like '%@test.com';
  select count(*) into v_property_count from public.properties;
  select count(*) into v_unit_count from public.units;
  select count(*) into v_lease_count from public.leases;

  raise notice '========================================';
  raise notice 'SMOKE SEED COMPLETE';
  raise notice '========================================';
  raise notice 'Users: %, Properties: %, Units: %, Leases: %', v_user_count, v_property_count, v_unit_count, v_lease_count;
  raise notice '';
  raise notice 'For more data, run:';
  raise notice '  pnpm db:seed:dev   - Development (realistic)';
  raise notice '  pnpm db:seed:perf  - Performance (load testing)';
  raise notice '========================================';
end $$;
