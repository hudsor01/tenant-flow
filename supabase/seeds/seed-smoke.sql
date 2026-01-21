-- ========================================
-- TenantFlow Seed Smoke - CI Fast (<5 seconds)
-- ========================================
-- Purpose: Minimal seed data for CI pipelines and quick testing
-- Provides: 2 owners, 2 tenants, 4 properties, 8 units, RLS isolation test data
--
-- Usage: psql $DATABASE_URL -f supabase/seeds/seed-smoke.sql
-- Requires: seed-common.sql must be run first
--
-- Version: smoke-v1.0.0

-- Track seed version (idempotent)
insert into public.seed_versions (version, tier, notes)
values ('smoke-v1.0.0', 'smoke', 'Minimal CI seed: 2 owners, 2 tenants, 4 properties, 8 units')
on conflict (version) do update
set applied_at = now(),
    notes = excluded.notes;

-- ============================================================================
-- OWNER A - First property owner for RLS isolation testing
-- ============================================================================

do $$
declare
  v_owner_a_user_id uuid;
  v_owner_a_po_id uuid;
  v_tenant_a_user_id uuid;
  v_tenant_a_id uuid;
  v_property_a1_id uuid;
  v_property_a2_id uuid;
  v_unit_a1_id uuid;
  v_unit_a2_id uuid;
  v_unit_a3_id uuid;
  v_unit_a4_id uuid;
begin
  -- Create Owner A user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values (
    'owner-a@test.com',
    'Alice Anderson',
    'Alice',
    'Anderson',
    'OWNER',
    '+15551001001',
    'active'
  )
  on conflict (email) do update
  set full_name = excluded.full_name,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      updated_at = now()
  returning id into v_owner_a_user_id;

  -- Create Owner A property_owners record
  insert into public.property_owners (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled, onboarding_status)
  values (
    v_owner_a_user_id,
    'acct_smoke_owner_a',
    'sole_prop',
    'Anderson Properties LLC',
    true,
    true,
    'completed'
  )
  on conflict (user_id) do update
  set business_name = excluded.business_name,
      updated_at = now()
  returning id into v_owner_a_po_id;

  -- Create Tenant A user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values (
    'tenant-a@test.com',
    'Tom Thompson',
    'Tom',
    'Thompson',
    'TENANT',
    '+15552001001',
    'active'
  )
  on conflict (email) do update
  set full_name = excluded.full_name,
      updated_at = now()
  returning id into v_tenant_a_user_id;

  -- Create Tenant A profile
  insert into public.tenants (user_id, identity_verified, emergency_contact_name, emergency_contact_phone)
  values (
    v_tenant_a_user_id,
    true,
    'Jane Thompson',
    '+15552001002'
  )
  on conflict (user_id) do update
  set identity_verified = excluded.identity_verified
  returning id into v_tenant_a_id;

  -- Create Property A1 (Residential)
  insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
  values (
    v_owner_a_po_id,
    'Sunset Apartments',
    '100 Sunset Blvd',
    'Los Angeles',
    'CA',
    '90001',
    'residential',
    'active'
  )
  on conflict on constraint properties_pkey do nothing
  returning id into v_property_a1_id;

  -- Get property ID if it already exists
  if v_property_a1_id is null then
    select id into v_property_a1_id
    from public.properties
    where property_owner_id = v_owner_a_po_id and name = 'Sunset Apartments'
    limit 1;
  end if;

  -- Create Property A2 (Commercial)
  insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
  values (
    v_owner_a_po_id,
    'Downtown Office Plaza',
    '200 Main Street',
    'Los Angeles',
    'CA',
    '90002',
    'commercial',
    'active'
  )
  on conflict on constraint properties_pkey do nothing
  returning id into v_property_a2_id;

  if v_property_a2_id is null then
    select id into v_property_a2_id
    from public.properties
    where property_owner_id = v_owner_a_po_id and name = 'Downtown Office Plaza'
    limit 1;
  end if;

  -- Create Units for Property A1
  insert into public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
  values
    (v_property_a1_id, v_owner_a_po_id, 'A101', 2, 1.0, 850, 180000, 'occupied'),
    (v_property_a1_id, v_owner_a_po_id, 'A102', 3, 2.0, 1200, 240000, 'available')
  on conflict on constraint units_pkey do nothing;

  -- Get unit IDs
  select id into v_unit_a1_id from public.units where property_id = v_property_a1_id and unit_number = 'A101' limit 1;
  select id into v_unit_a2_id from public.units where property_id = v_property_a1_id and unit_number = 'A102' limit 1;

  -- Create Units for Property A2
  insert into public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
  values
    (v_property_a2_id, v_owner_a_po_id, 'Suite 100', 0, 1.0, 2000, 500000, 'available'),
    (v_property_a2_id, v_owner_a_po_id, 'Suite 200', 0, 1.0, 3000, 750000, 'available')
  on conflict on constraint units_pkey do nothing;

  select id into v_unit_a3_id from public.units where property_id = v_property_a2_id and unit_number = 'Suite 100' limit 1;
  select id into v_unit_a4_id from public.units where property_id = v_property_a2_id and unit_number = 'Suite 200' limit 1;

  -- Create active lease for Tenant A in Unit A1
  insert into public.leases (
    unit_id, primary_tenant_id, property_owner_id,
    start_date, end_date, rent_amount, security_deposit,
    payment_day, lease_status,
    owner_signed_at, tenant_signed_at
  )
  values (
    v_unit_a1_id, v_tenant_a_id, v_owner_a_po_id,
    current_date - interval '6 months',
    current_date + interval '6 months',
    180000, 180000,
    1, 'active',
    current_timestamp - interval '6 months',
    current_timestamp - interval '6 months' + interval '1 day'
  )
  on conflict on constraint leases_pkey do nothing;

  -- Create lease_tenants link
  insert into public.lease_tenants (lease_id, tenant_id, is_primary, responsibility_percentage)
  select l.id, v_tenant_a_id, true, 100
  from public.leases l
  where l.unit_id = v_unit_a1_id and l.primary_tenant_id = v_tenant_a_id
  on conflict on constraint lease_tenants_pkey do nothing;

  -- Create maintenance requests for Owner A
  insert into public.maintenance_requests (
    unit_id, tenant_id, property_owner_id,
    title, description, status, priority,
    requested_by, created_at
  )
  values
    (v_unit_a1_id, v_tenant_a_id, v_owner_a_po_id, 'Leaky Kitchen Faucet', 'Kitchen sink faucet is dripping constantly', 'open', 'normal', v_tenant_a_user_id, now() - interval '2 days'),
    (v_unit_a1_id, v_tenant_a_id, v_owner_a_po_id, 'HVAC Filter Replacement', 'Annual HVAC maintenance completed', 'completed', 'low', v_tenant_a_user_id, now() - interval '30 days')
  on conflict on constraint maintenance_requests_pkey do nothing;

  -- Mark completed request
  update public.maintenance_requests
  set completed_at = created_at + interval '2 days'
  where status = 'completed' and property_owner_id = v_owner_a_po_id and completed_at is null;

  raise notice '✓ Owner A seeded: user_id=%, po_id=%', v_owner_a_user_id, v_owner_a_po_id;
end $$;

-- ============================================================================
-- OWNER B - Second property owner for RLS isolation testing
-- ============================================================================

do $$
declare
  v_owner_b_user_id uuid;
  v_owner_b_po_id uuid;
  v_tenant_b_user_id uuid;
  v_tenant_b_id uuid;
  v_property_b1_id uuid;
  v_property_b2_id uuid;
  v_unit_b1_id uuid;
  v_unit_b2_id uuid;
  v_unit_b3_id uuid;
  v_unit_b4_id uuid;
begin
  -- Create Owner B user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values (
    'owner-b@test.com',
    'Bob Baker',
    'Bob',
    'Baker',
    'OWNER',
    '+15551002002',
    'active'
  )
  on conflict (email) do update
  set full_name = excluded.full_name,
      updated_at = now()
  returning id into v_owner_b_user_id;

  -- Create Owner B property_owners record
  insert into public.property_owners (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled, onboarding_status)
  values (
    v_owner_b_user_id,
    'acct_smoke_owner_b',
    'llc',
    'Baker Realty Group',
    true,
    true,
    'completed'
  )
  on conflict (user_id) do update
  set business_name = excluded.business_name,
      updated_at = now()
  returning id into v_owner_b_po_id;

  -- Create Tenant B user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values (
    'tenant-b@test.com',
    'Sarah Smith',
    'Sarah',
    'Smith',
    'TENANT',
    '+15552002002',
    'active'
  )
  on conflict (email) do update
  set full_name = excluded.full_name,
      updated_at = now()
  returning id into v_tenant_b_user_id;

  -- Create Tenant B profile
  insert into public.tenants (user_id, identity_verified, emergency_contact_name, emergency_contact_phone)
  values (
    v_tenant_b_user_id,
    true,
    'Mike Smith',
    '+15552002003'
  )
  on conflict (user_id) do update
  set identity_verified = excluded.identity_verified
  returning id into v_tenant_b_id;

  -- Create Property B1 (Residential)
  insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
  values (
    v_owner_b_po_id,
    'Oak Tree Condos',
    '300 Oak Lane',
    'San Francisco',
    'CA',
    '94102',
    'residential',
    'active'
  )
  on conflict on constraint properties_pkey do nothing
  returning id into v_property_b1_id;

  if v_property_b1_id is null then
    select id into v_property_b1_id
    from public.properties
    where property_owner_id = v_owner_b_po_id and name = 'Oak Tree Condos'
    limit 1;
  end if;

  -- Create Property B2 (Mixed Use)
  insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
  values (
    v_owner_b_po_id,
    'Market Street Complex',
    '400 Market Street',
    'San Francisco',
    'CA',
    '94103',
    'mixed_use',
    'active'
  )
  on conflict on constraint properties_pkey do nothing
  returning id into v_property_b2_id;

  if v_property_b2_id is null then
    select id into v_property_b2_id
    from public.properties
    where property_owner_id = v_owner_b_po_id and name = 'Market Street Complex'
    limit 1;
  end if;

  -- Create Units for Property B1
  insert into public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
  values
    (v_property_b1_id, v_owner_b_po_id, 'B101', 1, 1.0, 650, 150000, 'occupied'),
    (v_property_b1_id, v_owner_b_po_id, 'B102', 2, 1.5, 950, 200000, 'available')
  on conflict on constraint units_pkey do nothing;

  select id into v_unit_b1_id from public.units where property_id = v_property_b1_id and unit_number = 'B101' limit 1;
  select id into v_unit_b2_id from public.units where property_id = v_property_b1_id and unit_number = 'B102' limit 1;

  -- Create Units for Property B2
  insert into public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
  values
    (v_property_b2_id, v_owner_b_po_id, 'Retail 1', 0, 1.0, 1500, 400000, 'available'),
    (v_property_b2_id, v_owner_b_po_id, 'Apt 2A', 2, 1.0, 1100, 280000, 'available')
  on conflict on constraint units_pkey do nothing;

  select id into v_unit_b3_id from public.units where property_id = v_property_b2_id and unit_number = 'Retail 1' limit 1;
  select id into v_unit_b4_id from public.units where property_id = v_property_b2_id and unit_number = 'Apt 2A' limit 1;

  -- Create active lease for Tenant B in Unit B1
  insert into public.leases (
    unit_id, primary_tenant_id, property_owner_id,
    start_date, end_date, rent_amount, security_deposit,
    payment_day, lease_status,
    owner_signed_at, tenant_signed_at
  )
  values (
    v_unit_b1_id, v_tenant_b_id, v_owner_b_po_id,
    current_date - interval '3 months',
    current_date + interval '9 months',
    150000, 150000,
    1, 'active',
    current_timestamp - interval '3 months',
    current_timestamp - interval '3 months' + interval '2 days'
  )
  on conflict on constraint leases_pkey do nothing;

  -- Create lease_tenants link
  insert into public.lease_tenants (lease_id, tenant_id, is_primary, responsibility_percentage)
  select l.id, v_tenant_b_id, true, 100
  from public.leases l
  where l.unit_id = v_unit_b1_id and l.primary_tenant_id = v_tenant_b_id
  on conflict on constraint lease_tenants_pkey do nothing;

  -- Create maintenance request for Owner B
  insert into public.maintenance_requests (
    unit_id, tenant_id, property_owner_id,
    title, description, status, priority,
    requested_by, created_at
  )
  values
    (v_unit_b1_id, v_tenant_b_id, v_owner_b_po_id, 'Broken Window Latch', 'Bedroom window latch is broken', 'in_progress', 'high', v_tenant_b_user_id, now() - interval '5 days')
  on conflict on constraint maintenance_requests_pkey do nothing;

  raise notice '✓ Owner B seeded: user_id=%, po_id=%', v_owner_b_user_id, v_owner_b_po_id;
end $$;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

do $$
declare
  v_user_count int;
  v_owner_count int;
  v_tenant_count int;
  v_property_count int;
  v_unit_count int;
  v_lease_count int;
  v_mr_count int;
begin
  select count(*) into v_user_count from public.users where email like '%@test.com';
  select count(*) into v_owner_count from public.property_owners where stripe_account_id like 'acct_smoke%';
  select count(*) into v_tenant_count from public.tenants;
  select count(*) into v_property_count from public.properties;
  select count(*) into v_unit_count from public.units;
  select count(*) into v_lease_count from public.leases;
  select count(*) into v_mr_count from public.maintenance_requests;

  raise notice '========================================';
  raise notice 'SMOKE SEED SUMMARY';
  raise notice '========================================';
  raise notice 'Users (test):     %', v_user_count;
  raise notice 'Property Owners:  %', v_owner_count;
  raise notice 'Tenants:          %', v_tenant_count;
  raise notice 'Properties:       %', v_property_count;
  raise notice 'Units:            %', v_unit_count;
  raise notice 'Leases:           %', v_lease_count;
  raise notice 'Maintenance:      %', v_mr_count;
  raise notice '========================================';
  raise notice '✓ Smoke seed completed successfully';
end $$;
