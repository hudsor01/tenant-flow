-- ============================================================================
-- Migration: Consolidate dashboard functions from 6 → 3 core functions
-- Date: 2025-01-12
--
-- CONSOLIDATION PLAN:
-- 1. Merge get_dashboard_stats + get_dashboard_stats_optimized → get_dashboard_stats
-- 2. Remove get_dashboard_stats_fast (redundant)
-- 3. Keep get_dashboard_time_series (fix signature)
-- 4. Remove get_dashboard_metrics (replaced by service layer)
-- 5. Remove get_dashboard_summary (replaced by service layer)
-- 6. Remove get_dashboard_financial_stats (consolidate into main stats)
-- ============================================================================

-- Drop redundant/deprecated functions
DROP FUNCTION IF EXISTS public.get_dashboard_stats_optimized(text, text);
DROP FUNCTION IF EXISTS public.get_dashboard_stats_fast(text);
DROP FUNCTION IF EXISTS public.get_dashboard_metrics(text);
DROP FUNCTION IF EXISTS public.get_dashboard_summary(text);
DROP FUNCTION IF EXISTS public.get_dashboard_financial_stats(text);

-- Drop the old single-parameter wrapper (will recreate as unified function)
DROP FUNCTION IF EXISTS public.get_dashboard_stats(text);

-- ============================================================================
-- CORE FUNCTION 1: get_dashboard_stats (unified, no wrapper)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result jsonb;
  properties_stats jsonb;
  tenants_stats jsonb;
  units_stats jsonb;
  leases_stats jsonb;
  maintenance_stats jsonb;
  revenue_stats jsonb;
BEGIN
  -- Properties statistics
  SELECT jsonb_build_object(
    'total', COALESCE(COUNT(*), 0),
    'owned', COALESCE(COUNT(*), 0),
    'rented', COALESCE(COUNT(CASE WHEN EXISTS(
      SELECT 1 FROM unit u
      JOIN lease l ON u.id = l."unitId"
      WHERE u."propertyId" = p.id AND l.status = 'ACTIVE'
    ) THEN 1 END), 0),
    'available', COALESCE(COUNT(CASE WHEN NOT EXISTS(
      SELECT 1 FROM unit u
      JOIN lease l ON u.id = l."unitId"
      WHERE u."propertyId" = p.id AND l.status = 'ACTIVE'
    ) THEN 1 END), 0)
  ) INTO properties_stats
  FROM property p
  WHERE p."ownerId" = p_user_id::uuid;

  -- Tenants statistics
  SELECT jsonb_build_object(
    'total', COALESCE(COUNT(DISTINCT t.id), 0),
    'active', COALESCE(COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN t.id END), 0)
  ) INTO tenants_stats
  FROM tenant t
  JOIN lease l ON t.id = l."tenantId"
  JOIN unit u ON l."unitId" = u.id
  JOIN property p ON u."propertyId" = p.id
  WHERE p."ownerId" = p_user_id::uuid;

  -- Units statistics
  SELECT jsonb_build_object(
    'total', COALESCE(COUNT(*), 0),
    'occupied', COALESCE(COUNT(CASE WHEN EXISTS(
      SELECT 1 FROM lease l WHERE l."unitId" = u.id AND l.status = 'ACTIVE'
    ) THEN 1 END), 0),
    'available', COALESCE(COUNT(CASE WHEN NOT EXISTS(
      SELECT 1 FROM lease l WHERE l."unitId" = u.id AND l.status = 'ACTIVE'
    ) THEN 1 END), 0)
  ) INTO units_stats
  FROM unit u
  JOIN property p ON u."propertyId" = p.id
  WHERE p."ownerId" = p_user_id::uuid;

  -- Leases statistics
  SELECT jsonb_build_object(
    'total', COALESCE(COUNT(*), 0),
    'active', COALESCE(COUNT(CASE WHEN l.status = 'ACTIVE' THEN 1 END), 0),
    'expiring_soon', COALESCE(COUNT(CASE
      WHEN l.status = 'ACTIVE'
      AND l."endDate" IS NOT NULL
      AND l."endDate" <= CURRENT_DATE + INTERVAL '30 days'
      THEN 1
    END), 0)
  ) INTO leases_stats
  FROM lease l
  JOIN unit u ON l."unitId" = u.id
  JOIN property p ON u."propertyId" = p.id
  WHERE p."ownerId" = p_user_id::uuid;

  -- Maintenance statistics
  SELECT jsonb_build_object(
    'total', COALESCE(COUNT(*), 0),
    'pending', COALESCE(COUNT(CASE WHEN m.status = 'PENDING' THEN 1 END), 0),
    'in_progress', COALESCE(COUNT(CASE WHEN m.status = 'IN_PROGRESS' THEN 1 END), 0)
  ) INTO maintenance_stats
  FROM maintenance_request m
  JOIN unit u ON m."unitId" = u.id
  JOIN property p ON u."propertyId" = p.id
  WHERE p."ownerId" = p_user_id::uuid;

  -- Revenue statistics (current month)
  SELECT jsonb_build_object(
    'current_month', COALESCE(SUM(CASE
      WHEN rp.status = 'PAID'
      AND DATE_TRUNC('month', rp."paidAt") = DATE_TRUNC('month', CURRENT_DATE)
      THEN rp.amount
      ELSE 0
    END), 0),
    'pending', COALESCE(SUM(CASE
      WHEN rp.status IN ('PENDING', 'OVERDUE')
      THEN rp.amount
      ELSE 0
    END), 0)
  ) INTO revenue_stats
  FROM rent_payment rp
  JOIN lease l ON rp."leaseId" = l.id
  JOIN unit u ON l."unitId" = u.id
  JOIN property p ON u."propertyId" = p.id
  WHERE p."ownerId" = p_user_id::uuid;

  -- Combine all statistics
  result := jsonb_build_object(
    'properties', properties_stats,
    'tenants', tenants_stats,
    'units', units_stats,
    'leases', leases_stats,
    'maintenance', maintenance_stats,
    'revenue', revenue_stats
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(text) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_stats IS 'Unified dashboard statistics function. Consolidates data from properties, tenants, units, leases, maintenance, and revenue tables with RLS bypass.';

-- ============================================================================
-- CORE FUNCTION 2: get_property_performance (already exists, no changes needed)
-- ============================================================================
-- This function is already properly implemented in previous migrations

-- ============================================================================
-- CORE FUNCTION 3: get_dashboard_time_series (drop old version first)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_dashboard_time_series(text, text, integer);

CREATE OR REPLACE FUNCTION public.get_dashboard_time_series(
  p_user_id text,
  p_metric_name text,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result jsonb;
  start_date date;
  end_date date;
BEGIN
  -- Calculate date range
  end_date := CURRENT_DATE;
  start_date := end_date - (p_days || ' days')::interval;

  -- Generate time-series data based on metric
  CASE p_metric_name
    WHEN 'occupancy_rate' THEN
      -- Daily occupancy rate over period
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', day::text,
          'value', CASE
            WHEN total_units > 0 THEN
              ROUND((occupied_units::numeric / total_units::numeric) * 100, 2)
            ELSE 0
          END
        ) ORDER BY day
      ) INTO result
      FROM (
        SELECT
          d.day,
          COUNT(DISTINCT u.id) AS total_units,
          COUNT(DISTINCT CASE
            WHEN EXISTS (
              SELECT 1 FROM lease l
              WHERE l."unitId" = u.id
              AND l.status = 'ACTIVE'
              AND l."startDate" <= d.day
              AND (l."endDate" IS NULL OR l."endDate" >= d.day)
            ) THEN u.id
          END) AS occupied_units
        FROM generate_series(start_date, end_date, '1 day'::interval) AS d(day)
        CROSS JOIN unit u
        JOIN property p ON u."propertyId" = p.id
        WHERE p."ownerId" = p_user_id::uuid
        GROUP BY d.day
      ) daily_occupancy;

    WHEN 'monthly_revenue' THEN
      -- Daily revenue over period
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', day::text,
          'value', COALESCE(daily_revenue, 0)
        ) ORDER BY day
      ) INTO result
      FROM (
        SELECT
          d.day,
          COALESCE(SUM(rp.amount) / 100.0, 0) AS daily_revenue
        FROM generate_series(start_date, end_date, '1 day'::interval) AS d(day)
        LEFT JOIN rent_payment rp ON DATE(rp."paidAt") = d.day
        LEFT JOIN lease l ON rp."leaseId" = l.id
        LEFT JOIN unit u ON l."unitId" = u.id
        LEFT JOIN property p ON u."propertyId" = p.id
        WHERE (p."ownerId" = p_user_id::uuid OR p."ownerId" IS NULL)
        AND (rp.status = 'PAID' OR rp.status IS NULL)
        GROUP BY d.day
      ) daily_revenue;

    WHEN 'active_tenants' THEN
      -- Daily active tenant count over period
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', day::text,
          'value', COALESCE(active_count, 0)
        ) ORDER BY day
      ) INTO result
      FROM (
        SELECT
          d.day,
          COUNT(DISTINCT t.id) AS active_count
        FROM generate_series(start_date, end_date, '1 day'::interval) AS d(day)
        LEFT JOIN lease l ON l.status = 'ACTIVE'
          AND l."startDate" <= d.day
          AND (l."endDate" IS NULL OR l."endDate" >= d.day)
        LEFT JOIN tenant t ON l."tenantId" = t.id
        LEFT JOIN unit u ON l."unitId" = u.id
        LEFT JOIN property p ON u."propertyId" = p.id
        WHERE p."ownerId" = p_user_id::uuid OR p."ownerId" IS NULL
        GROUP BY d.day
      ) daily_tenants;

    WHEN 'open_maintenance' THEN
      -- Daily open maintenance count over period
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', day::text,
          'value', COALESCE(open_count, 0)
        ) ORDER BY day
      ) INTO result
      FROM (
        SELECT
          d.day,
          COUNT(DISTINCT m.id) AS open_count
        FROM generate_series(start_date, end_date, '1 day'::interval) AS d(day)
        LEFT JOIN maintenance_request m ON DATE(m."createdAt") <= d.day
          AND (m.status IN ('PENDING', 'IN_PROGRESS')
            OR (m.status = 'COMPLETED' AND DATE(m."completedAt") > d.day))
        LEFT JOIN unit u ON m."unitId" = u.id
        LEFT JOIN property p ON u."propertyId" = p.id
        WHERE p."ownerId" = p_user_id::uuid OR p."ownerId" IS NULL
        GROUP BY d.day
      ) daily_maintenance;

    ELSE
      -- Unknown metric - return empty array
      result := '[]'::jsonb;
  END CASE;

  -- Handle NULL result (no data)
  IF result IS NULL THEN
    result := '[]'::jsonb;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_time_series(text, text, integer) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_time_series IS 'Time-series dashboard data for charts. Supports multiple metrics with configurable day ranges.';
