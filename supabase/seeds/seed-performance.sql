-- ========================================
-- TenantFlow Seed Performance - Load Testing
-- ========================================
-- Purpose: Large-scale seed data for performance and load testing
-- Provides: 100 owners, 500 tenants, 1000+ properties, 5000+ units, 10000+ leases, 50000+ maintenance requests
--
-- Usage: psql $DATABASE_URL -f supabase/seeds/seed-performance.sql
-- Requires: seed-common.sql must be run first
-- Warning: This seed takes several minutes to complete
--
-- Version: performance-v1.0.0

-- Track seed version (idempotent)
insert into public.seed_versions (version, tier, notes)
values ('performance-v1.0.0', 'performance', 'Load test seed: 100 owners, 500 tenants, 1000+ properties, 50K+ records')
on conflict (version) do update
set applied_at = now(),
    notes = excluded.notes;

raise notice 'Starting performance seed generation...';
raise notice 'This will take several minutes.';

-- ============================================================================
-- GENERATE OWNER USERS (100 total) - BATCH INSERT
-- ============================================================================

do $$
declare
  v_batch_size int := 100;
  v_first_names text[] := ARRAY['Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Patricia', 'William', 'Elizabeth', 'James', 'Mary',
                                 'John', 'Linda', 'Richard', 'Susan', 'Charles', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Betty'];
  v_last_names text[] := ARRAY['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez',
                                'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee'];
  v_business_types text[] := ARRAY['sole_prop', 'llc', 'corporation', 'partnership'];
begin
  -- Batch insert owner users
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status, created_at)
  select
    'owner-perf-' || g || '@perf.tenantflow.test',
    v_first_names[1 + (g % 20)] || ' ' || v_last_names[1 + ((g + 5) % 20)],
    v_first_names[1 + (g % 20)],
    v_last_names[1 + ((g + 5) % 20)],
    'OWNER',
    '+1' || (200 + (g % 800))::text || (100 + (g % 900))::text || (1000 + (g % 9000))::text,
    'active',
    now() - (random() * 730) * interval '1 day' -- Last 2 years
  from generate_series(1, v_batch_size) as g
  on conflict (email) do nothing;

  -- Batch insert property_owners
  insert into public.property_owners (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled, onboarding_status, created_at)
  select
    u.id,
    'acct_perf_owner_' || row_number() over (order by u.email),
    v_business_types[1 + (row_number() over (order by u.email) % 4)],
    split_part(u.full_name, ' ', 2) || ' ' ||
    (ARRAY['Properties', 'Realty', 'Holdings', 'Investments', 'Management', 'Group', 'Partners', 'Capital', 'Ventures', 'Associates'])[1 + (row_number() over (order by u.email) % 10)],
    row_number() over (order by u.email) <= 90, -- 90% charges enabled
    row_number() over (order by u.email) <= 85, -- 85% payouts enabled
    case when row_number() over (order by u.email) <= 95 then 'completed' else 'in_progress' end,
    u.created_at
  from public.users u
  where u.email like 'owner-perf-%@perf.tenantflow.test'
    and not exists (select 1 from public.property_owners po where po.user_id = u.id)
  on conflict (user_id) do nothing;

  raise notice '✓ 100 owner users seeded';
end $$;

-- ============================================================================
-- GENERATE TENANT USERS (500 total) - BATCH INSERT
-- ============================================================================

do $$
declare
  v_batch_size int := 500;
  v_first_names text[] := ARRAY['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Sophia', 'Elijah', 'Isabella', 'Lucas',
                                 'Mia', 'Mason', 'Charlotte', 'Logan', 'Amelia', 'Alexander', 'Harper', 'Ethan', 'Evelyn', 'Jacob'];
  v_last_names text[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                                'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
begin
  -- Batch insert tenant users
  insert into public.users (email, full_name, first_name, last_name, user_type, phone, status, created_at)
  select
    'tenant-perf-' || g || '@perf.tenantflow.test',
    v_first_names[1 + (g % 20)] || ' ' || v_last_names[1 + ((g + 7) % 20)],
    v_first_names[1 + (g % 20)],
    v_last_names[1 + ((g + 7) % 20)],
    'TENANT',
    '+1' || (200 + (g % 800))::text || (100 + ((g + 100) % 900))::text || (1000 + ((g + 1000) % 9000))::text,
    'active',
    now() - (random() * 730) * interval '1 day'
  from generate_series(1, v_batch_size) as g
  on conflict (email) do nothing;

  -- Batch insert tenants
  insert into public.tenants (user_id, identity_verified, emergency_contact_name, emergency_contact_phone, created_at)
  select
    u.id,
    random() < 0.85,
    v_first_names[1 + ((row_number() over (order by u.email) + 3) % 20)] || ' ' || v_last_names[1 + ((row_number() over (order by u.email) + 11) % 20)],
    '+1' || (200 + ((row_number() over (order by u.email) + 200) % 800))::text || '5551234',
    u.created_at
  from public.users u
  where u.email like 'tenant-perf-%@perf.tenantflow.test'
    and not exists (select 1 from public.tenants t where t.user_id = u.id)
  on conflict (user_id) do nothing;

  raise notice '✓ 500 tenant users seeded';
end $$;

-- ============================================================================
-- GENERATE PROPERTIES (1000+ total) - BATCH INSERT
-- ============================================================================

do $$
declare
  v_property_prefixes text[] := ARRAY['Sunset', 'Oak', 'Cedar', 'Pine', 'Maple', 'Elm', 'Birch', 'Willow', 'Cherry', 'Aspen',
                                       'Harbor', 'Mountain', 'Valley', 'River', 'Lake', 'Ocean', 'Park', 'Forest', 'Garden', 'Highland'];
  v_property_suffixes text[] := ARRAY['Apartments', 'Condos', 'Towers', 'Plaza', 'Complex', 'Estate', 'Gardens', 'Heights', 'Village', 'Place',
                                       'Residences', 'Suites', 'Court', 'Landing', 'Point', 'Terrace', 'View', 'Manor', 'Commons', 'Square'];
  v_streets text[] := ARRAY['Oak', 'Maple', 'Cedar', 'Pine', 'Main', 'First', 'Second', 'Third', 'Park', 'Lake'];
  v_street_types text[] := ARRAY['Street', 'Avenue', 'Drive', 'Lane', 'Court', 'Boulevard', 'Way', 'Place', 'Road', 'Circle'];
  v_cities text[] := ARRAY['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Oakland', 'San Jose', 'Fresno', 'Long Beach', 'Bakersfield', 'Anaheim'];
  v_property_types text[] := ARRAY['residential', 'commercial', 'mixed_use', 'industrial'];
  v_po_id uuid;
  v_owner_num int;
begin
  -- For each owner, create 10-15 properties
  for v_po_id, v_owner_num in
    select po.id, row_number() over (order by po.id)
    from public.property_owners po
    where po.stripe_account_id like 'acct_perf%'
  loop
    insert into public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status, created_at)
    select
      v_po_id,
      v_property_prefixes[1 + (g % 20)] || ' ' || v_property_suffixes[1 + ((g + v_owner_num) % 20)] || ' ' || g,
      (100 + (g * 10 + v_owner_num) % 9900)::text || ' ' || v_streets[1 + (g % 10)] || ' ' || v_street_types[1 + ((g + 3) % 10)],
      v_cities[1 + ((g + v_owner_num) % 10)],
      'CA',
      (90000 + (v_owner_num * 100) + g)::text,
      v_property_types[1 + ((g + v_owner_num) % 4)],
      case when random() < 0.92 then 'active' else 'inactive' end,
      now() - (random() * 730) * interval '1 day'
    from generate_series(1, 10 + (v_owner_num % 6)) as g -- 10-15 properties per owner
    on conflict on constraint properties_pkey do nothing;
  end loop;

  raise notice '✓ 1000+ properties seeded';
end $$;

-- ============================================================================
-- GENERATE UNITS (5000+ total) - BATCH INSERT
-- ============================================================================

do $$
declare
  v_property record;
  v_unit_count int;
begin
  for v_property in
    select p.id as property_id, p.property_owner_id, row_number() over (order by p.id) as prop_num
    from public.properties p
    inner join public.property_owners po on p.property_owner_id = po.id
    where po.stripe_account_id like 'acct_perf%'
  loop
    v_unit_count := 3 + (v_property.prop_num % 8); -- 3-10 units per property

    insert into public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status, created_at)
    select
      v_property.property_id,
      v_property.property_owner_id,
      chr(64 + ((v_property.prop_num - 1) % 26) + 1) || lpad(g::text, 3, '0'),
      (random() * 4)::int, -- 0-4 bedrooms
      (1 + random() * 2)::numeric(3,1), -- 1-3 bathrooms
      (500 + random() * 2000)::int, -- 500-2500 sqft
      (100000 + random() * 400000)::int, -- $1000-$5000 rent
      (ARRAY['available', 'occupied', 'occupied', 'occupied', 'maintenance'])[1 + (g % 5)], -- 60% occupied
      now() - (random() * 730) * interval '1 day'
    from generate_series(1, v_unit_count) as g
    on conflict on constraint units_pkey do nothing;
  end loop;

  raise notice '✓ 5000+ units seeded';
end $$;

-- ============================================================================
-- GENERATE LEASES (10000+ total) - BATCH INSERT
-- ============================================================================

do $$
declare
  v_batch_num int := 0;
  v_lease_status text;
  v_start_offset int;
  v_end_offset int;
begin
  -- Create leases matching units with tenants (in batches of 1000)
  for v_batch_num in 0..9 loop
    insert into public.leases (
      unit_id, primary_tenant_id, property_owner_id,
      start_date, end_date, rent_amount, security_deposit,
      payment_day, lease_status,
      owner_signed_at, tenant_signed_at,
      created_at
    )
    select
      u.id,
      t.id,
      u.property_owner_id,
      -- Temporal distribution: 20% past, 60% current, 20% future
      case
        when (row_number() over (order by random())) % 10 <= 1 then current_date - interval '18 months' - (random() * 6) * interval '1 month'
        when (row_number() over (order by random())) % 10 <= 7 then current_date - (random() * 11) * interval '1 month'
        else current_date + (random() * 3) * interval '1 month'
      end as start_date,
      case
        when (row_number() over (order by random())) % 10 <= 1 then current_date - interval '6 months' - (random() * 6) * interval '1 month'
        when (row_number() over (order by random())) % 10 <= 7 then current_date + interval '12 months' - (random() * 11) * interval '1 month'
        else current_date + interval '15 months' + (random() * 3) * interval '1 month'
      end as end_date,
      u.rent_amount,
      u.rent_amount,
      1 + (random() * 27)::int,
      case
        when (row_number() over (order by random())) % 10 <= 1 then 'ended'
        when (row_number() over (order by random())) % 10 <= 7 then 'active'
        else 'pending_signature'
      end,
      case when (row_number() over (order by random())) % 10 <= 7 then now() - (random() * 365) * interval '1 day' else null end,
      case when (row_number() over (order by random())) % 10 <= 7 then now() - (random() * 360) * interval '1 day' else null end,
      now() - (random() * 730) * interval '1 day'
    from (
      select u.*, row_number() over (order by random()) as rn
      from public.units u
      inner join public.property_owners po on u.property_owner_id = po.id
      where po.stripe_account_id like 'acct_perf%'
      limit 1000 offset v_batch_num * 1000
    ) u
    cross join lateral (
      select t.id
      from public.tenants t
      inner join public.users usr on t.user_id = usr.id
      where usr.email like 'tenant-perf-%@perf.tenantflow.test'
      order by random()
      limit 1
    ) t
    on conflict on constraint leases_pkey do nothing;

    raise notice '✓ Lease batch % completed', v_batch_num + 1;
  end loop;

  raise notice '✓ 10000+ leases seeded';
end $$;

-- Create lease_tenants links
insert into public.lease_tenants (lease_id, tenant_id, is_primary, responsibility_percentage)
select l.id, l.primary_tenant_id, true, 100
from public.leases l
inner join public.property_owners po on l.property_owner_id = po.id
where po.stripe_account_id like 'acct_perf%'
  and not exists (select 1 from public.lease_tenants lt where lt.lease_id = l.id)
on conflict on constraint lease_tenants_pkey do nothing;

raise notice '✓ Lease-tenant links created';

-- ============================================================================
-- GENERATE MAINTENANCE REQUESTS (50000+ total) - BATCH INSERT
-- ============================================================================

do $$
declare
  v_batch_num int;
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
  v_statuses text[] := ARRAY['open', 'open', 'open', 'in_progress', 'in_progress', 'completed', 'completed', 'completed', 'completed', 'cancelled'];
  v_priorities text[] := ARRAY['low', 'low', 'normal', 'normal', 'normal', 'normal', 'high', 'high', 'urgent'];
begin
  -- Generate in batches of 10000
  for v_batch_num in 0..4 loop
    insert into public.maintenance_requests (
      unit_id, tenant_id, property_owner_id,
      title, description, status, priority,
      requested_by, created_at, completed_at
    )
    select
      l.unit_id,
      l.primary_tenant_id,
      l.property_owner_id,
      v_titles[1 + (g % 20)],
      v_descriptions[1 + (g % 5)],
      v_statuses[1 + (g % 10)],
      v_priorities[1 + (g % 9)],
      t.user_id,
      l.start_date + (random() * greatest(1, (current_date - l.start_date::date))) * interval '1 day',
      case
        when v_statuses[1 + (g % 10)] = 'completed'
        then l.start_date + (random() * greatest(1, (current_date - l.start_date::date))) * interval '1 day' + (random() * 14) * interval '1 day'
        else null
      end
    from (
      select l.*, row_number() over (order by random()) as lease_rn
      from public.leases l
      inner join public.property_owners po on l.property_owner_id = po.id
      where po.stripe_account_id like 'acct_perf%'
        and l.lease_status in ('active', 'ended')
    ) l
    inner join public.tenants t on l.primary_tenant_id = t.id
    cross join generate_series(1, 5) as g -- 5 maintenance requests per lease
    where l.lease_rn between v_batch_num * 2000 + 1 and (v_batch_num + 1) * 2000
    on conflict on constraint maintenance_requests_pkey do nothing;

    raise notice '✓ Maintenance batch % completed', v_batch_num + 1;
  end loop;

  raise notice '✓ 50000+ maintenance requests seeded';
end $$;

-- ============================================================================
-- GENERATE RENT PAYMENTS (for active leases)
-- ============================================================================

do $$
begin
  -- Generate rent payments for active leases
  insert into public.rent_payments (
    lease_id, tenant_id, stripe_payment_intent_id,
    amount, currency, status, payment_method_type,
    period_start, period_end, due_date, paid_date,
    application_fee_amount, late_fee_amount,
    created_at
  )
  select
    l.id,
    l.primary_tenant_id,
    'pi_perf_' || l.id::text || '_' || to_char(payment_month, 'YYYYMM'),
    l.rent_amount,
    'usd',
    case when random() < 0.95 then 'succeeded' else 'failed' end,
    (ARRAY['card', 'us_bank_account', 'card'])[1 + (random() * 2)::int],
    payment_month,
    (payment_month + interval '1 month' - interval '1 day')::date,
    payment_month + (l.payment_day - 1) * interval '1 day',
    payment_month + (l.payment_day - 1 + (random() * 5)::int) * interval '1 day',
    (l.rent_amount * 0.03)::int,
    case when random() < 0.1 then (l.rent_amount * 0.05)::int else 0 end,
    payment_month + (l.payment_day - 1) * interval '1 day'
  from public.leases l
  inner join public.property_owners po on l.property_owner_id = po.id
  cross join lateral (
    select generate_series(
      date_trunc('month', l.start_date)::date,
      least(date_trunc('month', current_date)::date, date_trunc('month', l.end_date)::date),
      '1 month'::interval
    )::date as payment_month
  ) months
  where po.stripe_account_id like 'acct_perf%'
    and l.lease_status = 'active'
    and payment_month >= l.start_date
    and payment_month <= current_date
  on conflict on constraint rent_payments_pkey do nothing;

  raise notice '✓ Rent payments seeded';
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
  select count(*) into v_user_count from public.users where email like '%@perf.tenantflow.test';
  select count(*) into v_owner_count from public.property_owners where stripe_account_id like 'acct_perf%';
  select count(*) into v_tenant_count from public.tenants t inner join public.users u on t.user_id = u.id where u.email like 'tenant-perf-%@perf.tenantflow.test';
  select count(*) into v_property_count from public.properties p inner join public.property_owners po on p.property_owner_id = po.id where po.stripe_account_id like 'acct_perf%';
  select count(*) into v_unit_count from public.units u inner join public.property_owners po on u.property_owner_id = po.id where po.stripe_account_id like 'acct_perf%';
  select count(*) into v_lease_count from public.leases l inner join public.property_owners po on l.property_owner_id = po.id where po.stripe_account_id like 'acct_perf%';
  select count(*) into v_mr_count from public.maintenance_requests mr inner join public.property_owners po on mr.property_owner_id = po.id where po.stripe_account_id like 'acct_perf%';
  select count(*) into v_payment_count from public.rent_payments rp inner join public.leases l on rp.lease_id = l.id inner join public.property_owners po on l.property_owner_id = po.id where po.stripe_account_id like 'acct_perf%';

  raise notice '========================================';
  raise notice 'PERFORMANCE SEED SUMMARY';
  raise notice '========================================';
  raise notice 'Users (perf):     %', v_user_count;
  raise notice 'Property Owners:  %', v_owner_count;
  raise notice 'Tenants:          %', v_tenant_count;
  raise notice 'Properties:       %', v_property_count;
  raise notice 'Units:            %', v_unit_count;
  raise notice 'Leases:           %', v_lease_count;
  raise notice 'Maintenance:      %', v_mr_count;
  raise notice 'Rent Payments:    %', v_payment_count;
  raise notice '========================================';
  raise notice '✓ Performance seed completed successfully';
end $$;
