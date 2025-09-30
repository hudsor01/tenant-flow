-- Optimized RPC Functions for Performance Enhancement
-- Created: 2025-09-29
-- Purpose: Replace complex multi-query patterns with single optimized functions

-- ================================================================================================
-- DASHBOARD FALLBACK STATS RPC
-- Replaces Promise.all with 4+ queries in frontend
-- ================================================================================================

CREATE OR REPLACE FUNCTION get_dashboard_fallback_stats_optimized(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  property_ids UUID[];
  unit_ids UUID[];
BEGIN
  -- Get user's property IDs (single query)
  SELECT ARRAY_AGG(id) INTO property_ids
  FROM "Property"
  WHERE "ownerId" = p_user_id;

  -- Early exit if no properties
  IF property_ids IS NULL OR array_length(property_ids, 1) = 0 THEN
    RETURN json_build_object(
      'properties', json_build_object('total', 0, 'active', 0, 'maintenance', 0),
      'tenants', json_build_object('total', 0, 'active', 0, 'new', 0),
      'units', json_build_object('total', 0, 'occupied', 0, 'vacant', 0),
      'revenue', json_build_object('monthly', 0, 'annual', 0, 'growth', 0),
      'occupancyRate', 0
    );
  END IF;

  -- Get unit IDs for user's properties
  SELECT ARRAY_AGG(id) INTO unit_ids
  FROM "Unit"
  WHERE "propertyId" = ANY(property_ids);

  -- Single comprehensive query for all statistics
  WITH property_stats AS (
    SELECT
      COUNT(*) as total_properties,
      COUNT(*) as active_properties,
      0 as maintenance_properties
    FROM "Property"
    WHERE "ownerId" = p_user_id
  ),
  unit_stats AS (
    SELECT
      COUNT(*) as total_units,
      COUNT(CASE WHEN status = 'OCCUPIED' THEN 1 END) as occupied_units,
      COUNT(CASE WHEN status = 'VACANT' THEN 1 END) as vacant_units
    FROM "Unit"
    WHERE "propertyId" = ANY(property_ids)
  ),
  tenant_stats AS (
    SELECT
      COUNT(DISTINCT t.id) as total_tenants,
      COUNT(DISTINCT CASE WHEN l.status = 'ACTIVE' THEN t.id END) as active_tenants,
      COUNT(DISTINCT CASE WHEN t."createdAt" >= (CURRENT_DATE - INTERVAL '30 days') THEN t.id END) as new_tenants
    FROM "Tenant" t
    LEFT JOIN "Lease" l ON t.id = l."tenantId"
    WHERE t."userId" = p_user_id
  ),
  revenue_stats AS (
    SELECT
      COALESCE(SUM(l."monthlyRent"), 0) as monthly_revenue
    FROM "Lease" l
    JOIN "Unit" u ON l."unitId" = u.id
    WHERE u."propertyId" = ANY(property_ids)
      AND l.status = 'ACTIVE'
  )
  SELECT json_build_object(
    'properties', json_build_object(
      'total', ps.total_properties,
      'active', ps.active_properties,
      'maintenance', ps.maintenance_properties
    ),
    'tenants', json_build_object(
      'total', ts.total_tenants,
      'active', ts.active_tenants,
      'new', ts.new_tenants
    ),
    'units', json_build_object(
      'total', us.total_units,
      'occupied', us.occupied_units,
      'vacant', us.vacant_units
    ),
    'revenue', json_build_object(
      'monthly', rs.monthly_revenue,
      'annual', rs.monthly_revenue * 12,
      'growth', 0
    ),
    'occupancyRate',
    CASE
      WHEN us.total_units > 0 THEN (us.occupied_units::FLOAT / us.total_units::FLOAT) * 100
      ELSE 0
    END
  ) INTO result
  FROM property_stats ps, unit_stats us, tenant_stats ts, revenue_stats rs;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================================================
-- OCCUPANCY TRENDS RPC
-- Replaces 12-iteration loop with single optimized query
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
  WITH property_ids AS (
    SELECT id FROM "Property" WHERE "ownerId" = p_user_id
  ),
  month_series AS (
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
    JOIN property_ids p ON u."propertyId" = p.id
    WHERE u."createdAt" <= (ms.month_start + INTERVAL '1 month' - INTERVAL '1 day')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================================================
-- REVENUE TRENDS RPC
-- Replaces 12-iteration loop with single optimized query
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
  WITH property_ids AS (
    SELECT id FROM "Property" WHERE "ownerId" = p_user_id
  ),
  unit_ids AS (
    SELECT u.id FROM "Unit" u JOIN property_ids p ON u."propertyId" = p.id
  ),
  tenant_ids AS (
    SELECT DISTINCT l."tenantId"
    FROM "Lease" l
    JOIN unit_ids u ON l."unitId" = u.id
  ),
  month_series AS (
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
    LEFT JOIN "RentPayments" rp ON rp."tenantId" IN (SELECT tenantId FROM tenant_ids)
      AND rp.status = 'SUCCEEDED'
      AND rp."paidAt" >= ms.month_start
      AND rp."paidAt" < (ms.month_start + INTERVAL '1 month')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================================================
-- MAINTENANCE ANALYTICS RPC
-- Consolidates multiple maintenance queries into single optimized function
-- ================================================================================================

CREATE OR REPLACE FUNCTION get_maintenance_analytics_optimized(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  property_ids UUID[];
BEGIN
  -- Get user's property IDs
  SELECT ARRAY_AGG(id) INTO property_ids
  FROM "Property"
  WHERE "ownerId" = p_user_id;

  -- Early exit if no properties
  IF property_ids IS NULL OR array_length(property_ids, 1) = 0 THEN
    RETURN json_build_object(
      'avgResolutionTime', 0,
      'completionRate', 0,
      'priorityBreakdown', json_build_object(),
      'trendsOverTime', json_build_array()
    );
  END IF;

  -- Single comprehensive query for maintenance analytics
  WITH maintenance_stats AS (
    SELECT
      COUNT(*) as total_requests,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_requests,
      AVG(
        CASE
          WHEN status = 'COMPLETED' AND "completedAt" IS NOT NULL THEN
            EXTRACT(epoch FROM ("completedAt" - "createdAt")) / 86400
          ELSE NULL
        END
      ) as avg_resolution_days,
      json_object_agg(
        priority,
        COUNT(*)
      ) as priority_breakdown
    FROM "MaintenanceRequest" mr
    WHERE mr."propertyId" = ANY(property_ids)
  ),
  monthly_trends AS (
    SELECT
      json_agg(
        json_build_object(
          'month', to_char(date_trunc('month', "completedAt"), 'YYYY-MM'),
          'completed', COUNT(*),
          'avgResolutionDays', AVG(
            EXTRACT(epoch FROM ("completedAt" - "createdAt")) / 86400
          )
        ) ORDER BY date_trunc('month', "completedAt")
      ) as trends
    FROM "MaintenanceRequest" mr
    WHERE mr."propertyId" = ANY(property_ids)
      AND status = 'COMPLETED'
      AND "completedAt" >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY date_trunc('month', "completedAt")
  )
  SELECT json_build_object(
    'avgResolutionTime', COALESCE(ms.avg_resolution_days, 0),
    'completionRate',
    CASE
      WHEN ms.total_requests > 0 THEN (ms.completed_requests::FLOAT / ms.total_requests::FLOAT) * 100
      ELSE 0
    END,
    'priorityBreakdown', COALESCE(ms.priority_breakdown, json_build_object()),
    'trendsOverTime', COALESCE(mt.trends, json_build_array())
  ) INTO result
  FROM maintenance_stats ms, monthly_trends mt;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================================================

-- Ensure optimal performance for the new RPC functions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_owner_id_optimized ON "Property"("ownerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unit_property_id_optimized ON "Unit"("propertyId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unit_status_property_id ON "Unit"("propertyId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_unit_status ON "Lease"("unitId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_dates_status ON "Lease"("startDate", "endDate", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_payments_tenant_status ON "RentPayments"("tenantId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_payments_paid_at ON "RentPayments"("paidAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_property_status ON "MaintenanceRequest"("propertyId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_completed_at ON "MaintenanceRequest"("completedAt");

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