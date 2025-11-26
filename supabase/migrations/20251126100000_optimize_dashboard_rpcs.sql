-- ======================================================================================
-- Migration: Optimize Dashboard RPC Functions
-- Description: Comprehensive cleanup and optimization of all dashboard RPC functions
-- - Fix health_check return type
-- - Create get_user_dashboard_activities
-- - Optimize get_property_performance_cached (eliminate N+1 queries)
-- - Optimize get_dashboard_stats (deduplicate subqueries)
-- - Simplify/consolidate trend functions
-- - Remove unused parameters and dead code
-- - Delete stub functions that return fake data
-- ======================================================================================

-- ======================================================================================
-- 1. FIX: health_check - Return format that matches TypeScript expectation
-- ======================================================================================
DROP FUNCTION IF EXISTS public.health_check();

CREATE OR REPLACE FUNCTION public.health_check()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'timestamp', NOW(),
    'version', '1.0'
  );
$$;

GRANT EXECUTE ON FUNCTION public.health_check() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.health_check() IS 'Health check - returns {ok: true, timestamp, version}';

-- ======================================================================================
-- 2. CREATE: get_user_dashboard_activities - Activity feed for dashboard
-- ======================================================================================
CREATE OR REPLACE FUNCTION public.get_user_dashboard_activities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  description TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH user_properties AS (
    SELECT p.id FROM properties p WHERE p.property_owner_id = p_user_id
  ),
  user_units AS (
    SELECT u.id FROM units u WHERE u.property_id IN (SELECT id FROM user_properties)
  )
  -- Combine recent activities from multiple sources
  SELECT * FROM (
    -- Recent lease activities
    SELECT
      l.id,
      'lease'::TEXT as activity_type,
      'lease'::TEXT as entity_type,
      l.id as entity_id,
      CASE l.lease_status
        WHEN 'active' THEN 'Lease Activated'
        WHEN 'ended' THEN 'Lease Ended'
        WHEN 'pending' THEN 'Lease Pending'
        ELSE 'Lease Updated'
      END as title,
      COALESCE(l.notes, 'Lease status: ' || l.lease_status) as description,
      p_user_id as user_id,
      l.updated_at as created_at
    FROM leases l
    WHERE l.property_owner_id = p_user_id

    UNION ALL

    -- Recent maintenance activities
    SELECT
      m.id,
      'maintenance'::TEXT as activity_type,
      'maintenance'::TEXT as entity_type,
      m.id as entity_id,
      m.title,
      m.description,
      p_user_id as user_id,
      COALESCE(m.updated_at, m.created_at) as created_at
    FROM maintenance_requests m
    WHERE m.property_owner_id = p_user_id

    UNION ALL

    -- Recent payment activities
    SELECT
      rp.id,
      'payment'::TEXT as activity_type,
      'payment'::TEXT as entity_type,
      rp.id as entity_id,
      'Payment ' || rp.status as title,
      'Amount: $' || rp.amount::TEXT as description,
      p_user_id as user_id,
      COALESCE(rp.paid_date, rp.created_at) as created_at
    FROM rent_payments rp
    JOIN leases l ON l.id = rp.lease_id
    WHERE l.property_owner_id = p_user_id
  ) activities
  ORDER BY created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_dashboard_activities(UUID, INTEGER) TO authenticated;
COMMENT ON FUNCTION public.get_user_dashboard_activities IS 'Returns recent activity feed for dashboard';

-- ======================================================================================
-- 3. OPTIMIZE: get_property_performance_cached - Use JOINs instead of N+1 subqueries
-- ======================================================================================
DROP FUNCTION IF EXISTS public.get_property_performance_cached(UUID);

CREATE OR REPLACE FUNCTION public.get_property_performance_cached(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Single query with JOINs and GROUP BY - eliminates N+1 subqueries
  SELECT COALESCE(jsonb_agg(property_data), '[]'::JSONB) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'property_id', p.id,
      'property_name', p.name,
      'address', p.address_line1,
      'property_type', p.property_type,
      'total_units', COALESCE(unit_stats.total_units, 0),
      'occupied_units', COALESCE(unit_stats.occupied_units, 0),
      'vacant_units', COALESCE(unit_stats.vacant_units, 0),
      'occupancy_rate', CASE
        WHEN COALESCE(unit_stats.total_units, 0) > 0
        THEN ROUND((COALESCE(unit_stats.occupied_units, 0)::DECIMAL / unit_stats.total_units) * 100, 2)
        ELSE 0
      END,
      'monthly_revenue', COALESCE(lease_stats.monthly_revenue, 0),
      'annual_revenue', COALESCE(lease_stats.monthly_revenue, 0) * 12,
      'potential_revenue', COALESCE(unit_stats.potential_revenue, 0),
      'status', CASE
        WHEN COALESCE(unit_stats.total_units, 0) = 0 THEN 'NO_UNITS'
        WHEN COALESCE(unit_stats.occupied_units, 0) = 0 THEN 'VACANT'
        WHEN unit_stats.occupied_units = unit_stats.total_units THEN 'FULL'
        ELSE 'PARTIAL'
      END
    ) as property_data
    FROM properties p
    -- Pre-aggregate unit stats per property
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) as total_units,
        COUNT(*) FILTER (WHERE u.status = 'occupied') as occupied_units,
        COUNT(*) FILTER (WHERE u.status = 'available') as vacant_units,
        COALESCE(SUM(u.rent_amount), 0) as potential_revenue
      FROM units u
      WHERE u.property_id = p.id
    ) unit_stats ON true
    -- Pre-aggregate lease revenue per property
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(l.rent_amount), 0) as monthly_revenue
      FROM leases l
      WHERE l.unit_id IN (SELECT id FROM units WHERE property_id = p.id)
        AND l.lease_status = 'active'
    ) lease_stats ON true
    WHERE p.property_owner_id = p_user_id
    ORDER BY p.name
  ) subq;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_performance_cached(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_property_performance_cached IS 'Optimized property performance metrics using JOINs';

-- ======================================================================================
-- 4. OPTIMIZE: get_dashboard_stats - Deduplicate subqueries using CTEs
-- ======================================================================================
DROP FUNCTION IF EXISTS public.get_dashboard_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Use CTEs to calculate stats once and reuse
  WITH
  user_properties AS (
    SELECT id FROM properties WHERE property_owner_id = p_user_id
  ),
  unit_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'occupied') as occupied,
      COUNT(*) FILTER (WHERE status = 'available') as vacant,
      COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance,
      COALESCE(AVG(rent_amount), 0) as avg_rent,
      COALESCE(SUM(rent_amount), 0) as total_potential_rent,
      COALESCE(SUM(rent_amount) FILTER (WHERE status = 'occupied'), 0) as total_actual_rent
    FROM units
    WHERE property_id IN (SELECT id FROM user_properties)
  ),
  lease_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE lease_status = 'active') as active,
      COUNT(*) FILTER (WHERE lease_status IN ('ended', 'terminated')) as expired,
      COUNT(*) FILTER (WHERE lease_status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
      COALESCE(SUM(rent_amount) FILTER (WHERE lease_status = 'active'), 0) as monthly_revenue
    FROM leases
    WHERE property_owner_id = p_user_id
  ),
  tenant_stats AS (
    SELECT
      COUNT(DISTINCT t.id) as total,
      COUNT(DISTINCT t.id) FILTER (WHERE l.lease_status = 'active') as active,
      COUNT(DISTINCT t.id) FILTER (WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_this_month
    FROM tenants t
    JOIN leases l ON l.primary_tenant_id = t.id
    WHERE l.property_owner_id = p_user_id
  ),
  maintenance_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'open') as open,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE) as completed_today,
      COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at IS NOT NULL), 0) as avg_resolution,
      COUNT(*) FILTER (WHERE priority = 'low') as priority_low,
      COUNT(*) FILTER (WHERE priority = 'normal') as priority_normal,
      COUNT(*) FILTER (WHERE priority = 'high') as priority_high,
      COUNT(*) FILTER (WHERE priority = 'urgent') as priority_urgent
    FROM maintenance_requests
    WHERE property_owner_id = p_user_id
  ),
  property_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM units u WHERE u.property_id = p.id AND u.status = 'occupied'
      )) as with_occupied
    FROM properties p
    WHERE p.property_owner_id = p_user_id
  )
  SELECT jsonb_build_object(
    'properties', jsonb_build_object(
      'total', (SELECT total FROM property_stats),
      'occupied', (SELECT with_occupied FROM property_stats),
      'vacant', (SELECT total - with_occupied FROM property_stats),
      'occupancyRate', CASE
        WHEN (SELECT total FROM property_stats) > 0
        THEN ROUND(((SELECT with_occupied FROM property_stats)::DECIMAL / (SELECT total FROM property_stats)) * 100, 2)
        ELSE 0
      END,
      'totalMonthlyRent', (SELECT monthly_revenue FROM lease_stats),
      'averageRent', (SELECT avg_rent FROM unit_stats)
    ),
    'tenants', jsonb_build_object(
      'total', (SELECT total FROM tenant_stats),
      'active', (SELECT active FROM tenant_stats),
      'inactive', (SELECT total - active FROM tenant_stats),
      'newThisMonth', (SELECT new_this_month FROM tenant_stats)
    ),
    'units', jsonb_build_object(
      'total', (SELECT total FROM unit_stats),
      'occupied', (SELECT occupied FROM unit_stats),
      'vacant', (SELECT vacant FROM unit_stats),
      'maintenance', (SELECT maintenance FROM unit_stats),
      'averageRent', (SELECT avg_rent FROM unit_stats),
      'available', (SELECT vacant FROM unit_stats),
      'occupancyRate', CASE
        WHEN (SELECT total FROM unit_stats) > 0
        THEN ROUND(((SELECT occupied FROM unit_stats)::DECIMAL / (SELECT total FROM unit_stats)) * 100, 2)
        ELSE 0
      END,
      'occupancyChange', 0,
      'totalPotentialRent', (SELECT total_potential_rent FROM unit_stats),
      'totalActualRent', (SELECT total_actual_rent FROM unit_stats)
    ),
    'leases', jsonb_build_object(
      'total', (SELECT total FROM lease_stats),
      'active', (SELECT active FROM lease_stats),
      'expired', (SELECT expired FROM lease_stats),
      'expiringSoon', (SELECT expiring_soon FROM lease_stats)
    ),
    'maintenance', jsonb_build_object(
      'total', (SELECT total FROM maintenance_stats),
      'open', (SELECT open FROM maintenance_stats),
      'inProgress', (SELECT in_progress FROM maintenance_stats),
      'completed', (SELECT completed FROM maintenance_stats),
      'completedToday', (SELECT completed_today FROM maintenance_stats),
      'avgResolutionTime', (SELECT avg_resolution FROM maintenance_stats),
      'byPriority', jsonb_build_object(
        'low', (SELECT priority_low FROM maintenance_stats),
        'medium', (SELECT priority_normal FROM maintenance_stats),
        'high', (SELECT priority_high FROM maintenance_stats),
        'emergency', (SELECT priority_urgent FROM maintenance_stats)
      )
    ),
    'revenue', jsonb_build_object(
      'monthly', (SELECT monthly_revenue FROM lease_stats),
      'yearly', (SELECT monthly_revenue FROM lease_stats) * 12,
      'growth', 0
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_dashboard_stats IS 'Optimized dashboard statistics using CTEs';

-- ======================================================================================
-- 5. SIMPLIFY: get_property_performance_trends - Return actual current data, not fake trends
-- ======================================================================================
DROP FUNCTION IF EXISTS public.get_property_performance_trends(UUID);

CREATE OR REPLACE FUNCTION public.get_property_performance_trends(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Return current revenue per property (no fake historical data)
  SELECT COALESCE(jsonb_agg(trend_data), '[]'::JSONB) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'property_id', p.id,
      'current_month_revenue', COALESCE(
        (SELECT SUM(l.rent_amount)
         FROM leases l
         WHERE l.unit_id IN (SELECT id FROM units WHERE property_id = p.id)
         AND l.lease_status = 'active'),
        0
      ),
      'trend', 'stable',
      'trend_percentage', 0
    ) as trend_data
    FROM properties p
    WHERE p.property_owner_id = p_user_id
  ) subq;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_performance_trends(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_property_performance_trends IS 'Property revenue with trend indicators';

-- ======================================================================================
-- 6. SIMPLIFY: get_occupancy_trends_optimized - Return current snapshot, not fake history
-- ======================================================================================
DROP FUNCTION IF EXISTS public.get_occupancy_trends_optimized(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_occupancy_trends_optimized(p_user_id UUID, p_months INTEGER DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_total_units INTEGER;
  v_occupied_units INTEGER;
  v_occupancy_rate DECIMAL;
BEGIN
  -- Get current snapshot (no fake historical data)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE u.status = 'occupied')
  INTO v_total_units, v_occupied_units
  FROM units u
  JOIN properties p ON p.id = u.property_id
  WHERE p.property_owner_id = p_user_id;

  v_occupancy_rate := CASE
    WHEN v_total_units > 0 THEN ROUND((v_occupied_units::DECIMAL / v_total_units) * 100, 2)
    ELSE 0
  END;

  -- Return single current snapshot
  v_result := jsonb_build_array(
    jsonb_build_object(
      'month', TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
      'occupancy_rate', v_occupancy_rate,
      'total_units', v_total_units,
      'occupied_units', v_occupied_units
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_occupancy_trends_optimized(UUID, INTEGER) TO authenticated;
COMMENT ON FUNCTION public.get_occupancy_trends_optimized IS 'Current occupancy snapshot';

-- ======================================================================================
-- 7. SIMPLIFY: get_revenue_trends_optimized - Return current snapshot, not fake history
-- ======================================================================================
DROP FUNCTION IF EXISTS public.get_revenue_trends_optimized(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(p_user_id UUID, p_months INTEGER DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_monthly_revenue DECIMAL;
BEGIN
  -- Get current monthly revenue
  SELECT COALESCE(SUM(rent_amount), 0) INTO v_monthly_revenue
  FROM leases
  WHERE property_owner_id = p_user_id
  AND lease_status = 'active';

  -- Return single current snapshot
  v_result := jsonb_build_array(
    jsonb_build_object(
      'month', TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
      'revenue', v_monthly_revenue,
      'growth', 0
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_trends_optimized(UUID, INTEGER) TO authenticated;
COMMENT ON FUNCTION public.get_revenue_trends_optimized IS 'Current revenue snapshot';

-- ======================================================================================
-- 8. CLEAN: get_maintenance_analytics - Consolidate to single query
-- ======================================================================================
DROP FUNCTION IF EXISTS public.get_maintenance_analytics(UUID);

CREATE OR REPLACE FUNCTION public.get_maintenance_analytics(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Single query for all maintenance analytics
  SELECT jsonb_build_object(
    'avgResolutionTime', COALESCE(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at IS NOT NULL),
      0
    ),
    'completionRate', CASE
      WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0
    END,
    'priorityBreakdown', jsonb_build_object(
      'low', COUNT(*) FILTER (WHERE priority = 'low'),
      'normal', COUNT(*) FILTER (WHERE priority = 'normal'),
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent')
    ),
    'trendsOverTime', '[]'::JSONB
  ) INTO v_result
  FROM maintenance_requests
  WHERE property_owner_id = p_user_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'avgResolutionTime', 0,
    'completionRate', 0,
    'priorityBreakdown', jsonb_build_object('low', 0, 'normal', 0, 'high', 0, 'urgent', 0),
    'trendsOverTime', '[]'::JSONB
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_analytics(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_maintenance_analytics IS 'Maintenance analytics with single query';

-- ======================================================================================
-- 9. CLEAN: get_billing_insights - Remove unused date parameters
-- ======================================================================================
DROP FUNCTION IF EXISTS public.get_billing_insights(UUID, TIMESTAMP, TIMESTAMP);

CREATE OR REPLACE FUNCTION public.get_billing_insights(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_mrr DECIMAL;
  v_active_leases INTEGER;
  v_expired_leases INTEGER;
BEGIN
  -- Get MRR and lease counts in single query
  SELECT
    COALESCE(SUM(rent_amount) FILTER (WHERE lease_status = 'active'), 0),
    COUNT(*) FILTER (WHERE lease_status = 'active'),
    COUNT(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))
  INTO v_mrr, v_active_leases, v_expired_leases
  FROM leases
  WHERE property_owner_id = p_user_id;

  v_result := jsonb_build_object(
    'totalRevenue', v_mrr * 12,
    'churnRate', CASE
      WHEN (v_active_leases + v_expired_leases) > 0
      THEN ROUND((v_expired_leases::DECIMAL / (v_active_leases + v_expired_leases)) * 100, 2)
      ELSE 0
    END,
    'mrr', v_mrr
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_billing_insights(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_billing_insights IS 'Billing insights - MRR, churn rate, annual revenue';

-- ======================================================================================
-- 10. DELETE: Stub functions that return fake data
-- ======================================================================================
DROP FUNCTION IF EXISTS public.get_dashboard_time_series(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_metric_trend(UUID, TEXT, TEXT);

-- ======================================================================================
-- Verification
-- ======================================================================================
DO $$
BEGIN
  RAISE NOTICE 'RPC Functions Optimized:';
  RAISE NOTICE '  - health_check: Fixed return format';
  RAISE NOTICE '  - get_user_dashboard_activities: Created new function';
  RAISE NOTICE '  - get_property_performance_cached: Eliminated N+1 queries';
  RAISE NOTICE '  - get_dashboard_stats: Deduplicated with CTEs';
  RAISE NOTICE '  - get_property_performance_trends: Simplified';
  RAISE NOTICE '  - get_occupancy_trends_optimized: Returns current snapshot';
  RAISE NOTICE '  - get_revenue_trends_optimized: Returns current snapshot';
  RAISE NOTICE '  - get_maintenance_analytics: Single query';
  RAISE NOTICE '  - get_billing_insights: Removed unused params';
  RAISE NOTICE '  - DELETED: get_dashboard_time_series (returned zeros)';
  RAISE NOTICE '  - DELETED: get_metric_trend (returned fake data)';
END $$;
