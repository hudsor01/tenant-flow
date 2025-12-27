-- Migration: Fix Dashboard Functions Return Types
-- Purpose:
--   1. Fix broken get_dashboard_stats function (references non-existent property_owners table)
--   2. Change return types from json/jsonb to properly typed RETURNS TABLE
--   3. Update queries to use owner_user_id instead of property_owner_id
--
-- This enables Supabase to generate proper TypeScript types from the function signatures.

-- ============================================================================
-- STEP 1: Create composite types for nested structures
-- These types will be used in the RETURNS TABLE definition
-- ============================================================================

-- Property statistics type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'property_stats_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.property_stats_type AS (
      total integer,
      occupied integer,
      vacant integer,
      occupancy_rate numeric,
      total_monthly_rent bigint,
      average_rent numeric
    );
  END IF;
END $$;

-- Tenant statistics type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'tenant_stats_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.tenant_stats_type AS (
      total integer,
      active integer,
      inactive integer,
      new_this_month integer
    );
  END IF;
END $$;

-- Unit statistics type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'unit_stats_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.unit_stats_type AS (
      total integer,
      occupied integer,
      vacant integer,
      maintenance integer,
      average_rent numeric,
      available integer,
      occupancy_rate numeric,
      occupancy_change numeric,
      total_potential_rent bigint,
      total_actual_rent bigint
    );
  END IF;
END $$;

-- Lease statistics type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'lease_stats_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.lease_stats_type AS (
      total integer,
      active integer,
      expired integer,
      expiring_soon integer
    );
  END IF;
END $$;

-- Maintenance priority breakdown type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'maintenance_priority_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.maintenance_priority_type AS (
      low integer,
      normal integer,
      high integer,
      urgent integer
    );
  END IF;
END $$;

-- Maintenance statistics type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'maintenance_stats_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.maintenance_stats_type AS (
      total integer,
      open integer,
      in_progress integer,
      completed integer,
      completed_today integer,
      avg_resolution_time numeric,
      by_priority public.maintenance_priority_type
    );
  END IF;
END $$;

-- Revenue statistics type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'revenue_stats_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.revenue_stats_type AS (
      monthly bigint,
      yearly bigint,
      growth numeric
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop and recreate get_dashboard_stats with proper return type
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS TABLE (
  properties public.property_stats_type,
  tenants public.tenant_stats_type,
  units public.unit_stats_type,
  leases public.lease_stats_type,
  maintenance public.maintenance_stats_type,
  revenue public.revenue_stats_type
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_properties public.property_stats_type;
  v_tenants public.tenant_stats_type;
  v_units public.unit_stats_type;
  v_leases public.lease_stats_type;
  v_maintenance public.maintenance_stats_type;
  v_revenue public.revenue_stats_type;
  v_maintenance_priority public.maintenance_priority_type;
BEGIN
  -- Check if user has any properties (is a property owner)
  IF NOT EXISTS (SELECT 1 FROM properties WHERE owner_user_id = p_user_id) THEN
    -- Return empty stats for non-owners
    v_properties := ROW(0, 0, 0, 0::numeric, 0::bigint, 0::numeric)::public.property_stats_type;
    v_tenants := ROW(0, 0, 0, 0)::public.tenant_stats_type;
    v_units := ROW(0, 0, 0, 0, 0::numeric, 0, 0::numeric, 0::numeric, 0::bigint, 0::bigint)::public.unit_stats_type;
    v_leases := ROW(0, 0, 0, 0)::public.lease_stats_type;
    v_maintenance_priority := ROW(0, 0, 0, 0)::public.maintenance_priority_type;
    v_maintenance := ROW(0, 0, 0, 0, 0, 0::numeric, v_maintenance_priority)::public.maintenance_stats_type;
    v_revenue := ROW(0::bigint, 0::bigint, 0::numeric)::public.revenue_stats_type;

    RETURN QUERY SELECT v_properties, v_tenants, v_units, v_leases, v_maintenance, v_revenue;
    RETURN;
  END IF;

  -- Properties statistics
  WITH property_stats AS (
    SELECT
      p.id,
      (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'occupied') as occupied_units,
      (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as total_units
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  )
  SELECT ROW(
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE occupied_units > 0)::integer,
    COUNT(*) FILTER (WHERE occupied_units = 0 OR total_units = 0)::integer,
    COALESCE(
      ROUND(
        (SUM(occupied_units)::numeric / NULLIF(SUM(total_units)::numeric, 0)) * 100,
        2
      ),
      0
    )::numeric,
    COALESCE(
      (SELECT SUM(u.rent_amount)
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE p.owner_user_id = p_user_id
       AND u.status = 'occupied'),
      0
    )::bigint,
    COALESCE(
      (SELECT AVG(u.rent_amount)
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE p.owner_user_id = p_user_id),
      0
    )::numeric
  )::public.property_stats_type INTO v_properties
  FROM property_stats;

  -- Tenants statistics
  SELECT ROW(
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM leases l
      WHERE l.primary_tenant_id = t.id
      AND l.lease_status = 'active'
    ))::integer,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM leases l
      WHERE l.primary_tenant_id = t.id
      AND l.lease_status = 'active'
    ))::integer,
    COUNT(*) FILTER (WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE))::integer
  )::public.tenant_stats_type INTO v_tenants
  FROM tenants t
  WHERE EXISTS (
    SELECT 1 FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_user_id
    AND EXISTS (SELECT 1 FROM leases l WHERE l.unit_id = u.id AND l.primary_tenant_id = t.id)
  );

  -- Units statistics
  SELECT ROW(
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE status = 'occupied')::integer,
    COUNT(*) FILTER (WHERE status = 'available')::integer,
    COUNT(*) FILTER (WHERE status = 'maintenance')::integer,
    COALESCE(AVG(rent_amount), 0)::numeric,
    COUNT(*) FILTER (WHERE status = 'available')::integer,
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'occupied')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100,
        2
      ),
      0
    )::numeric,
    0::numeric,
    COALESCE(SUM(rent_amount), 0)::bigint,
    COALESCE(SUM(rent_amount) FILTER (WHERE status = 'occupied'), 0)::bigint
  )::public.unit_stats_type INTO v_units
  FROM units
  WHERE property_id IN (
    SELECT id FROM properties WHERE owner_user_id = p_user_id
  );

  -- Leases statistics
  SELECT ROW(
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE lease_status = 'active')::integer,
    COUNT(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))::integer,
    COUNT(*) FILTER (
      WHERE lease_status = 'active'
      AND end_date <= CURRENT_DATE + INTERVAL '30 days'
    )::integer
  )::public.lease_stats_type INTO v_leases
  FROM leases
  WHERE owner_user_id = p_user_id;

  -- Maintenance statistics
  SELECT ROW(
    COUNT(*) FILTER (WHERE priority = 'low')::integer,
    COUNT(*) FILTER (WHERE priority = 'normal')::integer,
    COUNT(*) FILTER (WHERE priority = 'high')::integer,
    COUNT(*) FILTER (WHERE priority = 'urgent')::integer
  )::public.maintenance_priority_type INTO v_maintenance_priority
  FROM maintenance_requests
  WHERE owner_user_id = p_user_id;

  SELECT ROW(
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE status = 'open')::integer,
    COUNT(*) FILTER (WHERE status = 'in_progress')::integer,
    COUNT(*) FILTER (WHERE status = 'completed')::integer,
    COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE)::integer,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at IS NOT NULL),
      0
    )::numeric,
    v_maintenance_priority
  )::public.maintenance_stats_type INTO v_maintenance
  FROM maintenance_requests
  WHERE owner_user_id = p_user_id;

  -- Revenue statistics
  SELECT ROW(
    COALESCE(
      (SELECT SUM(rent_amount) FROM leases WHERE owner_user_id = p_user_id AND lease_status = 'active'),
      0
    )::bigint,
    COALESCE(
      (SELECT SUM(rent_amount) * 12 FROM leases WHERE owner_user_id = p_user_id AND lease_status = 'active'),
      0
    )::bigint,
    0::numeric
  )::public.revenue_stats_type INTO v_revenue;

  -- Return all stats as a single row
  RETURN QUERY SELECT v_properties, v_tenants, v_units, v_leases, v_maintenance, v_revenue;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO service_role;

-- ============================================================================
-- STEP 3: Create time series return type and update function
-- ============================================================================

-- Time series data point type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'time_series_point_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.time_series_point_type AS (
      date text,
      value numeric
    );
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_dashboard_time_series(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.get_dashboard_time_series(
  p_user_id uuid,
  p_metric_name text,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  date text,
  value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date DATE;
BEGIN
  -- Generate time series data based on metric type
  FOR v_date IN SELECT generate_series(CURRENT_DATE - (p_days - 1), CURRENT_DATE, '1 day'::interval)::date
  LOOP
    date := TO_CHAR(v_date, 'YYYY-MM-DD');

    CASE p_metric_name
      WHEN 'occupancy' THEN
        -- Calculate occupancy for this date
        SELECT COALESCE(
          ROUND(
            COUNT(*) FILTER (WHERE u.status = 'occupied')::numeric /
            NULLIF(COUNT(*)::numeric, 0) * 100,
            2
          ),
          0
        ) INTO value
        FROM units u
        WHERE u.property_id IN (SELECT id FROM properties WHERE owner_user_id = p_user_id);

      WHEN 'revenue' THEN
        -- Calculate revenue for this date (monthly rent of active leases)
        SELECT COALESCE(SUM(rent_amount), 0) INTO value
        FROM leases
        WHERE owner_user_id = p_user_id
        AND lease_status = 'active'
        AND start_date <= v_date
        AND (end_date IS NULL OR end_date >= v_date);

      WHEN 'maintenance' THEN
        -- Count open maintenance requests on this date
        SELECT COUNT(*)::numeric INTO value
        FROM maintenance_requests
        WHERE owner_user_id = p_user_id
        AND DATE(created_at) <= v_date
        AND (status != 'completed' OR DATE(completed_at) > v_date);

      ELSE
        value := 0;
    END CASE;

    RETURN NEXT;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_time_series(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_time_series(uuid, text, integer) TO service_role;

-- ============================================================================
-- STEP 4: Add comments for documentation
-- ============================================================================

COMMENT ON TYPE public.property_stats_type IS 'Property statistics for dashboard - total, occupied, vacant counts and rates';
COMMENT ON TYPE public.tenant_stats_type IS 'Tenant statistics for dashboard - total, active, inactive counts';
COMMENT ON TYPE public.unit_stats_type IS 'Unit statistics for dashboard - counts, rates, and rent totals';
COMMENT ON TYPE public.lease_stats_type IS 'Lease statistics for dashboard - total, active, expired counts';
COMMENT ON TYPE public.maintenance_stats_type IS 'Maintenance statistics for dashboard - counts by status and priority';
COMMENT ON TYPE public.revenue_stats_type IS 'Revenue statistics for dashboard - monthly, yearly totals';
COMMENT ON TYPE public.time_series_point_type IS 'Time series data point with date string and numeric value';

COMMENT ON FUNCTION public.get_dashboard_stats(uuid) IS 'Returns typed dashboard statistics for a property owner. Uses owner_user_id for direct user lookup.';
COMMENT ON FUNCTION public.get_dashboard_time_series(uuid, text, integer) IS 'Returns typed time series data for dashboard charts. Supports occupancy, revenue, and maintenance metrics.';
