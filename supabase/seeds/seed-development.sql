-- ========================================
-- TenantFlow Seed Development - Realistic Local Dev
-- ========================================
-- Purpose: Realistic seed data for local development and feature testing
-- Provides: 10 owners, 50 tenants, varied properties/units, 24-month temporal distribution
--
-- Usage: psql $DATABASE_URL -f supabase/seeds/seed-development.sql
-- Requires: seed-common.sql must be run first
--
-- Version: development-v1.0.0

-- Track seed version (idempotent)
insert into public.seed_versions (version, tier, notes)
values ('development-v1.0.0', 'development', 'Realistic dev seed: 10 owners, 50 tenants, 24-month history')
on conflict (version) do update
set applied_at = now(),
    notes = excluded.notes;

-- ============================================================================
-- GENERATE OWNER USERS (10 total)
-- ============================================================================

do $$
declare
  v_owner_user_id uuid;
  v_owner_po_id uuid;
  v_first_names text[] := ARRAY['Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Patricia', 'William', 'Elizabeth', 'James', 'Mary'];
  v_last_names text[] := ARRAY['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez'];
  v_business_types text[] := ARRAY['sole_prop', 'llc', 'corporation', 'partnership'];
  v_cities text[] := ARRAY['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Oakland', 'San Jose', 'Fresno', 'Long Beach', 'Bakersfield', 'Anaheim'];
  v_states text[] := ARRAY['CA', 'CA', 'CA', 'CA', 'CA', 'CA', 'CA', 'CA', 'CA', 'CA'];
  v_property_types text[] := ARRAY['residential', 'commercial', 'mixed_use', 'industrial'];
  i int;
  j int;
  k int;
  v_property_id uuid;
  v_unit_id uuid;
  v_num_properties int;
  v_num_units int;
begin
  for i in 1..10 loop
    -- Create owner user
    insert into public.users (
      email, full_name, first_name, last_name, user_type, phone, status,
      created_at
    )
    values (
      'owner-' || i || '@dev.tenantflow.test',
      v_first_names[i] || ' ' || v_last_names[i],
      v_first_names[i],
      v_last_names[i],
      'OWNER',
      public.seed_random_phone(),
      'active',
      public.seed_random_date(18) -- Created within last 18 months
    )
    on conflict (email) do update
    set full_name = excluded.full_name,
        updated_at = now()
    returning id into v_owner_user_id;

    -- Create property_owners record
    insert into public.property_owners (
      user_id, stripe_account_id, business_type, business_name,
      charges_enabled, payouts_enabled, onboarding_status,
      created_at
    )
    values (
      v_owner_user_id,
      'acct_dev_owner_' || i,
      v_business_types[1 + (i % 4)],
      v_last_names[i] || ' ' || public.seed_random_choice(ARRAY['Properties', 'Realty', 'Holdings', 'Investments', 'Management']),
      i <= 8, -- 80% have charges enabled
      i <= 7, -- 70% have payouts enabled
      case when i <= 8 then 'completed' else 'in_progress' end,
      public.seed_random_date(18)
    )
    on conflict (user_id) do update
    set business_name = excluded.business_name,
        updated_at = now()
    returning id into v_owner_po_id;

    -- Each owner gets 5-15 properties (varied)
    v_num_properties := 5 + (i % 11); -- 5-15 properties per owner

    for j in 1..v_num_properties loop
      insert into public.properties (
        property_owner_id, name, address_line1, city, state, postal_code,
        property_type, status, created_at
      )
      values (
        v_owner_po_id,
        public.seed_random_choice(ARRAY['Sunset', 'Oak', 'Cedar', 'Pine', 'Maple', 'Elm', 'Birch', 'Willow']) || ' ' ||
        public.seed_random_choice(ARRAY['Apartments', 'Condos', 'Towers', 'Plaza', 'Complex', 'Estate', 'Gardens', 'Heights']),
        public.seed_random_address(),
        v_cities[1 + ((i + j) % 10)],
        'CA',
        (90000 + (i * 100) + j)::text,
        v_property_types[1 + ((i + j) % 4)],
        case when random() < 0.9 then 'active' else 'inactive' end,
        public.seed_random_date(24)
      )
      on conflict on constraint properties_pkey do nothing
      returning id into v_property_id;

      -- Skip if property creation failed (already exists)
      continue when v_property_id is null;

      -- Each property gets 1-10 units
      v_num_units := 1 + (j % 10); -- 1-10 units per property

      for k in 1..v_num_units loop
        insert into public.units (
          property_id, property_owner_id, unit_number,
          bedrooms, bathrooms, square_feet, rent_amount, status,
          created_at
        )
        values (
          v_property_id,
          v_owner_po_id,
          case
            when k <= 9 then chr(64 + ((j - 1) % 26) + 1) || '0' || k
            else chr(64 + ((j - 1) % 26) + 1) || k
          end,
          public.seed_random_int(0, 4), -- 0-4 bedrooms
          (public.seed_random_int(1, 3))::numeric(3,1), -- 1-3 bathrooms
          public.seed_random_int(500, 2500), -- 500-2500 sqft
          public.seed_random_int(100000, 500000), -- $1000-$5000 rent in cents
          public.seed_random_choice(ARRAY['available', 'occupied', 'maintenance']),
          public.seed_random_date(24)
        )
        on conflict on constraint units_pkey do nothing;
      end loop;
    end loop;

    raise notice '✓ Owner % seeded: % with % properties', i, v_first_names[i] || ' ' || v_last_names[i], v_num_properties;
  end loop;
end $$;

-- ============================================================================
-- GENERATE TENANT USERS (50 total)
-- ============================================================================

do $$
declare
  v_tenant_user_id uuid;
  v_tenant_id uuid;
  v_first_names text[] := ARRAY['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Sophia', 'Elijah', 'Isabella', 'Lucas',
                                 'Mia', 'Mason', 'Charlotte', 'Logan', 'Amelia', 'Alexander', 'Harper', 'Ethan', 'Evelyn', 'Jacob',
                                 'Abigail', 'Michael', 'Emily', 'Benjamin', 'Ella', 'William', 'Avery', 'James', 'Scarlett', 'Daniel',
                                 'Grace', 'Henry', 'Chloe', 'Sebastian', 'Victoria', 'Aiden', 'Riley', 'Matthew', 'Aria', 'Jackson',
                                 'Luna', 'David', 'Zoey', 'Joseph', 'Penelope', 'Carter', 'Layla', 'Owen', 'Nora', 'Wyatt'];
  v_last_names text[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                                'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                                'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
                                'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
                                'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
  i int;
begin
  for i in 1..50 loop
    -- Create tenant user
    insert into public.users (
      email, full_name, first_name, last_name, user_type, phone, status,
      created_at
    )
    values (
      'tenant-' || i || '@dev.tenantflow.test',
      v_first_names[i] || ' ' || v_last_names[i],
      v_first_names[i],
      v_last_names[i],
      'TENANT',
      public.seed_random_phone(),
      'active',
      public.seed_random_date(24)
    )
    on conflict (email) do update
    set full_name = excluded.full_name,
        updated_at = now()
    returning id into v_tenant_user_id;

    -- Create tenant profile
    insert into public.tenants (
      user_id, identity_verified,
      emergency_contact_name, emergency_contact_phone,
      created_at
    )
    values (
      v_tenant_user_id,
      random() < 0.85, -- 85% verified
      v_first_names[1 + (i % 50)] || ' ' || v_last_names[1 + (i % 50)],
      public.seed_random_phone(),
      public.seed_random_date(24)
    )
    on conflict (user_id) do update
    set identity_verified = excluded.identity_verified
    returning id into v_tenant_id;
  end loop;

  raise notice '✓ 50 tenant users seeded';
end $$;

-- ============================================================================
-- CREATE LEASES (spanning 24 months - past, current, future)
-- ============================================================================

do $$
declare
  v_available_units cursor for
    select u.id as unit_id, u.property_owner_id, u.rent_amount
    from public.units u
    inner join public.property_owners po on u.property_owner_id = po.id
    where po.stripe_account_id like 'acct_dev%'
    order by random()
    limit 60; -- Create 60 leases
  v_tenants cursor for
    select t.id as tenant_id, t.user_id
    from public.tenants t
    inner join public.users u on t.user_id = u.id
    where u.email like 'tenant-%@dev.tenantflow.test'
    order by random();
  v_unit record;
  v_tenant record;
  v_lease_id uuid;
  v_start_date date;
  v_end_date date;
  v_lease_status text;
  v_counter int := 0;
begin
  open v_tenants;

  for v_unit in v_available_units loop
    fetch v_tenants into v_tenant;
    exit when not found;

    -- Distribute leases across time: 30% past, 50% current, 20% future
    v_counter := v_counter + 1;

    if v_counter % 10 <= 2 then
      -- Past leases (ended)
      v_start_date := current_date - interval '24 months' + (random() * 12) * interval '1 month';
      v_end_date := v_start_date + interval '12 months';
      v_lease_status := 'ended';
    elsif v_counter % 10 <= 7 then
      -- Current leases (active)
      v_start_date := current_date - (random() * 11) * interval '1 month';
      v_end_date := v_start_date + interval '12 months';
      v_lease_status := 'active';
    else
      -- Future leases (pending signature)
      v_start_date := current_date + (random() * 3) * interval '1 month';
      v_end_date := v_start_date + interval '12 months';
      v_lease_status := 'pending_signature';
    end if;

    -- Create lease
    insert into public.leases (
      unit_id, primary_tenant_id, property_owner_id,
      start_date, end_date, rent_amount, security_deposit,
      payment_day, lease_status,
      owner_signed_at, tenant_signed_at,
      created_at
    )
    values (
      v_unit.unit_id,
      v_tenant.tenant_id,
      v_unit.property_owner_id,
      v_start_date,
      v_end_date,
      v_unit.rent_amount,
      v_unit.rent_amount,
      public.seed_random_int(1, 28),
      v_lease_status,
      case when v_lease_status in ('active', 'ended') then v_start_date - interval '7 days' else null end,
      case when v_lease_status in ('active', 'ended') then v_start_date - interval '5 days' else null end,
      v_start_date - interval '14 days'
    )
    on conflict on constraint leases_pkey do nothing
    returning id into v_lease_id;

    -- Create lease_tenants link
    if v_lease_id is not null then
      insert into public.lease_tenants (lease_id, tenant_id, is_primary, responsibility_percentage)
      values (v_lease_id, v_tenant.tenant_id, true, 100)
      on conflict on constraint lease_tenants_pkey do nothing;

      -- Update unit status based on lease
      if v_lease_status = 'active' then
        update public.units set status = 'occupied' where id = v_unit.unit_id;
      end if;
    end if;
  end loop;

  close v_tenants;

  raise notice '✓ 60 leases created with temporal distribution';
end $$;

-- ============================================================================
-- CREATE MAINTENANCE REQUESTS (realistic distribution)
-- Status distribution: 30% open, 20% in_progress, 40% completed, 10% cancelled
-- ============================================================================

do $$
declare
  v_lease record;
  v_status text;
  v_priority text;
  v_created_at timestamptz;
  v_titles text[] := ARRAY[
    'Leaking faucet', 'Broken doorknob', 'AC not working', 'Heater not working',
    'Toilet running', 'Garbage disposal broken', 'Smoke detector beeping',
    'Window stuck', 'Door lock issue', 'Light fixture broken',
    'Outlet not working', 'Refrigerator making noise', 'Dishwasher leak',
    'Ceiling stain', 'Pest control needed', 'Water heater issue',
    'Garage door broken', 'Fence damage', 'Landscaping needed', 'Parking issue'
  ];
  v_descriptions text[] := ARRAY[
    'Please fix as soon as possible',
    'This has been an issue for a few days',
    'Not urgent but would like it addressed',
    'Causing inconvenience, please schedule a visit',
    'Safety concern, needs immediate attention'
  ];
  i int;
  v_mr_count int := 0;
begin
  -- Create 3-5 maintenance requests per active/ended lease
  for v_lease in
    select l.id as lease_id, l.unit_id, l.primary_tenant_id, l.property_owner_id,
           t.user_id as tenant_user_id, l.start_date, l.lease_status
    from public.leases l
    inner join public.tenants t on l.primary_tenant_id = t.id
    inner join public.property_owners po on l.property_owner_id = po.id
    where po.stripe_account_id like 'acct_dev%'
      and l.lease_status in ('active', 'ended')
  loop
    for i in 1..public.seed_random_int(3, 5) loop
      -- Random status with realistic distribution
      v_status := public.seed_random_choice(ARRAY[
        'open', 'open', 'open',                    -- 30% open
        'in_progress', 'in_progress',              -- 20% in_progress
        'completed', 'completed', 'completed', 'completed', -- 40% completed
        'cancelled'                                -- 10% cancelled
      ]);

      -- Priority based on title patterns
      v_priority := public.seed_random_choice(ARRAY[
        'low', 'low',
        'normal', 'normal', 'normal', 'normal',
        'high', 'high',
        'urgent'
      ]);

      -- Created within lease period
      v_created_at := v_lease.start_date + (random() *
        least(365, (current_date - v_lease.start_date::date))
      ) * interval '1 day';

      insert into public.maintenance_requests (
        unit_id, tenant_id, property_owner_id,
        title, description, status, priority,
        requested_by, created_at, completed_at
      )
      values (
        v_lease.unit_id,
        v_lease.primary_tenant_id,
        v_lease.property_owner_id,
        v_titles[1 + floor(random() * array_length(v_titles, 1))::int],
        v_descriptions[1 + floor(random() * array_length(v_descriptions, 1))::int],
        v_status,
        v_priority,
        v_lease.tenant_user_id,
        v_created_at,
        case
          when v_status = 'completed' then v_created_at + (random() * 14) * interval '1 day'
          else null
        end
      )
      on conflict on constraint maintenance_requests_pkey do nothing;

      v_mr_count := v_mr_count + 1;
    end loop;
  end loop;

  raise notice '✓ % maintenance requests created', v_mr_count;
end $$;

-- ============================================================================
-- CREATE RENT PAYMENTS (for active leases)
-- ============================================================================

do $$
declare
  v_lease record;
  v_payment_date date;
  v_current_month date;
  v_payment_count int := 0;
begin
  for v_lease in
    select l.id as lease_id, l.unit_id, l.primary_tenant_id, l.property_owner_id,
           l.rent_amount, l.start_date, l.payment_day, l.lease_status,
           t.user_id as tenant_user_id
    from public.leases l
    inner join public.tenants t on l.primary_tenant_id = t.id
    inner join public.property_owners po on l.property_owner_id = po.id
    where po.stripe_account_id like 'acct_dev%'
      and l.lease_status = 'active'
    limit 30 -- Create payments for 30 active leases
  loop
    -- Generate payments from lease start to now
    v_current_month := date_trunc('month', v_lease.start_date)::date;

    while v_current_month <= date_trunc('month', current_date)::date loop
      v_payment_date := v_current_month + (v_lease.payment_day - 1) * interval '1 day';

      -- Skip if payment date is before lease start
      if v_payment_date >= v_lease.start_date and v_payment_date <= current_date then
        insert into public.rent_payments (
          lease_id, tenant_id, stripe_payment_intent_id,
          amount, currency, status, payment_method_type,
          period_start, period_end, due_date, paid_date,
          application_fee_amount, late_fee_amount,
          created_at
        )
        values (
          v_lease.lease_id,
          v_lease.primary_tenant_id,
          'pi_dev_' || v_lease.lease_id::text || '_' || to_char(v_payment_date, 'YYYYMM'),
          v_lease.rent_amount,
          'usd',
          case when random() < 0.95 then 'succeeded' else 'failed' end, -- 95% success rate
          public.seed_random_choice(ARRAY['card', 'us_bank_account', 'card']),
          v_current_month,
          (v_current_month + interval '1 month' - interval '1 day')::date,
          v_payment_date,
          v_payment_date + (random() * 5)::int * interval '1 day', -- Paid within 5 days of due
          (v_lease.rent_amount * 0.03)::int, -- 3% platform fee
          case when random() < 0.1 then (v_lease.rent_amount * 0.05)::int else 0 end, -- 10% have late fees
          v_payment_date
        )
        on conflict on constraint rent_payments_pkey do nothing;

        v_payment_count := v_payment_count + 1;
      end if;

      v_current_month := v_current_month + interval '1 month';
    end loop;
  end loop;

  raise notice '✓ % rent payments created', v_payment_count;
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
  v_payment_count int;
begin
  select count(*) into v_user_count from public.users where email like '%@dev.tenantflow.test';
  select count(*) into v_owner_count from public.property_owners where stripe_account_id like 'acct_dev%';
  select count(*) into v_tenant_count from public.tenants t inner join public.users u on t.user_id = u.id where u.email like 'tenant-%@dev.tenantflow.test';
  select count(*) into v_property_count from public.properties p inner join public.property_owners po on p.property_owner_id = po.id where po.stripe_account_id like 'acct_dev%';
  select count(*) into v_unit_count from public.units u inner join public.property_owners po on u.property_owner_id = po.id where po.stripe_account_id like 'acct_dev%';
  select count(*) into v_lease_count from public.leases l inner join public.property_owners po on l.property_owner_id = po.id where po.stripe_account_id like 'acct_dev%';
  select count(*) into v_mr_count from public.maintenance_requests mr inner join public.property_owners po on mr.property_owner_id = po.id where po.stripe_account_id like 'acct_dev%';
  select count(*) into v_payment_count from public.rent_payments rp inner join public.leases l on rp.lease_id = l.id inner join public.property_owners po on l.property_owner_id = po.id where po.stripe_account_id like 'acct_dev%';

  raise notice '========================================';
  raise notice 'DEVELOPMENT SEED SUMMARY';
  raise notice '========================================';
  raise notice 'Users (dev):      %', v_user_count;
  raise notice 'Property Owners:  %', v_owner_count;
  raise notice 'Tenants:          %', v_tenant_count;
  raise notice 'Properties:       %', v_property_count;
  raise notice 'Units:            %', v_unit_count;
  raise notice 'Leases:           %', v_lease_count;
  raise notice 'Maintenance:      %', v_mr_count;
  raise notice 'Rent Payments:    %', v_payment_count;
  raise notice '========================================';
  raise notice '✓ Development seed completed successfully';
end $$;
