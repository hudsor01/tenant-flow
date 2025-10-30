-- Materialized View for Dashboard Stats
-- Pre-aggregated data for instant dashboard loads
-- Refresh strategy: Every 5 minutes or on-demand

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats_mv AS
SELECT
  p."ownerId" as user_id,
  
  -- Property aggregations
  COUNT(DISTINCT p.id) as total_properties,
  COUNT(DISTINCT p.id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM unit u2
      WHERE u2."propertyId" = p.id
      AND u2.status = 'OCCUPIED'
    )
  ) as occupied_properties,
  
  -- Unit aggregations
  COUNT(DISTINCT u.id) as total_units,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED') as occupied_units,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'VACANT') as vacant_units,
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'MAINTENANCE') as maintenance_units,
  COALESCE(SUM(u.rent), 0) as total_potential_rent,
  COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0) as total_actual_rent,
  COALESCE(AVG(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0) as average_unit_rent,
  
  -- Lease aggregations
  COUNT(DISTINCT l.id) as total_leases,
  COUNT(DISTINCT l.id) FILTER (
    WHERE l.status = 'ACTIVE' 
      AND (l."startDate" IS NULL OR l."startDate" <= NOW())
      AND (l."endDate" IS NULL OR l."endDate" >= NOW())
  ) as active_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l."endDate" < NOW()) as expired_leases,
  COUNT(DISTINCT l.id) FILTER (
    WHERE l.status = 'ACTIVE'
      AND l."endDate" IS NOT NULL
      AND l."endDate" >= NOW()
      AND l."endDate" <= NOW() + INTERVAL '30 days'
  ) as expiring_soon_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'TERMINATED') as terminated_leases,
  COALESCE(SUM(COALESCE(l."rentAmount", l."monthlyRent")) FILTER (
    WHERE l.status = 'ACTIVE'
      AND (l."startDate" IS NULL OR l."startDate" <= NOW())
      AND (l."endDate" IS NULL OR l."endDate" >= NOW())
  ), 0) as total_lease_rent,
  COALESCE(SUM(l."securityDeposit"), 0) as total_security_deposits,
  
  -- Tenant aggregations  
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'ACTIVE') as active_tenants,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('INACTIVE', 'EVICTED', 'MOVED_OUT', 'ARCHIVED')) as inactive_tenants,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status = 'ACTIVE'
    AND t."createdAt" >= date_trunc('month', NOW())
  ) as new_tenants_this_month,
  
  -- Maintenance aggregations
  COUNT(DISTINCT m.id) as total_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status IN ('OPEN', 'ON_HOLD')) as open_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'IN_PROGRESS') as in_progress_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status IN ('COMPLETED', 'CLOSED')) as completed_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.priority = 'EMERGENCY') as emergency_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.priority = 'LOW') as low_priority_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.priority = 'MEDIUM') as medium_priority_maintenance,
  COUNT(DISTINCT m.id) FILTER (WHERE m.priority = 'HIGH') as high_priority_maintenance,
  COUNT(DISTINCT m.id) FILTER (
    WHERE m.status IN ('COMPLETED', 'CLOSED')
    AND m."updatedAt"::date = CURRENT_DATE
  ) as completed_today_maintenance,
  COALESCE(
    AVG(
      EXTRACT(EPOCH FROM (m."updatedAt" - m."createdAt")) / 3600
    ) FILTER (WHERE m.status IN ('COMPLETED', 'CLOSED')),
    0
  ) as avg_resolution_time_hours,
  
  -- Revenue aggregations
  COALESCE(
    SUM(rp."netAmount") FILTER (
      WHERE rp.status = 'SUCCEEDED'
      AND rp."paidAt" >= date_trunc('month', NOW())
    ),
    0
  ) as monthly_revenue,
  COALESCE(
    SUM(rp."netAmount") FILTER (
      WHERE rp.status = 'SUCCEEDED'
      AND rp."paidAt" >= date_trunc('year', NOW())
    ),
    0
  ) as yearly_revenue,
  COALESCE(
    SUM(rp."netAmount") FILTER (
      WHERE rp.status = 'SUCCEEDED'
      AND rp."paidAt" >= date_trunc('month', NOW() - INTERVAL '1 month')
      AND rp."paidAt" < date_trunc('month', NOW())
    ),
    0
  ) as previous_month_revenue,
  
  -- Calculated fields
  CASE 
    WHEN COUNT(DISTINCT u.id) > 0 
    THEN ROUND((COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED')::numeric / COUNT(DISTINCT u.id)) * 100, 2)
    ELSE 0
  END as occupancy_rate,
  
  -- Occupancy change calculated from historical data
  -- Returns 30-day change, or 0 if no history exists
  COALESCE((
    SELECT ROUND((
      CASE 
        WHEN COUNT(DISTINCT u.id) > 0 
        THEN (COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED')::numeric / COUNT(DISTINCT u.id)) * 100
        ELSE 0
      END - h.occupancy_rate
    )::numeric, 2)
    FROM dashboard_stats_history h
    WHERE h.user_id = p."ownerId"
      AND h.snapshot_date = CURRENT_DATE - 30
    ORDER BY h.snapshot_timestamp DESC
    LIMIT 1
  ), 0) as occupancy_change_percentage,
  
  NOW() as last_updated

FROM property p
LEFT JOIN unit u ON u."propertyId" = p.id
LEFT JOIN lease l ON l."unitId" = u.id
LEFT JOIN tenant t ON t.id = l."tenantId"
LEFT JOIN maintenance_request m ON m."unitId" = u.id
LEFT JOIN rent_payments rp ON rp."tenantId" = t.id
GROUP BY p."ownerId";

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_mv_user_id 
ON dashboard_stats_mv(user_id);

-- Create additional indexes for common filters
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_mv_occupancy 
ON dashboard_stats_mv(occupancy_rate DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_stats_mv_last_updated 
ON dashboard_stats_mv(last_updated DESC);

-- Initial population
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats_mv;

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_stats_mv()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats_mv;
END;
$$;

-- Grant permissions
-- SELECT permission for authenticated users to read the materialized view
GRANT SELECT ON dashboard_stats_mv TO authenticated;

-- SECURITY: Refresh function restricted to service_role only
-- Materialized view refreshes are expensive and should only be triggered by:
-- 1. Scheduled cron jobs (e.g., pg_cron running as service_role)
-- 2. Admin operations via service_role
-- NEVER allow authenticated users to trigger refreshes directly
REVOKE ALL ON FUNCTION refresh_dashboard_stats_mv() FROM PUBLIC;
REVOKE ALL ON FUNCTION refresh_dashboard_stats_mv() FROM authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats_mv() TO service_role;

-- Optimized function to get dashboard stats from materialized view
CREATE OR REPLACE FUNCTION get_dashboard_stats_fast(p_internal_user_id TEXT)
RETURNS JSON
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'properties', json_build_object(
      'total', COALESCE(total_properties, 0),
      'occupied', COALESCE(occupied_properties, 0),
      'vacant', COALESCE(total_properties - occupied_properties, 0),
      'occupancyRate', COALESCE(occupancy_rate, 0),
      'totalMonthlyRent', COALESCE(total_lease_rent, 0),
      'averageRent', COALESCE(
        CASE 
          WHEN occupied_properties > 0
          THEN ROUND((total_lease_rent / occupied_properties)::numeric, 2)
          ELSE 0
        END,
        0
      )
    ),
    'units', json_build_object(
      'total', COALESCE(total_units, 0),
      'occupied', COALESCE(occupied_units, 0),
      'vacant', COALESCE(vacant_units, 0),
      'maintenance', COALESCE(maintenance_units, 0),
      'available', COALESCE(vacant_units, 0),
      'averageRent', COALESCE(ROUND(average_unit_rent::numeric, 2), 0),
      'totalPotentialRent', COALESCE(ROUND(total_potential_rent::numeric, 2), 0),
      'totalActualRent', COALESCE(ROUND(total_actual_rent::numeric, 2), 0),
      'occupancyRate', COALESCE(occupancy_rate, 0),
      'occupancyChange', COALESCE(occupancy_change_percentage, 0)
    ),
    'leases', json_build_object(
      'total', COALESCE(total_leases, 0),
      'active', COALESCE(active_leases, 0),
      'expired', COALESCE(expired_leases, 0),
      'expiringSoon', COALESCE(expiring_soon_leases, 0),
      'terminated', COALESCE(terminated_leases, 0),
      'totalMonthlyRent', COALESCE(ROUND(total_lease_rent::numeric, 2), 0),
      'averageRent', COALESCE(
        CASE 
          WHEN active_leases > 0
          THEN ROUND((total_lease_rent / active_leases)::numeric, 2)
          ELSE 0
        END,
        0
      ),
      'totalSecurityDeposits', COALESCE(ROUND(total_security_deposits::numeric, 2), 0)
    ),
    'tenants', json_build_object(
      'total', COALESCE(total_tenants, 0),
      'active', COALESCE(active_tenants, 0),
      'inactive', COALESCE(inactive_tenants, 0),
      'newThisMonth', COALESCE(new_tenants_this_month, 0),
      'totalTenants', COALESCE(total_tenants, 0),
      'activeTenants', COALESCE(active_tenants, 0)
    ),
    'maintenance', json_build_object(
      'total', COALESCE(total_maintenance, 0),
      'open', COALESCE(open_maintenance, 0),
      'inProgress', COALESCE(in_progress_maintenance, 0),
      'completed', COALESCE(completed_maintenance, 0),
      'completedToday', COALESCE(completed_today_maintenance, 0),
      'avgResolutionTime', COALESCE(ROUND(avg_resolution_time_hours::numeric, 2), 0),
      'byPriority', json_build_object(
        'low', COALESCE(low_priority_maintenance, 0),
        'medium', COALESCE(medium_priority_maintenance, 0),
        'high', COALESCE(high_priority_maintenance, 0),
        'emergency', COALESCE(emergency_maintenance, 0)
      )
    ),
    'revenue', json_build_object(
      'monthly', COALESCE(ROUND((monthly_revenue / 100.0)::numeric, 2), 0),
      'yearly', COALESCE(ROUND((yearly_revenue / 100.0)::numeric, 2), 0),
      'growth', CASE
        WHEN previous_month_revenue > 0
        THEN COALESCE(
          ROUND(
            ((monthly_revenue - previous_month_revenue)::numeric / previous_month_revenue) * 100,
            2
          ),
          0
        )
        ELSE 0
      END
    ),
    'totalProperties', COALESCE(total_properties, 0),
    'totalUnits', COALESCE(total_units, 0),
    'totalTenants', COALESCE(total_tenants, 0),
    'totalRevenue', COALESCE(ROUND((monthly_revenue / 100.0)::numeric, 2), 0),
    'occupancyRate', COALESCE(occupancy_rate, 0),
    'maintenanceRequests', COALESCE(total_maintenance, 0)
  )
  FROM dashboard_stats_mv
  WHERE user_id = p_internal_user_id;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats_fast(TEXT) TO authenticated;

COMMENT ON MATERIALIZED VIEW dashboard_stats_mv IS 
'Pre-aggregated dashboard statistics for instant loading. Refresh every 5 minutes or on-demand.';

COMMENT ON FUNCTION get_dashboard_stats_fast(TEXT) IS 
'Ultra-fast dashboard stats from materialized view. Use for read-heavy workloads. Expected <50ms response time.';

-- Note: For production, set up a cron job or pg_cron to refresh this view every 5 minutes:
-- SELECT cron.schedule('refresh-dashboard-stats', '*/5 * * * *', 'SELECT refresh_dashboard_stats_mv();');
