-- ============================================
-- MISSING RPC FUNCTIONS FOR COMPLETE ARCHITECTURE
-- Ensures ALL business logic is in database layer
-- NO calculations allowed in frontend/backend
-- ============================================

-- ============================================
-- UNIT STATISTICS RPC FUNCTION
-- ============================================

-- Drop if exists for clean migration
DROP FUNCTION IF EXISTS get_unit_statistics CASCADE;

-- Get unit statistics with ALL calculations in database
CREATE OR REPLACE FUNCTION get_unit_statistics(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN json_build_object(
    -- Match UnitStats interface exactly
    'totalUnits', (
      SELECT COUNT(u.id)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    'occupiedUnits', (
      SELECT COUNT(u.id)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND u.status = 'OCCUPIED'
    ),
    'availableUnits', (
      SELECT COUNT(u.id)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND u.status = 'VACANT'
    ),
    'maintenanceUnits', (
      SELECT COUNT(u.id)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND u.status = 'MAINTENANCE'
    ),
    'averageRent', (
      SELECT COALESCE(ROUND(AVG(u.rent)), 0)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    -- Legacy fields for compatibility
    'total', (
      SELECT COUNT(u.id)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    'occupied', (
      SELECT COUNT(u.id)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND u.status = 'OCCUPIED'
    ),
    'vacant', (
      SELECT COUNT(u.id)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND u.status = 'VACANT'
    ),
    'maintenance', (
      SELECT COUNT(u.id)
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND u.status = 'MAINTENANCE'
    ),
    'occupancyRate', (
      SELECT 
        CASE 
          WHEN COUNT(u.id) > 0 
          THEN ROUND((COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED')::NUMERIC / COUNT(u.id)::NUMERIC * 100))
          ELSE 0 
        END
      FROM "unit" u
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INVOICE STATISTICS RPC FUNCTION
-- ============================================

DROP FUNCTION IF EXISTS get_invoice_statistics CASCADE;

CREATE OR REPLACE FUNCTION get_invoice_statistics(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN json_build_object(
    'total', (
      SELECT COUNT(i.id)
      FROM "invoice" i
      JOIN "lease" l ON i."leaseId" = l.id
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    'paid', (
      SELECT COUNT(i.id)
      FROM "invoice" i
      JOIN "lease" l ON i."leaseId" = l.id
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND i.status = 'PAID'
    ),
    'pending', (
      SELECT COUNT(i.id)
      FROM "invoice" i
      JOIN "lease" l ON i."leaseId" = l.id
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND i.status = 'PENDING'
    ),
    'overdue', (
      SELECT COUNT(i.id)
      FROM "invoice" i
      JOIN "lease" l ON i."leaseId" = l.id
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND i.status = 'OVERDUE'
    ),
    'totalAmount', (
      SELECT COALESCE(SUM(i.amount), 0)
      FROM "invoice" i
      JOIN "lease" l ON i."leaseId" = l.id
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ),
    'paidAmount', (
      SELECT COALESCE(SUM(i.amount), 0)
      FROM "invoice" i
      JOIN "lease" l ON i."leaseId" = l.id
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND i.status = 'PAID'
    ),
    'overdueAmount', (
      SELECT COALESCE(SUM(i.amount), 0)
      FROM "invoice" i
      JOIN "lease" l ON i."leaseId" = l.id
      JOIN "unit" u ON l."unitId" = u.id
      JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
        AND i.status = 'OVERDUE'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROPERTIES WITH STATS RPC (ENHANCED)
-- ============================================

DROP FUNCTION IF EXISTS get_properties_with_stats CASCADE;

CREATE OR REPLACE FUNCTION get_properties_with_stats(
  p_user_id UUID,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        -- Core property fields
        'id', p.id,
        'name', p.name,
        'address', p.address,
        'city', p.city,
        'state', p.state,
        'zipCode', p."zipCode",
        'country', p.country,
        'propertyType', p."propertyType",
        'description', p.description,
        'imageUrl', p."imageUrl",
        'ownerId', p."ownerId",
        'createdAt', p."createdAt",
        'updatedAt', p."updatedAt",
        -- REQUIRED calculated metrics
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
        -- Include units array
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
            'propertyId', u."propertyId",
            'unitNumber', u."unitNumber",
            'status', u.status,
            'rent', u.rent,
            'bedrooms', u.bedrooms,
            'bathrooms', u.bathrooms,
            'squareFeet', u."squareFeet",
            'createdAt', u."createdAt",
            'updatedAt', u."updatedAt"
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
      AND (p_status IS NULL OR p.status = p_status)
    ORDER BY p."createdAt" DESC
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SINGLE PROPERTY WITH STATS RPC
-- ============================================

DROP FUNCTION IF EXISTS get_property_with_stats CASCADE;

CREATE OR REPLACE FUNCTION get_property_with_stats(
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
        -- Core property fields
        p.id,
        p.name,
        p.address,
        p.city,
        p.state,
        p."zipCode",
        p.country,
        p."propertyType",
        p.description,
        p."imageUrl",
        p."ownerId",
        p."createdAt",
        p."updatedAt",
        -- REQUIRED calculated metrics
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
              'propertyId', u."propertyId",
              'unitNumber', u."unitNumber",
              'status', u.status,
              'rent', u.rent,
              'bedrooms', u.bedrooms,
              'bathrooms', u.bathrooms,
              'squareFeet', u."squareFeet",
              'createdAt', u."createdAt",
              'updatedAt', u."updatedAt"
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
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_unit_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_properties_with_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_with_stats TO authenticated;

-- ============================================
-- VERIFICATION COMMENT
-- ============================================

-- This migration ensures ALL business logic is in the database
-- Frontend and backend MUST use these functions ONLY
-- NO calculations allowed outside of these RPC functions