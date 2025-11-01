-- Migration: Create get_dashboard_stats_optimized function
-- Date: 2025-01-11
--
-- This migration creates the optimized dashboard stats function that the
-- wrapper function depends on. This function is called by get_dashboard_stats
-- (created in 20250111_fix_rpc_functions.sql)
--
-- WHY THIS MIGRATION EXISTS:
-- The function previously existed in production but was missing from the
-- migration set, causing failures in dev/staging environments. This migration
-- ensures the function is properly defined for all environments.

-- ============================================================================
-- Create get_dashboard_stats_optimized function
-- ============================================================================
-- This function aggregates dashboard statistics for a user
-- Parameters:
--   p_internal_user_id: The internal user ID (typically UUID as text)
--   p_supabase_auth_id: The Supabase auth.uid() value (for RLS bypass if needed)
-- Returns: JSONB object containing dashboard statistics

CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized(
  p_internal_user_id text,
  p_supabase_auth_id text
)
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
  WHERE p."ownerId" = p_internal_user_id::uuid;

  -- Tenants statistics
  SELECT jsonb_build_object(
    'total', COALESCE(COUNT(DISTINCT t.id), 0),
    'active', COALESCE(COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN t.id END), 0)
  ) INTO tenants_stats
  FROM tenant t
  JOIN lease l ON t.id = l."tenantId"
  JOIN unit u ON l."unitId" = u.id
  JOIN property p ON u."propertyId" = p.id
  WHERE p."ownerId" = p_internal_user_id::uuid;

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
  WHERE p."ownerId" = p_internal_user_id::uuid;

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
  WHERE p."ownerId" = p_internal_user_id::uuid;

  -- Maintenance statistics
  SELECT jsonb_build_object(
    'total', COALESCE(COUNT(*), 0),
    'pending', COALESCE(COUNT(CASE WHEN m.status = 'PENDING' THEN 1 END), 0),
    'in_progress', COALESCE(COUNT(CASE WHEN m.status = 'IN_PROGRESS' THEN 1 END), 0)
  ) INTO maintenance_stats
  FROM maintenance_request m
  JOIN unit u ON m."unitId" = u.id
  JOIN property p ON u."propertyId" = p.id
  WHERE p."ownerId" = p_internal_user_id::uuid;

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
  WHERE p."ownerId" = p_internal_user_id::uuid;

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_optimized(text, text) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_stats_optimized IS 'Optimized dashboard statistics aggregation function. Called by get_dashboard_stats wrapper for backward compatibility. Uses SECURITY DEFINER to bypass RLS and aggregate across all user properties.';
