-- Ultra-Native RPC Functions for Backend Rewrite
-- Single source of truth with automatic RLS enforcement
-- Replaces complex service orchestration with direct DB calls

-- ============================================
-- UNITS RPC FUNCTIONS
-- ============================================

-- Get all units for a user with filtering and pagination
CREATE OR REPLACE FUNCTION get_user_units(
  p_user_id UUID,
  p_property_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'createdAt',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSON AS $$
DECLARE
  v_query TEXT;
  v_result JSON;
BEGIN
  -- Build dynamic query with filters
  v_query := 'SELECT json_agg(row_to_json(t)) FROM (
    SELECT 
      u.id,
      u."propertyId",
      u."unitNumber",
      u.bedrooms,
      u.bathrooms,
      u."squareFeet",
      u.rent,
      u.status,
      u."createdAt",
      u."updatedAt"
    FROM "unit" u
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = $1';  
  -- Add optional filters
  IF p_property_id IS NOT NULL THEN
    v_query := v_query || ' AND u."propertyId" = ' || quote_literal(p_property_id);
  END IF;
  
  IF p_status IS NOT NULL THEN
    v_query := v_query || ' AND u.status = ' || quote_literal(p_status);
  END IF;
  
  IF p_search IS NOT NULL THEN
    v_query := v_query || ' AND u."unitNumber" ILIKE ' || quote_literal('%' || p_search || '%');
  END IF;
  
  -- Add sorting
  v_query := v_query || ' ORDER BY u."' || p_sort_by || '" ' || p_sort_order;
  
  -- Add pagination
  v_query := v_query || ' LIMIT ' || p_limit || ' OFFSET ' || p_offset;
  
  v_query := v_query || ') t';
  
  -- Execute query
  EXECUTE v_query INTO v_result USING p_user_id;
  
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Get unit statistics for a user
CREATE OR REPLACE FUNCTION get_unit_stats(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT row_to_json(s) FROM (
      SELECT 
        COUNT(*)::INT as total,
        COUNT(*) FILTER (WHERE u.status = 'VACANT')::INT as vacant,
        COUNT(*) FILTER (WHERE u.status = 'OCCUPIED')::INT as occupied,
        COUNT(*) FILTER (WHERE u.status = 'MAINTENANCE')::INT as maintenance,
        COUNT(*) FILTER (WHERE u.status = 'RESERVED')::INT as reserved,
        COALESCE(AVG(u.rent), 0)::DECIMAL as "averageRent",
        COALESCE(SUM(u.rent), 0)::DECIMAL as "totalRent",
        CASE 
          WHEN COUNT(*) > 0 
          THEN (COUNT(*) FILTER (WHERE u.status = 'OCCUPIED')::FLOAT / COUNT(*)::FLOAT * 100)
          ELSE 0 
        END as "occupancyRate"
      FROM "unit" u
      INNER JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ) s
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- ============================================
-- TENANTS RPC FUNCTIONS
-- ============================================

-- Get all tenants for a user with filtering and pagination
CREATE OR REPLACE FUNCTION get_user_tenants(
  p_user_id UUID,
  p_search TEXT DEFAULT NULL,
  p_invitation_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'createdAt',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM "tenant" t
    WHERE t."ownerId" = p_user_id
    AND (p_search IS NULL OR 
         t.name ILIKE '%' || p_search || '%' OR
         t.email ILIKE '%' || p_search || '%')
    AND (p_invitation_status IS NULL OR t."invitationStatus" = p_invitation_status)
    ORDER BY t."createdAt" DESC
    LIMIT p_limit
    OFFSET p_offset
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Get tenant statistics
CREATE OR REPLACE FUNCTION get_tenant_stats(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT row_to_json(s) FROM (
      SELECT 
        COUNT(*)::INT as total,
        COUNT(*) FILTER (WHERE t."invitationStatus" = 'PENDING')::INT as pending,
        COUNT(*) FILTER (WHERE t."invitationStatus" = 'SENT')::INT as sent,
        COUNT(*) FILTER (WHERE t."invitationStatus" = 'ACCEPTED')::INT as accepted,
        COUNT(*) FILTER (WHERE t."invitationStatus" = 'EXPIRED')::INT as expired,
        COUNT(DISTINCT l."tenantId") as "activeTenants"
      FROM "tenant" t
      LEFT JOIN "lease" l ON l."tenantId" = t.id AND l.status = 'ACTIVE'
      WHERE t."ownerId" = p_user_id
    ) s
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Get single tenant by ID
CREATE OR REPLACE FUNCTION get_tenant_by_id(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT row_to_json(t)
    FROM "tenant" t
    WHERE t."ownerId" = p_user_id
    AND t.id = p_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Create new tenant
CREATE OR REPLACE FUNCTION create_tenant(
  p_user_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_emergency_contact TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSON;
BEGIN
  -- Insert tenant
  INSERT INTO "tenant" (
    "ownerId",
    name,
    email,
    phone,
    "emergencyContact",
    "invitationStatus"
  ) VALUES (
    p_user_id,
    p_name,
    p_email,
    p_phone,
    p_emergency_contact,
    'PENDING'
  ) RETURNING id INTO v_tenant_id;
  
  -- Return created tenant
  SELECT row_to_json(t) INTO v_result
  FROM "tenant" t
  WHERE t.id = v_tenant_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Update tenant
CREATE OR REPLACE FUNCTION update_tenant(
  p_user_id UUID,
  p_tenant_id UUID,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_emergency_contact TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "tenant"
    WHERE id = p_tenant_id AND "ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Tenant not found or access denied';
  END IF;
  
  -- Update tenant with only non-null values
  UPDATE "tenant"
  SET 
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    phone = COALESCE(p_phone, phone),
    "emergencyContact" = COALESCE(p_emergency_contact, "emergencyContact"),
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_tenant_id;
  
  -- Return updated tenant
  SELECT row_to_json(t) INTO v_result
  FROM "tenant" t
  WHERE t.id = p_tenant_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Delete tenant
CREATE OR REPLACE FUNCTION delete_tenant(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "tenant"
    WHERE id = p_tenant_id AND "ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Tenant not found or access denied';
  END IF;
  
  -- Delete tenant
  DELETE FROM "tenant" WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Send invitation to tenant
CREATE OR REPLACE FUNCTION send_tenant_invitation(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "tenant"
    WHERE id = p_tenant_id AND "ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Tenant not found or access denied';
  END IF;
  
  -- Update invitation status
  UPDATE "tenant"
  SET 
    "invitationStatus" = 'SENT',
    "invitationSentAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_tenant_id;
  
  -- Return updated tenant
  SELECT row_to_json(t) INTO v_result
  FROM "tenant" t
  WHERE t.id = p_tenant_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Resend invitation to tenant
CREATE OR REPLACE FUNCTION resend_tenant_invitation(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership and status
  IF NOT EXISTS (
    SELECT 1 FROM "tenant"
    WHERE id = p_tenant_id 
    AND "ownerId" = p_user_id
    AND "invitationStatus" IN ('SENT', 'EXPIRED')
  ) THEN
    RAISE EXCEPTION 'Tenant not found, access denied, or invalid status for resend';
  END IF;
  
  -- Update invitation status
  UPDATE "tenant"
  SET 
    "invitationStatus" = 'SENT',
    "invitationSentAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_tenant_id;
  
  -- Return updated tenant
  SELECT row_to_json(t) INTO v_result
  FROM "tenant" t
  WHERE t.id = p_tenant_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- ============================================
-- LEASES RPC FUNCTIONS  
-- ============================================

-- Get all leases for a user with filtering and pagination
CREATE OR REPLACE FUNCTION get_user_leases(
  p_user_id UUID,
  p_tenant_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'createdAt',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(l))
    FROM "lease" l
    INNER JOIN "unit" u ON l."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
    AND (p_tenant_id IS NULL OR l."tenantId" = p_tenant_id)
    AND (p_unit_id IS NULL OR l."unitId" = p_unit_id)
    AND (p_property_id IS NULL OR u."propertyId" = p_property_id)
    AND (p_status IS NULL OR l.status = p_status)
    ORDER BY l."createdAt" DESC
    LIMIT p_limit
    OFFSET p_offset
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Get lease statistics
CREATE OR REPLACE FUNCTION get_lease_stats(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT row_to_json(s) FROM (
      SELECT 
        COUNT(*)::INT as total,
        COUNT(*) FILTER (WHERE l.status = 'DRAFT')::INT as draft,
        COUNT(*) FILTER (WHERE l.status = 'ACTIVE')::INT as active,
        COUNT(*) FILTER (WHERE l.status = 'EXPIRED')::INT as expired,
        COUNT(*) FILTER (WHERE l.status = 'TERMINATED')::INT as terminated,
        COALESCE(AVG(l."monthlyRent"), 0)::DECIMAL as "averageRent",
        COALESCE(SUM(l."monthlyRent"), 0)::DECIMAL as "totalRent",
        COUNT(*) FILTER (WHERE l."endDate" < CURRENT_DATE + INTERVAL '30 days' AND l.status = 'ACTIVE')::INT as "expiringIn30Days"
      FROM "lease" l
      INNER JOIN "unit" u ON l."unitId" = u.id
      INNER JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ) s
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Get expiring leases
CREATE OR REPLACE FUNCTION get_expiring_leases(
  p_user_id UUID,
  p_days INT DEFAULT 30
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(l))
    FROM "lease" l
    INNER JOIN "unit" u ON l."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
    AND l.status = 'ACTIVE'
    AND l."endDate" <= CURRENT_DATE + INTERVAL '1 day' * p_days
    ORDER BY l."endDate" ASC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Get single lease by ID
CREATE OR REPLACE FUNCTION get_lease_by_id(
  p_user_id UUID,
  p_lease_id UUID
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT row_to_json(l)
    FROM "lease" l
    INNER JOIN "unit" u ON l."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
    AND l.id = p_lease_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing lease function to avoid parameter conflicts
DROP FUNCTION IF EXISTS create_lease(UUID, UUID, UUID, DATE, DATE, DECIMAL, DECIMAL, TEXT, TEXT);

-- Create new lease
CREATE OR REPLACE FUNCTION create_lease(
  p_user_id UUID,
  p_tenant_id UUID,
  p_unit_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_rentAmount DECIMAL,
  p_security_deposit DECIMAL,
  p_payment_frequency TEXT DEFAULT 'MONTHLY',
  p_status TEXT DEFAULT 'DRAFT'
)
RETURNS JSON AS $$
DECLARE
  v_lease_id UUID;
  v_result JSON;
BEGIN
  -- Verify unit ownership
  IF NOT EXISTS (
    SELECT 1 FROM "unit" u
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE u.id = p_unit_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;
  
  -- Verify tenant ownership
  IF NOT EXISTS (
    SELECT 1 FROM "tenant" 
    WHERE id = p_tenant_id AND "ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Tenant not found or access denied';
  END IF;
  
  -- Insert lease
  INSERT INTO "lease" (
    "tenantId",
    "unitId", 
    "startDate",
    "endDate",
    "monthlyRent",
    "securityDeposit",
    "paymentFrequency",
    status
  ) VALUES (
    p_tenant_id,
    p_unit_id,
    p_start_date,
    p_end_date,
    p_rentAmount,
    p_security_deposit,
    p_payment_frequency,
    p_status
  ) RETURNING id INTO v_lease_id;
  
  -- Return created lease
  SELECT row_to_json(l) INTO v_result
  FROM "lease" l
  WHERE l.id = v_lease_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing update lease function to avoid parameter conflicts
DROP FUNCTION IF EXISTS update_lease(UUID, UUID, DATE, DATE, DECIMAL, DECIMAL, TEXT, TEXT);

-- Update lease
CREATE OR REPLACE FUNCTION update_lease(
  p_user_id UUID,
  p_lease_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_rentAmount DECIMAL DEFAULT NULL,
  p_security_deposit DECIMAL DEFAULT NULL,
  p_payment_frequency TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "lease" l
    INNER JOIN "unit" u ON l."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE l.id = p_lease_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Lease not found or access denied';
  END IF;
  
  -- Update lease with only non-null values
  UPDATE "lease"
  SET 
    "startDate" = COALESCE(p_start_date, "startDate"),
    "endDate" = COALESCE(p_end_date, "endDate"),
    "monthlyRent" = COALESCE(p_rentAmount, "monthlyRent"),
    "securityDeposit" = COALESCE(p_security_deposit, "securityDeposit"),
    "paymentFrequency" = COALESCE(p_payment_frequency, "paymentFrequency"),
    status = COALESCE(p_status, status),
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_lease_id;
  
  -- Return updated lease
  SELECT row_to_json(l) INTO v_result
  FROM "lease" l
  WHERE l.id = p_lease_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Delete lease
CREATE OR REPLACE FUNCTION delete_lease(
  p_user_id UUID,
  p_lease_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "lease" l
    INNER JOIN "unit" u ON l."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE l.id = p_lease_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Lease not found or access denied';
  END IF;
  
  -- Delete lease
  DELETE FROM "lease" WHERE id = p_lease_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Renew lease
CREATE OR REPLACE FUNCTION renew_lease(
  p_user_id UUID,
  p_lease_id UUID,
  p_new_end_date DATE
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership and lease is renewable
  IF NOT EXISTS (
    SELECT 1 FROM "lease" l
    INNER JOIN "unit" u ON l."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE l.id = p_lease_id 
    AND p."ownerId" = p_user_id
    AND l.status IN ('ACTIVE', 'EXPIRED')
  ) THEN
    RAISE EXCEPTION 'Lease not found, access denied, or not renewable';
  END IF;
  
  -- Update lease with new end date and set status to active
  UPDATE "lease"
  SET 
    "endDate" = p_new_end_date,
    status = 'ACTIVE',
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_lease_id;
  
  -- Return updated lease
  SELECT row_to_json(l) INTO v_result
  FROM "lease" l
  WHERE l.id = p_lease_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Terminate lease
CREATE OR REPLACE FUNCTION terminate_lease(
  p_user_id UUID,
  p_lease_id UUID,
  p_reason TEXT DEFAULT 'Terminated by landlord'
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "lease" l
    INNER JOIN "unit" u ON l."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE l.id = p_lease_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Lease not found or access denied';
  END IF;
  
  -- Update lease status and add termination info
  UPDATE "lease"
  SET 
    status = 'TERMINATED',
    "terminationReason" = p_reason,
    "terminatedAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_lease_id;
  
  -- Return updated lease
  SELECT row_to_json(l) INTO v_result
  FROM "lease" l
  WHERE l.id = p_lease_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- ============================================
-- MAINTENANCE RPC FUNCTIONS
-- ============================================

-- Get all maintenance requests for a user with filtering and pagination
CREATE OR REPLACE FUNCTION get_user_maintenance(
  p_user_id UUID,
  p_unit_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'createdAt',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(m))
    FROM "maintenance_request" m
    INNER JOIN "unit" u ON m."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
    AND (p_unit_id IS NULL OR m."unitId" = p_unit_id)
    AND (p_property_id IS NULL OR u."propertyId" = p_property_id)
    AND (p_priority IS NULL OR m.priority = p_priority)
    AND (p_category IS NULL OR m.category = p_category)
    AND (p_status IS NULL OR m.status = p_status)
    ORDER BY m."createdAt" DESC
    LIMIT p_limit
    OFFSET p_offset
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Get maintenance statistics
CREATE OR REPLACE FUNCTION get_maintenance_stats(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT row_to_json(s) FROM (
      SELECT 
        COUNT(*)::INT as total,
        COUNT(*) FILTER (WHERE m.status = 'PENDING')::INT as pending,
        COUNT(*) FILTER (WHERE m.status = 'IN_PROGRESS')::INT as "inProgress",
        COUNT(*) FILTER (WHERE m.status = 'COMPLETED')::INT as completed,
        COUNT(*) FILTER (WHERE m.status = 'CANCELLED')::INT as cancelled,
        COUNT(*) FILTER (WHERE m.priority = 'URGENT')::INT as urgent,
        COUNT(*) FILTER (WHERE m."scheduledDate" < CURRENT_TIMESTAMP AND m.status != 'COMPLETED')::INT as overdue,
        COALESCE(AVG(m."estimatedCost"), 0)::DECIMAL as "avgEstimatedCost",
        COALESCE(AVG(m."actualCost"), 0)::DECIMAL as "avgActualCost",
        COALESCE(SUM(m."actualCost"), 0)::DECIMAL as "totalActualCost"
      FROM "maintenance_request" m
      INNER JOIN "unit" u ON m."unitId" = u.id
      INNER JOIN "property" p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id
    ) s
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Get urgent maintenance requests
CREATE OR REPLACE FUNCTION get_urgent_maintenance(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(m))
    FROM "maintenance_request" m
    INNER JOIN "unit" u ON m."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
    AND m.priority = 'URGENT'
    AND m.status IN ('PENDING', 'IN_PROGRESS')
    ORDER BY m."createdAt" DESC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get overdue maintenance requests
CREATE OR REPLACE FUNCTION get_overdue_maintenance(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(m))
    FROM "maintenance_request" m
    INNER JOIN "unit" u ON m."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
    AND m."scheduledDate" < CURRENT_TIMESTAMP
    AND m.status != 'COMPLETED'
    ORDER BY m."scheduledDate" ASC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Get single maintenance request by ID
CREATE OR REPLACE FUNCTION get_maintenance_by_id(
  p_user_id UUID,
  p_maintenance_id UUID
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT row_to_json(m)
    FROM "maintenance_request" m
    INNER JOIN "unit" u ON m."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE p."ownerId" = p_user_id
    AND m.id = p_maintenance_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Create new maintenance request
CREATE OR REPLACE FUNCTION create_maintenance(
  p_user_id UUID,
  p_unit_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_priority TEXT DEFAULT 'MEDIUM',
  p_category TEXT DEFAULT 'GENERAL',
  p_scheduled_date TIMESTAMP DEFAULT NULL,
  p_estimated_cost DECIMAL DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_maintenance_id UUID;
  v_result JSON;
BEGIN
  -- Verify unit ownership
  IF NOT EXISTS (
    SELECT 1 FROM "unit" u
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE u.id = p_unit_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;
  
  -- Insert maintenance request
  INSERT INTO "maintenance_request" (
    "unitId",
    title,
    description,
    priority,
    category,
    status,
    "scheduledDate",
    "estimatedCost"
  ) VALUES (
    p_unit_id,
    p_title,
    p_description,
    p_priority,
    p_category,
    'PENDING',
    p_scheduled_date,
    p_estimated_cost
  ) RETURNING id INTO v_maintenance_id;
  
  -- Return created maintenance request
  SELECT row_to_json(m) INTO v_result
  FROM "maintenance_request" m
  WHERE m.id = v_maintenance_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Update maintenance request
CREATE OR REPLACE FUNCTION update_maintenance(
  p_user_id UUID,
  p_maintenance_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_scheduled_date TIMESTAMP DEFAULT NULL,
  p_completed_date TIMESTAMP DEFAULT NULL,
  p_estimated_cost DECIMAL DEFAULT NULL,
  p_actual_cost DECIMAL DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "maintenance_request" m
    INNER JOIN "unit" u ON m."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE m.id = p_maintenance_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Maintenance request not found or access denied';
  END IF;
  
  -- Update maintenance request with only non-null values
  UPDATE "maintenance_request"
  SET 
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    priority = COALESCE(p_priority, priority),
    category = COALESCE(p_category, category),
    status = COALESCE(p_status, status),
    "scheduledDate" = COALESCE(p_scheduled_date, "scheduledDate"),
    "completedDate" = COALESCE(p_completed_date, "completedDate"),
    "estimatedCost" = COALESCE(p_estimated_cost, "estimatedCost"),
    "actualCost" = COALESCE(p_actual_cost, "actualCost"),
    notes = COALESCE(p_notes, notes),
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_maintenance_id;
  
  -- Return updated maintenance request
  SELECT row_to_json(m) INTO v_result
  FROM "maintenance_request" m
  WHERE m.id = p_maintenance_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Delete maintenance request
CREATE OR REPLACE FUNCTION delete_maintenance(
  p_user_id UUID,
  p_maintenance_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "maintenance_request" m
    INNER JOIN "unit" u ON m."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE m.id = p_maintenance_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Maintenance request not found or access denied';
  END IF;
  
  -- Delete maintenance request
  DELETE FROM "maintenance_request" WHERE id = p_maintenance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete maintenance request
CREATE OR REPLACE FUNCTION complete_maintenance(
  p_user_id UUID,
  p_maintenance_id UUID,
  p_actual_cost DECIMAL DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "maintenance_request" m
    INNER JOIN "unit" u ON m."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE m.id = p_maintenance_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Maintenance request not found or access denied';
  END IF;
  
  -- Update maintenance request to completed
  UPDATE "maintenance_request"
  SET 
    status = 'COMPLETED',
    "completedDate" = CURRENT_TIMESTAMP,
    "actualCost" = COALESCE(p_actual_cost, "actualCost"),
    notes = COALESCE(p_notes, notes),
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_maintenance_id;
  
  -- Return updated maintenance request
  SELECT row_to_json(m) INTO v_result
  FROM "maintenance_request" m
  WHERE m.id = p_maintenance_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel maintenance request
CREATE OR REPLACE FUNCTION cancel_maintenance(
  p_user_id UUID,
  p_maintenance_id UUID,
  p_reason TEXT DEFAULT 'Cancelled by user'
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM "maintenance_request" m
    INNER JOIN "unit" u ON m."unitId" = u.id
    INNER JOIN "property" p ON u."propertyId" = p.id
    WHERE m.id = p_maintenance_id AND p."ownerId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'Maintenance request not found or access denied';
  END IF;
  
  -- Update maintenance request to cancelled
  UPDATE "maintenance_request"
  SET 
    status = 'CANCELLED',
    "cancelledAt" = CURRENT_TIMESTAMP,
    "cancellationReason" = p_reason,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = p_maintenance_id;
  
  -- Return updated maintenance request
  SELECT row_to_json(m) INTO v_result
  FROM "maintenance_request" m
  WHERE m.id = p_maintenance_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;