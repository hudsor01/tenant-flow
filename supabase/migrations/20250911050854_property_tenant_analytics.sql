-- Property and Tenant Analytics RPC functions
-- CRITICAL: Move all date calculations and age computations to database
-- Following CLAUDE.md: zero math/business logic in React frontend

-- Enhanced properties list with analytics (replaces frontend date calculations)
CREATE OR REPLACE FUNCTION get_properties_with_analytics(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', p.id,
        'name', p.name,
        'address', p.address,
        'city', p.city,
        'state', p.state,
        'zipCode', p."zipCode",
        'propertyType', p."propertyType",
        'status', p.status,
        'createdAt', p."createdAt",
        'updatedAt', p."updatedAt",
        -- Pre-calculated display values (replaces frontend formatting)
        'displayAddress', p.address || ', ' || p.city || ', ' || p.state,
        'displayType', INITCAP(p."propertyType"),
        'statusDisplay', CASE 
          WHEN p.status IS NULL THEN 'Unknown'
          ELSE INITCAP(REPLACE(p.status, '_', ' '))
        END,
        'statusColor', CASE p.status
          WHEN 'ACTIVE' THEN '#10b981'
          WHEN 'MAINTENANCE' THEN '#f59e0b'
          WHEN 'VACANT' THEN '#6b7280'
          WHEN 'PENDING' THEN '#3b82f6'
          WHEN 'INACTIVE' THEN '#ef4444'
          ELSE '#ef4444'
        END,
        -- Pre-calculated date analytics (replaces frontend Math.floor calculations)
        'createdAtFormatted', TO_CHAR(p."createdAt", 'MM/DD/YYYY'),
        'updatedAtFormatted', TO_CHAR(p."updatedAt", 'MM/DD/YYYY'),
        'ageInDays', EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p."createdAt"))::INTEGER,
        'daysSinceUpdate', EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p."updatedAt"))::INTEGER,
        -- Property analytics
        'totalUnits', COALESCE(unit_count.total, 0),
        'occupiedUnits', COALESCE(unit_count.occupied, 0),
        'vacantUnits', COALESCE(unit_count.vacant, 0),
        'occupancyRate', CASE 
          WHEN COALESCE(unit_count.total, 0) > 0 THEN 
            ROUND((COALESCE(unit_count.occupied, 0)::DECIMAL / unit_count.total * 100), 1)
          ELSE 0
        END,
        'monthlyRevenue', COALESCE(revenue_data.monthly_revenue, 0),
        'averageRent', CASE 
          WHEN COALESCE(unit_count.occupied, 0) > 0 THEN 
            ROUND(COALESCE(revenue_data.monthly_revenue, 0) / unit_count.occupied, 2)
          ELSE 0
        END
      )
    )
    FROM "Property" p
    -- Get unit counts and occupancy
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(*)::INTEGER as total,
        COUNT(CASE WHEN l.status = 'ACTIVE' THEN 1 END)::INTEGER as occupied,
        COUNT(CASE WHEN u.status = 'VACANT' OR l.id IS NULL THEN 1 END)::INTEGER as vacant
      FROM "Unit" u
      LEFT JOIN "Lease" l ON l."unitId" = u.id AND l.status = 'ACTIVE'
      WHERE u."propertyId" = p.id
    ) unit_count ON true
    -- Get revenue data
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(l."rentAmount"), 0) as monthly_revenue
      FROM "Unit" u
      JOIN "Lease" l ON l."unitId" = u.id AND l.status = 'ACTIVE'
      WHERE u."propertyId" = p.id
    ) revenue_data ON true
    WHERE p."userId" = p_user_id
    ORDER BY p."createdAt" DESC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced tenants list with analytics (replaces frontend calculations)
CREATE OR REPLACE FUNCTION get_tenants_with_analytics(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', t.id,
        'firstName', t."firstName",
        'lastName', t."lastName",
        'email', t.email,
        'phone', t.phone,
        'emergencyContact', t."emergencyContact",
        'status', t.status,
        'createdAt', t."createdAt",
        'updatedAt', t."updatedAt",
        -- Pre-calculated display values (replaces frontend string manipulation)
        'displayName', t."firstName" || ' ' || t."lastName",
        'displayEmail', LOWER(t.email),
        'displayPhone', CASE 
          WHEN t.phone IS NULL THEN 'N/A'
          WHEN LENGTH(REGEXP_REPLACE(t.phone, '[^0-9]', '', 'g')) = 10 THEN
            '(' || SUBSTRING(REGEXP_REPLACE(t.phone, '[^0-9]', '', 'g'), 1, 3) || ') ' ||
            SUBSTRING(REGEXP_REPLACE(t.phone, '[^0-9]', '', 'g'), 4, 3) || '-' ||
            SUBSTRING(REGEXP_REPLACE(t.phone, '[^0-9]', '', 'g'), 7, 4)
          ELSE t.phone
        END,
        'statusDisplay', COALESCE(t.status, 'Active'),
        'statusColor', CASE COALESCE(t.status, 'ACTIVE')
          WHEN 'ACTIVE' THEN '#10b981'
          WHEN 'INACTIVE' THEN '#6b7280'
          WHEN 'PENDING' THEN '#f59e0b'
          WHEN 'EVICTED' THEN '#ef4444'
          ELSE '#10b981'
        END,
        -- Pre-calculated date analytics (replaces frontend date math)
        'createdAtFormatted', TO_CHAR(t."createdAt", 'MM/DD/YYYY'),
        'updatedAtFormatted', TO_CHAR(t."updatedAt", 'MM/DD/YYYY'),
        'tenureInDays', EXTRACT(DAY FROM (CURRENT_TIMESTAMP - t."createdAt"))::INTEGER,
        'daysSinceUpdate', EXTRACT(DAY FROM (CURRENT_TIMESTAMP - t."updatedAt"))::INTEGER,
        -- Avatar initials for display
        'avatarInitials', UPPER(LEFT(t."firstName", 1) || LEFT(t."lastName", 1)),
        -- Lease information
        'currentLease', lease_info.lease_data,
        'monthlyRent', COALESCE(lease_info.monthly_rent, 0),
        'leaseStatus', COALESCE(lease_info.lease_status, 'No Active Lease')
      )
    )
    FROM "Tenant" t
    -- Get current lease information
    LEFT JOIN LATERAL (
      SELECT 
        json_build_object(
          'id', l.id,
          'unitId', l."unitId",
          'startDate', l."startDate",
          'endDate', l."endDate",
          'rentAmount', l."rentAmount",
          'status', l.status,
          'unitNumber', u."unitNumber",
          'propertyName', p.name
        ) as lease_data,
        l."rentAmount" as monthly_rent,
        l.status as lease_status
      FROM "Lease" l
      JOIN "Unit" u ON u.id = l."unitId"
      JOIN "Property" p ON p.id = u."propertyId"
      WHERE l."tenantId" = t.id 
      AND l.status = 'ACTIVE'
      AND p."userId" = p_user_id
      ORDER BY l."startDate" DESC
      LIMIT 1
    ) lease_info ON true
    -- Only return tenants that belong to the user's properties
    WHERE EXISTS (
      SELECT 1 FROM "Lease" l
      JOIN "Unit" u ON u.id = l."unitId"
      JOIN "Property" p ON p.id = u."propertyId"
      WHERE l."tenantId" = t.id AND p."userId" = p_user_id
    )
    ORDER BY t."createdAt" DESC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Consolidated status color function (eliminates frontend duplication)
CREATE OR REPLACE FUNCTION get_status_color(
  entity_type TEXT,
  status_value TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
  CASE entity_type
    WHEN 'property' THEN
      RETURN CASE COALESCE(status_value, 'UNKNOWN')
        WHEN 'ACTIVE' THEN '#10b981'
        WHEN 'MAINTENANCE' THEN '#f59e0b'
        WHEN 'VACANT' THEN '#6b7280'
        WHEN 'PENDING' THEN '#3b82f6'
        WHEN 'INACTIVE' THEN '#ef4444'
        ELSE '#ef4444'
      END;
    WHEN 'tenant' THEN
      RETURN CASE COALESCE(status_value, 'ACTIVE')
        WHEN 'ACTIVE' THEN '#10b981'
        WHEN 'INACTIVE' THEN '#6b7280'
        WHEN 'PENDING' THEN '#f59e0b'
        WHEN 'EVICTED' THEN '#ef4444'
        ELSE '#10b981'
      END;
    WHEN 'unit' THEN
      RETURN CASE COALESCE(status_value, 'VACANT')
        WHEN 'OCCUPIED' THEN '#10b981'
        WHEN 'VACANT' THEN '#6b7280'
        WHEN 'MAINTENANCE' THEN '#f59e0b'
        WHEN 'RESERVED' THEN '#3b82f6'
        ELSE '#6b7280'
      END;
    WHEN 'lease' THEN
      RETURN CASE COALESCE(status_value, 'ACTIVE')
        WHEN 'ACTIVE' THEN '#10b981'
        WHEN 'EXPIRED' THEN '#6b7280'
        WHEN 'TERMINATED' THEN '#ef4444'
        WHEN 'PENDING' THEN '#3b82f6'
        ELSE '#10b981'
      END;
    ELSE
      RETURN '#6b7280'; -- Default gray
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enhanced units list with analytics (for virtualized data hooks)
CREATE OR REPLACE FUNCTION get_units_with_analytics(
  p_user_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', u.id,
        'unitNumber', u."unitNumber",
        'bedrooms', u.bedrooms,
        'bathrooms', u.bathrooms,
        'squareFeet', u."squareFeet",
        'rent', u.rent,
        'status', u.status,
        'propertyId', u."propertyId",
        'lastInspectionDate', u."lastInspectionDate",
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt",
        -- Pre-calculated analytics (replaces frontend date calculations)
        'ageInDays', EXTRACT(DAY FROM (CURRENT_TIMESTAMP - u."createdAt"))::INTEGER,
        'daysSinceUpdate', EXTRACT(DAY FROM (CURRENT_TIMESTAMP - u."updatedAt"))::INTEGER,
        'daysSinceInspection', CASE 
          WHEN u."lastInspectionDate" IS NOT NULL THEN 
            EXTRACT(DAY FROM (CURRENT_TIMESTAMP - u."lastInspectionDate"))::INTEGER
          ELSE NULL
        END,
        -- Status formatting and colors
        'statusDisplay', INITCAP(COALESCE(u.status, 'vacant')),
        'statusColor', get_status_color('unit', u.status),
        -- Property information
        'propertyName', p.name,
        'propertyAddress', p.address || ', ' || p.city,
        -- Current lease information
        'currentLease', lease_info.lease_data,
        'tenantName', lease_info.tenant_name,
        'leaseEndDate', lease_info.lease_end_date,
        'daysUntilLeaseEnd', lease_info.days_until_end
      )
    )
    FROM "Unit" u
    JOIN "Property" p ON p.id = u."propertyId"
    -- Get current lease and tenant information
    LEFT JOIN LATERAL (
      SELECT 
        json_build_object(
          'id', l.id,
          'tenantId', l."tenantId",
          'startDate', l."startDate",
          'endDate', l."endDate",
          'rentAmount', l."rentAmount",
          'status', l.status
        ) as lease_data,
        t."firstName" || ' ' || t."lastName" as tenant_name,
        l."endDate" as lease_end_date,
        CASE 
          WHEN l."endDate" IS NOT NULL THEN 
            EXTRACT(DAY FROM (l."endDate" - CURRENT_DATE))::INTEGER
          ELSE NULL
        END as days_until_end
      FROM "Lease" l
      JOIN "Tenant" t ON t.id = l."tenantId"
      WHERE l."unitId" = u.id AND l.status = 'ACTIVE'
      ORDER BY l."startDate" DESC
      LIMIT 1
    ) lease_info ON true
    WHERE p."userId" = p_user_id
    AND (p_status IS NULL OR u.status = p_status)
    ORDER BY u."createdAt" DESC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_properties_with_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenants_with_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_status_color(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_units_with_analytics(UUID, TEXT) TO authenticated;