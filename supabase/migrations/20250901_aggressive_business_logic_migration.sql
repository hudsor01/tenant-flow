-- ============================================
-- AGGRESSIVE BUSINESS LOGIC MIGRATION
-- Move ALL calculations to database layer
-- NO backward compatibility - clean cut migration
-- ============================================

-- Drop existing functions if they exist (clean slate)
DROP FUNCTION IF EXISTS get_user_properties CASCADE;
DROP FUNCTION IF EXISTS get_property_by_id CASCADE;
DROP FUNCTION IF EXISTS get_property_stats CASCADE;

-- ============================================
-- PROPERTY METRICS - ALL CALCULATIONS IN DB
-- ============================================

-- Get properties with ALL metrics calculated
CREATE OR REPLACE FUNCTION get_user_properties(
  p_user_id UUID,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS JSON
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', p.id,
        'name', p.name,
        'address', p.address,
        'city', p.city,
        'state', p.state,
        'zipCode', p."zipCode",
        'country', p.country,
        'propertyType', p."propertyType",
        'description', p.description,
        'ownerId', p."ownerId",
        'createdAt', p."createdAt",
        'updatedAt', p."updatedAt",
        -- CALCULATED METRICS (NO FRONTEND CALCULATIONS ALLOWED)
        'totalUnits', COALESCE(unit_stats.total_units, 0),
        'occupiedUnits', COALESCE(unit_stats.occupied_units, 0),
        'vacantUnits', COALESCE(unit_stats.vacant_units, 0),
        'maintenanceUnits', COALESCE(unit_stats.maintenance_units, 0),
        'occupancyRate', COALESCE(unit_stats.occupancy_rate, 0),
        'monthlyRevenue', COALESCE(unit_stats.monthly_revenue, 0),
        'potentialRevenue', COALESCE(unit_stats.potential_revenue, 0),
        'revenueUtilization', COALESCE(unit_stats.revenue_utilization, 0),
        'averageRentPerUnit', COALESCE(unit_stats.average_rent, 0),
        'maintenanceRequests', COALESCE(maintenance_stats.total_requests, 0),
        'openMaintenanceRequests', COALESCE(maintenance_stats.open_requests, 0),
        'units', COALESCE(unit_stats.units_json, '[]'::json)
      )
    ), '[]'::json)
    FROM "property" p
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(u.id) as total_units,
        COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED') as occupied_units,
        COUNT(u.id) FILTER (WHERE u.status = 'VACANT') as vacant_units,
        COUNT(u.id) FILTER (WHERE u.status = 'MAINTENANCE') as maintenance_units,
        CASE 
          WHEN COUNT(u.id) > 0 
          THEN ROUND((COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED')::NUMERIC / COUNT(u.id)::NUMERIC * 100))
          ELSE 0 
        END as occupancy_rate,
        COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0) as monthly_revenue,
        COALESCE(SUM(u.rent), 0) as potential_revenue,
        CASE 
          WHEN COALESCE(SUM(u.rent), 0) > 0 
          THEN ROUND((COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0)::NUMERIC / SUM(u.rent)::NUMERIC * 100))
          ELSE 0 
        END as revenue_utilization,
        CASE 
          WHEN COUNT(u.id) > 0 
          THEN ROUND(AVG(u.rent))
          ELSE 0 
        END as average_rent,
        json_agg(
          json_build_object(
            'id', u.id,
            'unitNumber', u."unitNumber",
            'status', u.status,
            'rent', u.rent,
            'bedrooms', u.bedrooms,
            'bathrooms', u.bathrooms,
            'squareFeet', u."squareFeet"
          ) ORDER BY u."unitNumber"
        ) as units_json
      FROM "unit" u
      WHERE u."propertyId" = p.id
    ) unit_stats ON true
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(m.id) as total_requests,
        COUNT(m.id) FILTER (WHERE m.status IN ('PENDING', 'IN_PROGRESS')) as open_requests
      FROM "maintenance_request" m
      JOIN "unit" u ON m."unitId" = u.id
      WHERE u."propertyId" = p.id
    ) maintenance_stats ON true
    WHERE p."ownerId" = p_user_id
      AND (p_search IS NULL OR (
        p.name ILIKE '%' || p_search || '%' OR
        p.address ILIKE '%' || p_search || '%' OR
        p.city ILIKE '%' || p_search || '%'
      ))
    ORDER BY p."createdAt" DESC
    LIMIT p_limit
    OFFSET p_offset
  );
END;
$$ LANGUAGE plpgsql;

-- Get single property with ALL metrics
CREATE OR REPLACE FUNCTION get_property_by_id(
  p_user_id UUID,
  p_property_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT row_to_json(property_data)
    FROM (
      SELECT 
        p.*,
        -- CALCULATED METRICS
        COALESCE(unit_stats.total_units, 0) as "totalUnits",
        COALESCE(unit_stats.occupied_units, 0) as "occupiedUnits",
        COALESCE(unit_stats.vacant_units, 0) as "vacantUnits",
        COALESCE(unit_stats.maintenance_units, 0) as "maintenanceUnits",
        COALESCE(unit_stats.occupancy_rate, 0) as "occupancyRate",
        COALESCE(unit_stats.monthly_revenue, 0) as "monthlyRevenue",
        COALESCE(unit_stats.potential_revenue, 0) as "potentialRevenue",
        COALESCE(unit_stats.revenue_utilization, 0) as "revenueUtilization",
        COALESCE(unit_stats.average_rent, 0) as "averageRentPerUnit",
        COALESCE(maintenance_stats.total_requests, 0) as "maintenanceRequests",
        COALESCE(maintenance_stats.open_requests, 0) as "openMaintenanceRequests",
        COALESCE(unit_stats.units_json, '[]'::json) as units
      FROM "property" p
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(u.id) as total_units,
          COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED') as occupied_units,
          COUNT(u.id) FILTER (WHERE u.status = 'VACANT') as vacant_units,
          COUNT(u.id) FILTER (WHERE u.status = 'MAINTENANCE') as maintenance_units,
          CASE 
            WHEN COUNT(u.id) > 0 
            THEN ROUND((COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED')::NUMERIC / COUNT(u.id)::NUMERIC * 100))
            ELSE 0 
          END as occupancy_rate,
          COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0) as monthly_revenue,
          COALESCE(SUM(u.rent), 0) as potential_revenue,
          CASE 
            WHEN COALESCE(SUM(u.rent), 0) > 0 
            THEN ROUND((COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0)::NUMERIC / SUM(u.rent)::NUMERIC * 100))
            ELSE 0 
          END as revenue_utilization,
          CASE 
            WHEN COUNT(u.id) > 0 
            THEN ROUND(AVG(u.rent))
            ELSE 0 
          END as average_rent,
          json_agg(
            json_build_object(
              'id', u.id,
              'unitNumber', u."unitNumber",
              'status', u.status,
              'rent', u.rent,
              'bedrooms', u.bedrooms,
              'bathrooms', u.bathrooms,
              'squareFeet', u."squareFeet"
            ) ORDER BY u."unitNumber"
          ) as units_json
        FROM "unit" u
        WHERE u."propertyId" = p.id
      ) unit_stats ON true
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(m.id) as total_requests,
          COUNT(m.id) FILTER (WHERE m.status IN ('PENDING', 'IN_PROGRESS')) as open_requests
        FROM "maintenance_request" m
        JOIN "unit" u ON m."unitId" = u.id
        WHERE u."propertyId" = p.id
      ) maintenance_stats ON true
      WHERE p.id = p_property_id
        AND p."ownerId" = p_user_id
    ) property_data
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DASHBOARD METRICS - ALL CALCULATIONS IN DB
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN json_build_object(
    'properties', (
      SELECT json_build_object(
        'total', COUNT(DISTINCT p.id),
        'totalValue', COALESCE(SUM(DISTINCT p."purchasePrice"), 0),
        'averageOccupancy', CASE 
          WHEN COUNT(DISTINCT p.id) > 0 
          THEN ROUND(AVG(property_occupancy.occupancy_rate))
          ELSE 0 
        END
      )
      FROM "property" p
      LEFT JOIN LATERAL (
        SELECT 
          CASE 
            WHEN COUNT(u.id) > 0 
            THEN (COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED')::NUMERIC / COUNT(u.id)::NUMERIC * 100)
            ELSE 0 
          END as occupancy_rate
        FROM "unit" u
        WHERE u."propertyId" = p.id
      ) property_occupancy ON true
      WHERE p."ownerId" = p_user_id
    ),
    'units', (
      SELECT json_build_object(
        'total', COUNT(u.id),
        'occupied', COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED'),
        'vacant', COUNT(u.id) FILTER (WHERE u.status = 'VACANT'),
        'maintenance', COUNT(u.id) FILTER (WHERE u.status = 'MAINTENANCE'),
        'occupancyRate', CASE 
          WHEN COUNT(u.id) > 0 
          THEN ROUND((COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED')::NUMERIC / COUNT(u.id)::NUMERIC * 100))
          ELSE 0 
        END
      )
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    'tenants', (
      SELECT json_build_object(
        'total', COUNT(DISTINCT t.id),
        'active', COUNT(DISTINCT t.id) FILTER (WHERE t."invitationStatus" = 'ACCEPTED'),
        'pending', COUNT(DISTINCT t.id) FILTER (WHERE t."invitationStatus" = 'PENDING'),
        'inactive', COUNT(DISTINCT t.id) FILTER (WHERE t."invitationStatus" IN ('EXPIRED', 'CANCELLED'))
      )
      FROM "tenant" t
      JOIN "lease" l ON t.id = l."tenantId"
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    'leases', (
      SELECT json_build_object(
        'total', COUNT(l.id),
        'active', COUNT(l.id) FILTER (WHERE l.status = 'ACTIVE' AND l."endDate" >= CURRENT_DATE),
        'expiringSoon', COUNT(l.id) FILTER (WHERE l.status = 'ACTIVE' AND l."endDate" BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
        'expired', COUNT(l.id) FILTER (WHERE l."endDate" < CURRENT_DATE)
      )
      FROM "lease" l
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    'financials', (
      SELECT json_build_object(
        'monthlyRevenue', COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0),
        'potentialRevenue', COALESCE(SUM(u.rent), 0),
        'revenueUtilization', CASE 
          WHEN COALESCE(SUM(u.rent), 0) > 0 
          THEN ROUND((COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0)::NUMERIC / SUM(u.rent)::NUMERIC * 100))
          ELSE 0 
        END,
        'averageRentPerUnit', CASE 
          WHEN COUNT(u.id) > 0 
          THEN ROUND(AVG(u.rent))
          ELSE 0 
        END,
        'totalSecurityDeposits', COALESCE(SUM(l."securityDeposit"), 0)
      )
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      LEFT JOIN "lease" l ON u.id = l."unitId" AND l.status = 'ACTIVE'
      WHERE p."ownerId" = p_user_id
    ),
    'maintenance', (
      SELECT json_build_object(
        'total', COUNT(m.id),
        'pending', COUNT(m.id) FILTER (WHERE m.status = 'PENDING'),
        'inProgress', COUNT(m.id) FILTER (WHERE m.status = 'IN_PROGRESS'),
        'completed', COUNT(m.id) FILTER (WHERE m.status = 'COMPLETED'),
        'averageCompletionDays', CASE 
          WHEN COUNT(m.id) FILTER (WHERE m.status = 'COMPLETED') > 0
          THEN ROUND(AVG(
            EXTRACT(EPOCH FROM (m."updatedAt" - m."createdAt")) / 86400
          ) FILTER (WHERE m.status = 'COMPLETED'))
          ELSE 0
        END
      )
      FROM "maintenance_request" m
      JOIN "unit" u ON m."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    'recentActivity', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', activity.id,
          'type', activity.type,
          'description', activity.description,
          'timestamp', activity.timestamp
        ) ORDER BY activity.timestamp DESC
      ), '[]'::json)
      FROM (
        SELECT 
          l.id,
          'lease' as type,
          'New lease created for unit ' || u."unitNumber" as description,
          l."createdAt" as timestamp
        FROM "lease" l
        JOIN "unit" u ON l."unitId" = u.id
        JOIN "property" p ON u."propertyId" = p.id
        WHERE p."ownerId" = p_user_id
        ORDER BY l."createdAt" DESC
        LIMIT 10
      ) activity
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROPERTY STATS - AGGREGATED METRICS
-- ============================================

CREATE OR REPLACE FUNCTION get_property_stats(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT row_to_json(stats)
    FROM (
      SELECT 
        COUNT(DISTINCT p.id) as total,
        COUNT(DISTINCT p.id) as owned, -- All properties are owned by the user
        0 as rented, -- Not applicable in our model
        COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'VACANT') as available,
        COUNT(DISTINCT m.id) FILTER (WHERE m.status IN ('PENDING', 'IN_PROGRESS')) as maintenance,
        COALESCE(SUM(u.rent) FILTER (WHERE u.status = 'OCCUPIED'), 0) as "totalMonthlyRent",
        COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'VACANT') as "vacantUnits"
      FROM "property" p
      LEFT JOIN "unit" u ON p.id = u."propertyId"
      LEFT JOIN "maintenance_request" m ON u.id = m."unitId"
      WHERE p."ownerId" = p_user_id
    ) stats
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_properties TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_stats TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- This migration FORCES all business logic to the database
-- Frontend MUST use these calculated values
-- NO calculations allowed in frontend code