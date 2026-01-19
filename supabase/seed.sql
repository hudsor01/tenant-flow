-- ========================================
-- TenantFlow Seed Data (Placeholder)
-- ========================================
-- Note: The original seed script was designed for a Prisma-style schema
-- with PascalCase table names. The current schema uses snake_case.
--
-- For local development, you can:
-- 1. Create test data via the application
-- 2. Run integration tests which create their own fixtures
--
-- This file is intentionally minimal to allow supabase start to succeed.

-- Seed minimal graph to enable maintenance_requests analytics tests
DO $$
DECLARE
  v_owner_user uuid;
  v_tenant_user uuid;
  v_owner      uuid;
  v_property   uuid;
  v_unit       uuid;
  v_tenant     uuid;
BEGIN
  -- Owner user (idempotent by email)
  SELECT id INTO v_owner_user FROM public.users WHERE email = 'owner.seed@example.com' LIMIT 1;
  IF v_owner_user IS NULL THEN
    INSERT INTO public.users (email, full_name, user_type)
    VALUES ('owner.seed@example.com', 'Seed Owner', 'OWNER')
    RETURNING id INTO v_owner_user;
  END IF;

  -- Tenant user (idempotent by email)
  SELECT id INTO v_tenant_user FROM public.users WHERE email = 'tenant.seed@example.com' LIMIT 1;
  IF v_tenant_user IS NULL THEN
    INSERT INTO public.users (email, full_name, user_type)
    VALUES ('tenant.seed@example.com', 'Seed Tenant', 'TENANT')
    RETURNING id INTO v_tenant_user;
  END IF;

  -- Property owner profile (idempotent by user_id)
  IF to_regclass('public.stripe_connected_accounts') IS NOT NULL THEN
    SELECT id INTO v_owner FROM public.stripe_connected_accounts WHERE user_id = v_owner_user LIMIT 1;
    IF v_owner IS NULL THEN
      INSERT INTO public.stripe_connected_accounts (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled)
      VALUES (v_owner_user, 'acct_seed_123', 'sole_prop', 'Seed Property Group', true, true)
      RETURNING id INTO v_owner;
    END IF;
  ELSE
    SELECT id INTO v_owner FROM public.property_owners WHERE user_id = v_owner_user LIMIT 1;
    IF v_owner IS NULL THEN
      INSERT INTO public.property_owners (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled)
      VALUES (v_owner_user, 'acct_seed_123', 'sole_prop', 'Seed Property Group', true, true)
      RETURNING id INTO v_owner;
    END IF;
  END IF;

  -- Property (idempotent by owner + name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'owner_user_id'
  ) THEN
    SELECT id INTO v_property FROM public.properties WHERE owner_user_id = v_owner_user AND name = 'Seed Residence' LIMIT 1;
    IF v_property IS NULL THEN
      INSERT INTO public.properties (owner_user_id, name, address_line1, city, state, postal_code, property_type, status)
      VALUES (v_owner_user, 'Seed Residence', '123 Seed St', 'Seedville', 'CA', '94000', 'residential', 'active')
      RETURNING id INTO v_property;
    END IF;
  ELSE
    SELECT id INTO v_property FROM public.properties WHERE property_owner_id = v_owner AND name = 'Seed Residence' LIMIT 1;
    IF v_property IS NULL THEN
      INSERT INTO public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
      VALUES (v_owner, 'Seed Residence', '123 Seed St', 'Seedville', 'CA', '94000', 'residential', 'active')
      RETURNING id INTO v_property;
    END IF;
  END IF;

  -- Unit (idempotent by property + unit_number)
  SELECT id INTO v_unit FROM public.units WHERE property_id = v_property AND unit_number = '1A' LIMIT 1;
  IF v_unit IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'units' AND column_name = 'owner_user_id'
    ) THEN
      INSERT INTO public.units (property_id, owner_user_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
      VALUES (v_property, v_owner_user, '1A', 2, 1.0, 900, 1800, 'available')
      RETURNING id INTO v_unit;
    ELSE
      INSERT INTO public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
      VALUES (v_property, v_owner, '1A', 2, 1.0, 900, 1800, 'available')
      RETURNING id INTO v_unit;
    END IF;
  END IF;

  -- Tenant profile (idempotent by user_id)
  SELECT id INTO v_tenant FROM public.tenants WHERE user_id = v_tenant_user LIMIT 1;
  IF v_tenant IS NULL THEN
    INSERT INTO public.tenants (user_id, identity_verified)
    VALUES (v_tenant_user, true)
    RETURNING id INTO v_tenant;
  END IF;

  -- Maintenance requests (one open, one completed)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'maintenance_requests' AND column_name = 'owner_user_id'
  ) THEN
    INSERT INTO public.maintenance_requests
      (unit_id, tenant_id, owner_user_id, status, priority, description, requested_by, created_at)
    VALUES
      (v_unit, v_tenant, v_owner_user, 'open',       'normal', 'Leaking faucet in kitchen', v_tenant_user, now() - interval '2 days'),
      (v_unit, v_tenant, v_owner_user, 'completed',  'high',   'HVAC not cooling, replaced filter', v_tenant_user, now() - interval '10 days');
  ELSE
    INSERT INTO public.maintenance_requests
      (unit_id, tenant_id, property_owner_id, status, priority, description, requested_by, created_at)
    VALUES
      (v_unit, v_tenant, v_owner, 'open',       'normal', 'Leaking faucet in kitchen', v_tenant_user, now() - interval '2 days'),
      (v_unit, v_tenant, v_owner, 'completed',  'high',   'HVAC not cooling, replaced filter', v_tenant_user, now() - interval '10 days');
  END IF;

  -- Mark completion for the completed request
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'maintenance_requests' AND column_name = 'owner_user_id'
  ) THEN
    UPDATE public.maintenance_requests
    SET completed_at = created_at + interval '1 day'
    WHERE status = 'completed' AND owner_user_id = v_owner_user;
  ELSE
    UPDATE public.maintenance_requests
    SET completed_at = created_at + interval '1 day'
    WHERE status = 'completed' AND property_owner_id = v_owner;
  END IF;
END $$;

-- Bulk synthetic data for performance testing (large owner dataset)
DO $$
DECLARE
  v_owner_user uuid;
  v_tenant_user uuid;
  v_owner      uuid;
  v_property   uuid;
  v_unit       uuid;
  v_tenant     uuid;
BEGIN
  -- Owner user for load test (idempotent)
  SELECT id INTO v_owner_user FROM public.users WHERE email = 'owner.perf@example.com' LIMIT 1;
  IF v_owner_user IS NULL THEN
    INSERT INTO public.users (email, full_name, user_type)
    VALUES ('owner.perf@example.com', 'Perf Owner', 'OWNER')
    RETURNING id INTO v_owner_user;
  END IF;

  -- Tenant user for load test (idempotent)
  SELECT id INTO v_tenant_user FROM public.users WHERE email = 'tenant.perf@example.com' LIMIT 1;
  IF v_tenant_user IS NULL THEN
    INSERT INTO public.users (email, full_name, user_type)
    VALUES ('tenant.perf@example.com', 'Perf Tenant', 'TENANT')
    RETURNING id INTO v_tenant_user;
  END IF;

  -- Property owner profile (idempotent by user_id)
  IF to_regclass('public.stripe_connected_accounts') IS NOT NULL THEN
    SELECT id INTO v_owner FROM public.stripe_connected_accounts WHERE user_id = v_owner_user LIMIT 1;
    IF v_owner IS NULL THEN
      INSERT INTO public.stripe_connected_accounts (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled)
      VALUES (v_owner_user, 'acct_perf_123', 'sole_prop', 'Perf Property Group', true, true)
      RETURNING id INTO v_owner;
    END IF;
  ELSE
    SELECT id INTO v_owner FROM public.property_owners WHERE user_id = v_owner_user LIMIT 1;
    IF v_owner IS NULL THEN
      INSERT INTO public.property_owners (user_id, stripe_account_id, business_type, business_name, charges_enabled, payouts_enabled)
      VALUES (v_owner_user, 'acct_perf_123', 'sole_prop', 'Perf Property Group', true, true)
      RETURNING id INTO v_owner;
    END IF;
  END IF;

  -- Property (idempotent by owner + name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'owner_user_id'
  ) THEN
    SELECT id INTO v_property FROM public.properties WHERE owner_user_id = v_owner_user AND name = 'Perf Residence' LIMIT 1;
    IF v_property IS NULL THEN
      INSERT INTO public.properties (owner_user_id, name, address_line1, city, state, postal_code, property_type, status)
      VALUES (v_owner_user, 'Perf Residence', '999 Perf St', 'Perfville', 'CA', '94001', 'residential', 'active')
      RETURNING id INTO v_property;
    END IF;
  ELSE
    SELECT id INTO v_property FROM public.properties WHERE property_owner_id = v_owner AND name = 'Perf Residence' LIMIT 1;
    IF v_property IS NULL THEN
      INSERT INTO public.properties (property_owner_id, name, address_line1, city, state, postal_code, property_type, status)
      VALUES (v_owner, 'Perf Residence', '999 Perf St', 'Perfville', 'CA', '94001', 'residential', 'active')
      RETURNING id INTO v_property;
    END IF;
  END IF;

  -- Unit (idempotent by property + unit_number)
  SELECT id INTO v_unit FROM public.units WHERE property_id = v_property AND unit_number = 'Perf-1' LIMIT 1;
  IF v_unit IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'units' AND column_name = 'owner_user_id'
    ) THEN
      INSERT INTO public.units (property_id, owner_user_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
      VALUES (v_property, v_owner_user, 'Perf-1', 3, 2.0, 1200, 2500, 'available')
      RETURNING id INTO v_unit;
    ELSE
      INSERT INTO public.units (property_id, property_owner_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
      VALUES (v_property, v_owner, 'Perf-1', 3, 2.0, 1200, 2500, 'available')
      RETURNING id INTO v_unit;
    END IF;
  END IF;

  -- Tenant profile (idempotent by user_id)
  SELECT id INTO v_tenant FROM public.tenants WHERE user_id = v_tenant_user LIMIT 1;
  IF v_tenant IS NULL THEN
    INSERT INTO public.tenants (user_id, identity_verified)
    VALUES (v_tenant_user, true)
    RETURNING id INTO v_tenant;
  END IF;

  -- Insert many maintenance requests for perf testing
  -- Insert perf maintenance requests only if fewer than 2000 exist for this owner
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'maintenance_requests' AND column_name = 'owner_user_id'
  ) THEN
    IF (SELECT COUNT(*) FROM public.maintenance_requests WHERE owner_user_id = v_owner_user) < 2000 THEN
      INSERT INTO public.maintenance_requests (
        unit_id,
        tenant_id,
        owner_user_id,
        status,
        priority,
        description,
        requested_by,
        created_at,
        completed_at
      )
      SELECT
        v_unit,
        v_tenant,
        v_owner_user,
        (ARRAY['open','in_progress','completed','cancelled'])[(g % 4)+1] AS status,
        (ARRAY['low','normal','high','urgent'])[(g % 4)+1] AS priority,
        'Perf seed request #' || g AS description,
        v_tenant_user,
        now() - (g % 60) * interval '1 day' AS created_at,
        CASE
          WHEN (ARRAY['open','in_progress','completed','cancelled'])[(g % 4)+1] = 'completed'
          THEN (now() - (g % 60) * interval '1 day') + interval '12 hours'
          ELSE NULL
        END AS completed_at
      FROM generate_series(1, 2000) AS g
      WHERE NOT EXISTS (
        SELECT 1 FROM public.maintenance_requests mr
        WHERE mr.owner_user_id = v_owner_user
          AND mr.description = 'Perf seed request #' || g
      );
    END IF;
  ELSE
    IF (SELECT COUNT(*) FROM public.maintenance_requests WHERE property_owner_id = v_owner) < 2000 THEN
      INSERT INTO public.maintenance_requests (
        unit_id,
        tenant_id,
        property_owner_id,
        status,
        priority,
        description,
        requested_by,
        created_at,
        completed_at
      )
      SELECT
        v_unit,
        v_tenant,
        v_owner,
        (ARRAY['open','in_progress','completed','cancelled'])[(g % 4)+1] AS status,
        (ARRAY['low','normal','high','urgent'])[(g % 4)+1] AS priority,
        'Perf seed request #' || g AS description,
        v_tenant_user,
        now() - (g % 60) * interval '1 day' AS created_at,
        CASE
          WHEN (ARRAY['open','in_progress','completed','cancelled'])[(g % 4)+1] = 'completed'
          THEN (now() - (g % 60) * interval '1 day') + interval '12 hours'
          ELSE NULL
        END AS completed_at
      FROM generate_series(1, 2000) AS g
      WHERE NOT EXISTS (
        SELECT 1 FROM public.maintenance_requests mr
        WHERE mr.property_owner_id = v_owner
          AND mr.description = 'Perf seed request #' || g
      );
    END IF;
  END IF;

  RAISE NOTICE 'Perf test owner_user_id: %', v_owner_user;
END $$;

SELECT 1;
