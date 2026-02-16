-- ========================================
-- TenantFlow Seed Data - Minimal Test Data
-- ========================================
--
-- This seed file creates minimal test data for:
-- - E2E tests
-- - Local development
-- - CI pipelines
--
-- Created: 2026-02-15
-- Last Updated: 2026-02-15
-- ========================================

-- ============================================================================
-- PART 1: Test Users (for E2E tests)
-- ============================================================================

-- E2E Test Owner (matches E2E_OWNER_EMAIL in .env.test)
do $$
declare
  v_owner_test_user_id uuid;
  v_owner_test_id uuid;
begin
  -- Create test owner user in public.users
  insert into public.users (
    id,
    email,
    full_name,
    first_name,
    last_name,
    user_type,
    phone,
    status
  ) values (
    '11111111-1111-1111-1111-111111111111',
    'test-admin@tenantflow.app',
    'Test Admin',
    'Test',
    'Admin',
    'OWNER',
    '+15551234567',
    'active'
  )
  on conflict (email) do update
  set full_name = excluded.full_name,
      updated_at = now()
  returning id into v_owner_test_user_id;

  -- Create auth.users record (for authentication)
  -- Password is 'password123' (bcrypt hash with cost=10)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_owner_test_user_id,
    'authenticated',
    'authenticated',
    'test-admin@tenantflow.app',
    '$2a$10$rqiCKLjKkKvJxJWQxGjmO.F3a5NpXxD3/uX8FbKqE3IlD5jg6Kc5K',
    now(),
    null,
    now(),
    '{"provider":"email","providers":["email"],"user_type":"OWNER"}'::jsonb,
    '{"full_name":"Test Admin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update
  set encrypted_password = excluded.encrypted_password,
      email = excluded.email,
      updated_at = now();

  raise notice '✓ E2E test owner created: test-admin@tenantflow.app';
end $$;

-- ============================================================================
-- PART 2: Sample Data for Development
-- ============================================================================

-- Owner A: Alice Anderson
do $$
declare
  v_owner_a_user_id uuid;
  v_tenant_a_user_id uuid;
  v_tenant_a_id uuid;
  v_property_a1_id uuid;
  v_unit_a1_id uuid;
begin
  -- Create Owner A user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values ('owner-a@test.com', 'Alice Anderson', 'Alice', 'Anderson', 'OWNER', '+15551001001', 'active')
  on conflict (email) do update
  set full_name = excluded.full_name, updated_at = now()
  returning id into v_owner_a_user_id;

  -- Create Tenant A user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values ('tenant-a@test.com', 'John Doe', 'John', 'Doe', 'TENANT', '+15552001001', 'active')
  on conflict (email) do update
  set full_name = excluded.full_name, updated_at = now()
  returning id into v_tenant_a_user_id;

  -- Create Tenant A profile
  insert into public.tenants (user_id, identity_verified, emergency_contact_name, emergency_contact_phone)
  values (v_tenant_a_user_id, true, 'Jane Doe', '+15552001002')
  on conflict (user_id) do update
  set identity_verified = excluded.identity_verified
  returning id into v_tenant_a_id;

  -- Create Property A1
  insert into public.properties (owner_user_id, name, address_line1, city, state, postal_code, property_type, status)
  values (v_owner_a_user_id, 'Sunset Apartments', '100 Sunset Blvd', 'Los Angeles', 'CA', '90001', 'residential', 'active')
  on conflict on constraint properties_pkey do nothing
  returning id into v_property_a1_id;

  if v_property_a1_id is null then
    select id into v_property_a1_id
    from public.properties
    where owner_user_id = v_owner_a_user_id and name = 'Sunset Apartments'
    limit 1;
  end if;

  -- Create Property A2
  insert into public.properties (owner_user_id, name, address_line1, city, state, postal_code, property_type, status)
  values (v_owner_a_user_id, 'Downtown Office Plaza', '200 Main Street', 'Los Angeles', 'CA', '90002', 'commercial', 'active')
  on conflict on constraint properties_pkey do nothing;

  -- Create Units for Property A1
  insert into public.units (property_id, owner_user_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
  values
    (v_property_a1_id, v_owner_a_user_id, 'A101', 2, 1.0, 850, 180000, 'occupied'),
    (v_property_a1_id, v_owner_a_user_id, 'A102', 1, 1.0, 650, 140000, 'available'),
    (v_property_a1_id, v_owner_a_user_id, 'A103', 2, 2.0, 1000, 200000, 'available'),
    (v_property_a1_id, v_owner_a_user_id, 'A104', 3, 2.0, 1200, 250000, 'maintenance')
  on conflict on constraint units_pkey do nothing;

  select id into v_unit_a1_id
  from public.units
  where property_id = v_property_a1_id and unit_number = 'A101'
  limit 1;

  -- Create active lease for Tenant A
  insert into public.leases (
    unit_id,
    primary_tenant_id,
    owner_user_id,
    start_date,
    end_date,
    rent_amount,
    security_deposit,
    payment_day,
    lease_status,
    owner_signed_at,
    tenant_signed_at
  ) values (
    v_unit_a1_id,
    v_tenant_a_id,
    v_owner_a_user_id,
    current_date - interval '3 months',
    current_date + interval '9 months',
    180000,
    180000,
    1,
    'active',
    current_timestamp - interval '3 months',
    current_timestamp - interval '3 months' + interval '2 days'
  )
  on conflict on constraint leases_pkey do nothing;

  -- Create lease_tenants association
  insert into public.lease_tenants (lease_id, tenant_id, is_primary)
  select l.id, v_tenant_a_id, true
  from public.leases l
  where l.unit_id = v_unit_a1_id
  on conflict do nothing;

  -- Create maintenance request
  insert into public.maintenance_requests (
    unit_id,
    tenant_id,
    owner_user_id,
    title,
    description,
    status,
    priority,
    requested_by,
    created_at
  ) values (
    v_unit_a1_id,
    v_tenant_a_id,
    v_owner_a_user_id,
    'Leaky Faucet',
    'Kitchen faucet is dripping',
    'open',
    'medium',
    v_tenant_a_user_id,
    now() - interval '2 days'
  )
  on conflict on constraint maintenance_requests_pkey do nothing;

  raise notice '✓ Owner A (Alice Anderson) seeded';
end $$;

-- Owner B: Bob Baker
do $$
declare
  v_owner_b_user_id uuid;
  v_tenant_b_user_id uuid;
  v_tenant_b_id uuid;
  v_property_b1_id uuid;
  v_unit_b1_id uuid;
begin
  -- Create Owner B user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values ('owner-b@test.com', 'Bob Baker', 'Bob', 'Baker', 'OWNER', '+15551002002', 'active')
  on conflict (email) do update
  set full_name = excluded.full_name, updated_at = now()
  returning id into v_owner_b_user_id;

  -- Create Tenant B user
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status)
  values ('tenant-b@test.com', 'Sarah Smith', 'Sarah', 'Smith', 'TENANT', '+15552002002', 'active')
  on conflict (email) do update
  set full_name = excluded.full_name, updated_at = now()
  returning id into v_tenant_b_user_id;

  -- Create Tenant B profile
  insert into public.tenants (user_id, identity_verified, emergency_contact_name, emergency_contact_phone)
  values (v_tenant_b_user_id, true, 'Mike Smith', '+15552002003')
  on conflict (user_id) do update
  set identity_verified = excluded.identity_verified
  returning id into v_tenant_b_id;

  -- Create Property B1
  insert into public.properties (owner_user_id, name, address_line1, city, state, postal_code, property_type, status)
  values (v_owner_b_user_id, 'Oak Tree Condos', '300 Oak Lane', 'San Francisco', 'CA', '94102', 'residential', 'active')
  on conflict on constraint properties_pkey do nothing
  returning id into v_property_b1_id;

  if v_property_b1_id is null then
    select id into v_property_b1_id
    from public.properties
    where owner_user_id = v_owner_b_user_id and name = 'Oak Tree Condos'
    limit 1;
  end if;

  -- Create Property B2
  insert into public.properties (owner_user_id, name, address_line1, city, state, postal_code, property_type, status)
  values (v_owner_b_user_id, 'Market Street Complex', '400 Market Street', 'San Francisco', 'CA', '94103', 'mixed_use', 'active')
  on conflict on constraint properties_pkey do nothing;

  -- Create Units for Property B1
  insert into public.units (property_id, owner_user_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
  values
    (v_property_b1_id, v_owner_b_user_id, 'B101', 1, 1.0, 650, 150000, 'occupied'),
    (v_property_b1_id, v_owner_b_user_id, 'B102', 2, 1.5, 950, 200000, 'available')
  on conflict on constraint units_pkey do nothing;

  select id into v_unit_b1_id
  from public.units
  where property_id = v_property_b1_id and unit_number = 'B101'
  limit 1;

  -- Create active lease for Tenant B
  insert into public.leases (
    unit_id,
    primary_tenant_id,
    owner_user_id,
    start_date,
    end_date,
    rent_amount,
    security_deposit,
    payment_day,
    lease_status,
    owner_signed_at,
    tenant_signed_at
  ) values (
    v_unit_b1_id,
    v_tenant_b_id,
    v_owner_b_user_id,
    current_date - interval '3 months',
    current_date + interval '9 months',
    150000,
    150000,
    1,
    'active',
    current_timestamp - interval '3 months',
    current_timestamp - interval '3 months' + interval '2 days'
  )
  on conflict on constraint leases_pkey do nothing;

  -- Create lease_tenants association
  insert into public.lease_tenants (lease_id, tenant_id, is_primary)
  select l.id, v_tenant_b_id, true
  from public.leases l
  where l.unit_id = v_unit_b1_id
  on conflict do nothing;

  -- Create maintenance request
  insert into public.maintenance_requests (
    unit_id,
    tenant_id,
    owner_user_id,
    title,
    description,
    status,
    priority,
    requested_by,
    created_at
  ) values (
    v_unit_b1_id,
    v_tenant_b_id,
    v_owner_b_user_id,
    'Broken Window Latch',
    'Bedroom window latch is broken',
    'in_progress',
    'high',
    v_tenant_b_user_id,
    now() - interval '5 days'
  )
  on conflict on constraint maintenance_requests_pkey do nothing;

  raise notice '✓ Owner B (Bob Baker) seeded';
end $$;

-- ============================================================================
-- Summary
-- ============================================================================
do $$
declare
  v_user_count int;
  v_owner_count int;
  v_tenant_count int;
  v_property_count int;
  v_unit_count int;
  v_lease_count int;
  v_maintenance_count int;
begin
  select count(*) into v_user_count from public.users;
  select count(*) into v_owner_count from public.users where user_type = 'OWNER';
  select count(*) into v_tenant_count from public.tenants;
  select count(*) into v_property_count from public.properties;
  select count(*) into v_unit_count from public.units;
  select count(*) into v_lease_count from public.leases where lease_status = 'active';
  select count(*) into v_maintenance_count from public.maintenance_requests;

  raise notice '========================================';
  raise notice 'TenantFlow Seed Complete';
  raise notice '========================================';
  raise notice 'Users: %', v_user_count;
  raise notice '  - Owners: %', v_owner_count;
  raise notice '  - Tenants: %', v_tenant_count;
  raise notice 'Properties: %', v_property_count;
  raise notice 'Units: %', v_unit_count;
  raise notice 'Active Leases: %', v_lease_count;
  raise notice 'Maintenance Requests: %', v_maintenance_count;
  raise notice '========================================';
  raise notice 'E2E Test Account: test-admin@tenantflow.app / password123';
  raise notice '========================================';
end $$;
