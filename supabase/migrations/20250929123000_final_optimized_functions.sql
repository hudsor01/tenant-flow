-- Final Optimized RPC Functions for Performance Enhancement
-- Created: 2025-09-29
-- Purpose: Replace complex multi-query patterns with single optimized functions

-- Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS get_dashboard_fallback_stats_optimized(UUID);
DROP FUNCTION IF EXISTS get_occupancy_trends_optimized(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_revenue_trends_optimized(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_maintenance_analytics_optimized(UUID);

-- ================================================================================================
-- DASHBOARD FALLBACK STATS RPC - Final Version
-- ================================================================================================

CREATE OR REPLACE FUNCTION get_dashboard_fallback_stats_optimized(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Single comprehensive query for all statistics
  SELECT json_build_object(
    'properties', json_build_object(
      'total', COALESCE(COUNT(DISTINCT p.id), 0),
      'active', COALESCE(COUNT(DISTINCT p.id), 0),
      'maintenance', 0
    ),
    'tenants', json_build_object(
      'total', COALESCE(COUNT(DISTINCT t.id), 0),
      'active', COALESCE(COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN t.id END), 0),
      'new', COALESCE(COUNT(DISTINCT CASE WHEN t."createdAt" >= (CURRENT_DATE - INTERVAL '30 days') THEN t.id END), 0)
    ),
    'units', json_build_object(
      'total', COALESCE(COUNT(DISTINCT u.id), 0),
      'occupied', COALESCE(COUNT(DISTINCT CASE WHEN u.status = 'OCCUPIED' THEN u.id END), 0),
      'vacant', COALESCE(COUNT(DISTINCT CASE WHEN u.status = 'VACANT' THEN u.id END), 0)
    ),
    'revenue', json_build_object(
      'monthly', COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."monthlyRent" END), 0),
      'annual', COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l."monthlyRent" END), 0) * 12,
      'growth', 0
    ),
    'occupancyRate',
    CASE
      WHEN COUNT(DISTINCT u.id) > 0 THEN
        (COUNT(DISTINCT CASE WHEN u.status = 'OCCUPIED' THEN u.id END)::FLOAT / COUNT(DISTINCT u.id)::FLOAT) * 100
      ELSE 0
    END
  ) INTO result
  FROM "Property" p
  LEFT JOIN "Unit" u ON u."propertyId" = p.id
  LEFT JOIN "Lease" l ON l."unitId" = u.id
  LEFT JOIN "Tenant" t ON t.id = l."tenantId"
  WHERE p."ownerId" = p_user_id;

  RETURN COALESCE(result, json_build_object(
    'properties', json_build_object('total', 0, 'active', 0, 'maintenance', 0),
    'tenants', json_build_object('total', 0, 'active', 0, 'new', 0),
    'units', json_build_object('total', 0, 'occupied', 0, 'vacant', 0),
    'revenue', json_build_object('monthly', 0, 'annual', 0, 'growth', 0),
    'occupancyRate', 0
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- ================================================================================================
-- OCCUPANCY TRENDS RPC - Final Version
-- ================================================================================================

CREATE OR REPLACE FUNCTION get_occupancy_trends_optimized(p_user_id UUID, p_months INTEGER DEFAULT 12)
RETURNS TABLE(
  month TEXT,
  occupancy_rate INTEGER,
  total_units INTEGER,
  occupied_units INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH month_series AS (
    SELECT
      generate_series(
        date_trunc('month', CURRENT_DATE - INTERVAL '1 month' * (p_months - 1)),
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) as month_start
  ),
  monthly_stats AS (
    SELECT
      ms.month_start,
      COUNT(u.id) as total_units,
      COUNT(CASE
        WHEN EXISTS (
          SELECT 1 FROM "Lease" l
          WHERE l."unitId" = u.id
            AND l.status = 'ACTIVE'
            AND l."startDate" <= (ms.month_start + INTERVAL '1 month' - INTERVAL '1 day')
            AND l."endDate" >= ms.month_start
        ) THEN 1
      END) as occupied_units
    FROM month_series ms
    CROSS JOIN "Unit" u
    JOIN "Property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
      AND u."createdAt" <= (ms.month_start + INTERVAL '1 month' - INTERVAL '1 day')
    GROUP BY ms.month_start
  )
  SELECT
    to_char(mst.month_start, 'YYYY-MM') as month,
    CASE
      WHEN mst.total_units > 0 THEN ROUND((mst.occupied_units::FLOAT / mst.total_units::FLOAT) * 100)::INTEGER
      ELSE 0
    END as occupancy_rate,
    mst.total_units::INTEGER,
    mst.occupied_units::INTEGER
  FROM monthly_stats mst
  ORDER BY mst.month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- ================================================================================================
-- REVENUE TRENDS RPC - Final Version
-- ================================================================================================

CREATE OR REPLACE FUNCTION get_revenue_trends_optimized(p_user_id UUID, p_months INTEGER DEFAULT 12)
RETURNS TABLE(
  month TEXT,
  revenue NUMERIC,
  growth INTEGER,
  previous_period_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH month_series AS (
    SELECT
      generate_series(
        date_trunc('month', CURRENT_DATE - INTERVAL '1 month' * (p_months - 1)),
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) as month_start
  ),
  monthly_revenue AS (
    SELECT
      ms.month_start,
      COALESCE(SUM(rp.amount), 0) / 100.0 as current_revenue,
      LAG(COALESCE(SUM(rp.amount), 0) / 100.0) OVER (ORDER BY ms.month_start) as prev_revenue
    FROM month_series ms
    LEFT JOIN "RentPayments" rp ON EXISTS (
        SELECT 1 FROM "Lease" l
        JOIN "Unit" u ON l."unitId" = u.id
        JOIN "Property" p ON u."propertyId" = p.id
        WHERE p."ownerId" = p_user_id
          AND rp."tenantId" = l."tenantId"
          AND rp.status = 'SUCCEEDED'
          AND rp."paidAt" >= ms.month_start
          AND rp."paidAt" < (ms.month_start + INTERVAL '1 month')
      )
    GROUP BY ms.month_start
    ORDER BY ms.month_start
  )
  SELECT
    to_char(mr.month_start, 'YYYY-MM') as month,
    mr.current_revenue as revenue,
    CASE
      WHEN mr.prev_revenue > 0 THEN
        ROUND(((mr.current_revenue - mr.prev_revenue) / mr.prev_revenue) * 100)::INTEGER
      ELSE 0
    END as growth,
    COALESCE(mr.prev_revenue, 0) as previous_period_revenue
  FROM monthly_revenue mr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- ================================================================================================
-- MAINTENANCE ANALYTICS RPC - Final Version
-- ================================================================================================

CREATE OR REPLACE FUNCTION get_maintenance_analytics_optimized(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Single comprehensive query for maintenance analytics
  SELECT json_build_object(
    'avgResolutionTime', COALESCE(
      AVG(
        CASE
          WHEN mr.status = 'COMPLETED' AND mr."completedAt" IS NOT NULL THEN
            EXTRACT(epoch FROM (mr."completedAt" - mr."createdAt")) / 86400
          ELSE NULL
        END
      ), 0
    ),
    'completionRate',
    CASE
      WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN mr.status = 'COMPLETED' THEN 1 END)::FLOAT / COUNT(*)::FLOAT) * 100
      ELSE 0
    END,
    'priorityBreakdown', (
      SELECT json_object_agg(priority_val, priority_count)
      FROM (
        SELECT mr2.priority as priority_val, COUNT(*) as priority_count
        FROM "MaintenanceRequest" mr2
        JOIN "Property" p2 ON mr2."propertyId" = p2.id
        WHERE p2."ownerId" = p_user_id
        GROUP BY mr2.priority
      ) priority_agg
    ),
    'trendsOverTime', COALESCE(
      (SELECT json_agg(trend_data ORDER BY month_date)
       FROM (
         SELECT
           date_trunc('month', mr3."completedAt") as month_date,
           json_build_object(
             'month', to_char(date_trunc('month', mr3."completedAt"), 'YYYY-MM'),
             'completed', COUNT(*),
             'avgResolutionDays', AVG(EXTRACT(epoch FROM (mr3."completedAt" - mr3."createdAt")) / 86400)
           ) as trend_data
         FROM "MaintenanceRequest" mr3
         JOIN "Property" p3 ON mr3."propertyId" = p3.id
         WHERE p3."ownerId" = p_user_id
           AND mr3.status = 'COMPLETED'
           AND mr3."completedAt" >= (CURRENT_DATE - INTERVAL '6 months')
         GROUP BY date_trunc('month', mr3."completedAt")
       ) trends
      ), json_build_array()
    )
  ) INTO result
  FROM "MaintenanceRequest" mr
  JOIN "Property" p ON mr."propertyId" = p.id
  WHERE p."ownerId" = p_user_id;

  RETURN COALESCE(result, json_build_object(
    'avgResolutionTime', 0,
    'completionRate', 0,
    'priorityBreakdown', json_build_object(),
    'trendsOverTime', json_build_array()
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ================================================================================================
-- PERMISSIONS
-- ================================================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_fallback_stats_optimized(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_occupancy_trends_optimized(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_trends_optimized(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_maintenance_analytics_optimized(UUID) TO authenticated;

-- Add RLS bypass for admin operations
GRANT EXECUTE ON FUNCTION get_dashboard_fallback_stats_optimized(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_occupancy_trends_optimized(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_revenue_trends_optimized(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_maintenance_analytics_optimized(UUID) TO service_role;