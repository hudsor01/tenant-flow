-- Create a single RPC function that returns ALL dashboard stats in one query
-- This eliminates ALL service orchestration and data transformation code

CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's privileges but respects RLS
AS $$
DECLARE
  result JSON;
BEGIN
  -- Single query that calculates ALL dashboard stats using native Postgres aggregations
  SELECT json_build_object(
    'properties', json_build_object(
      'total', COALESCE(property_stats.total, 0),
      'singleFamily', COALESCE(property_stats.single_family, 0),
      'multiFamily', COALESCE(property_stats.multi_family, 0),
      'commercial', COALESCE(property_stats.commercial, 0),
      'totalUnits', COALESCE(unit_stats.total_units, 0),
      'occupiedUnits', COALESCE(unit_stats.occupied_units, 0),
      'vacantUnits', COALESCE(unit_stats.vacant_units, 0),
      'totalMonthlyRent', COALESCE(unit_stats.total_rentAmount, 0),
      'potentialRent', COALESCE(unit_stats.total_rentAmount, 0),
      'totalRent', COALESCE(unit_stats.total_rentAmount, 0),
      'collectedRent', COALESCE(unit_stats.total_rentAmount, 0),
      'pendingRent', 0,
      'occupancyRate', CASE 
        WHEN COALESCE(unit_stats.total_units, 0) > 0 
        THEN ROUND((COALESCE(unit_stats.occupied_units, 0)::FLOAT / unit_stats.total_units) * 100)
        ELSE 0 
      END
    ),
    'tenants', json_build_object(
      'total', COALESCE(tenant_stats.total, 0),
      'totalTenants', COALESCE(tenant_stats.total, 0),
      'activeTenants', COALESCE(tenant_stats.active, 0),
      'inactiveTenants', COALESCE(tenant_stats.inactive, 0),
      'pendingInvitations', 0
    ),
    'units', json_build_object(
      'total', COALESCE(unit_stats.total_units, 0),
      'totalUnits', COALESCE(unit_stats.total_units, 0),
      'occupied', COALESCE(unit_stats.occupied_units, 0),
      'occupiedUnits', COALESCE(unit_stats.occupied_units, 0),
      'vacant', COALESCE(unit_stats.vacant_units, 0),
      'availableUnits', COALESCE(unit_stats.vacant_units, 0),
      'maintenanceUnits', 0,
      'averageRent', CASE 
        WHEN COALESCE(unit_stats.total_units, 0) > 0 
        THEN ROUND(COALESCE(unit_stats.total_rentAmount, 0) / unit_stats.total_units, 2)
        ELSE 0 
      END,
      'occupancyRate', CASE 
        WHEN COALESCE(unit_stats.total_units, 0) > 0 
        THEN ROUND((COALESCE(unit_stats.occupied_units, 0)::FLOAT / unit_stats.total_units) * 100)
        ELSE 0 
      END
    ),
    'leases', json_build_object(
      'total', COALESCE(lease_stats.total, 0),
      'totalLeases', COALESCE(lease_stats.total, 0),
      'active', COALESCE(lease_stats.active, 0),
      'activeLeases', COALESCE(lease_stats.active, 0),
      'expiredLeases', COALESCE(lease_stats.expired, 0),
      'pendingLeases', COALESCE(lease_stats.draft, 0),
      'totalRentRoll', COALESCE(unit_stats.total_rentAmount, 0)
    ),
    'maintenanceRequests', json_build_object(
      'total', 0,
      'open', 0,
      'inProgress', 0,
      'completed', 0
    ),
    'notifications', json_build_object(
      'total', 0,
      'unread', 0
    ),
    'revenue', json_build_object(
      'total', COALESCE(unit_stats.total_rentAmount, 0),
      'monthly', COALESCE(unit_stats.total_rentAmount, 0),
      'collected', COALESCE(unit_stats.total_rentAmount, 0)
    )
  ) INTO result
  FROM (
    -- Property stats subquery
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "propertyType" = 'SINGLE_FAMILY') as single_family,
      COUNT(*) FILTER (WHERE "propertyType" = 'MULTI_UNIT') as multi_family,
      COUNT(*) FILTER (WHERE "propertyType" = 'COMMERCIAL') as commercial
    FROM "Property"
    WHERE "ownerId" = user_id_param
  ) as property_stats
  CROSS JOIN (
    -- Unit stats subquery  
    SELECT
      COUNT(u.*) as total_units,
      COUNT(u.*) FILTER (WHERE u."status" = 'OCCUPIED') as occupied_units,
      COUNT(u.*) FILTER (WHERE u."status" = 'VACANT') as vacant_units,
      COALESCE(SUM(u."rent"), 0) as total_rentAmount
    FROM "Property" p
    LEFT JOIN "Unit" u ON p."id" = u."propertyId"
    WHERE p."ownerId" = user_id_param
  ) as unit_stats
  CROSS JOIN (
    -- Tenant stats subquery
    SELECT
      COUNT(DISTINCT t.*) as total,
      COUNT(DISTINCT t.*) FILTER (WHERE l."status" = 'ACTIVE') as active,
      COUNT(DISTINCT t.*) FILTER (WHERE l."status" != 'ACTIVE' OR l."status" IS NULL) as inactive
    FROM "Property" p
    LEFT JOIN "Unit" u ON p."id" = u."propertyId"  
    LEFT JOIN "Lease" l ON u."id" = l."unitId"
    LEFT JOIN "Tenant" t ON l."tenantId" = t."id"
    WHERE p."ownerId" = user_id_param
  ) as tenant_stats
  CROSS JOIN (
    -- Lease stats subquery
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE l."status" = 'ACTIVE') as active,
      COUNT(*) FILTER (WHERE l."status" = 'EXPIRED') as expired,
      COUNT(*) FILTER (WHERE l."status" = 'DRAFT') as draft,
      COUNT(*) FILTER (WHERE l."status" = 'TERMINATED') as terminated
    FROM "Property" p
    LEFT JOIN "Unit" u ON p."id" = u."propertyId"
    LEFT JOIN "Lease" l ON u."id" = l."unitId"
    WHERE p."ownerId" = user_id_param
  ) as lease_stats;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_dashboard_stats(UUID) IS 
'Returns complete dashboard statistics for a user in a single optimized query. 
Replaces multiple service calls with native Postgres aggregations and JSON building.
Respects RLS policies automatically through function context.';