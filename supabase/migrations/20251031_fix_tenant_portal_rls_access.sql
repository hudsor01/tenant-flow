-- Migration: Fix Tenant Portal RLS Access
-- Date: 2025-10-31
-- Description: Add tenant access to lease, maintenance_request, and unit tables
--              so tenants can view their own data through the tenant portal
--
-- CRITICAL ISSUE: Tenants were completely locked out of their own lease data,
--                 maintenance requests, and unit information
--
-- Security Model:
--   - Owners: Can see all data for properties they own
--   - Tenants: Can ONLY see their own lease, payments, maintenance requests, and unit

-- =====================================================
-- 1. LEASE TABLE - Add Tenant Access
-- =====================================================
-- Current: Only owners can view leases
-- Fixed: Owners can view all their property leases, tenants can view their own lease

DROP POLICY IF EXISTS "Users can only access leases in their properties" ON public.lease;

-- SELECT: Owners see all their leases, tenants see only their own
CREATE POLICY "lease_owner_or_tenant_select" ON public.lease
  FOR SELECT TO authenticated
  USING (
    -- Owners can see all leases in their properties
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
    OR
    -- Tenants can see their own lease
    "tenantId" = (SELECT auth.uid()::text)
  );

-- INSERT: Only owners can create leases
CREATE POLICY "lease_owner_insert" ON public.lease
  FOR INSERT TO authenticated
  WITH CHECK (
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
  );

-- UPDATE: Only owners can update leases
CREATE POLICY "lease_owner_update" ON public.lease
  FOR UPDATE TO authenticated
  USING (
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
  )
  WITH CHECK (
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
  );

-- DELETE: Only owners can delete leases
CREATE POLICY "lease_owner_delete" ON public.lease
  FOR DELETE TO authenticated
  USING (
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
  );

-- =====================================================
-- 2. MAINTENANCE_REQUEST TABLE - Add Tenant Access
-- =====================================================
-- Current: Only owners can view maintenance requests
-- Fixed: Owners can view all requests, tenants can view/create their own

DROP POLICY IF EXISTS "Users can only access maintenance requests for their properties" ON public.maintenance_request;

-- SELECT: Owners see all requests, tenants see requests they created
CREATE POLICY "maintenance_request_owner_or_tenant_select" ON public.maintenance_request
  FOR SELECT TO authenticated
  USING (
    -- Owners can see all requests for their properties
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
    OR
    -- Tenants can see requests they created
    "createdBy" = (SELECT auth.uid()::text)
  );

-- INSERT: Both owners and tenants can create maintenance requests
CREATE POLICY "maintenance_request_owner_or_tenant_insert" ON public.maintenance_request
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Owners can create requests for their properties
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
    OR
    -- Tenants can create requests for their unit
    ("unitId" IN (
      SELECT l."unitId" FROM lease l
      WHERE l."tenantId" = (SELECT auth.uid()::text)
      AND l.status = 'ACTIVE'
    ) AND "createdBy" = (SELECT auth.uid()::text))
  );

-- UPDATE: Owners can update all requests, tenants can update only their own
CREATE POLICY "maintenance_request_owner_or_tenant_update" ON public.maintenance_request
  FOR UPDATE TO authenticated
  USING (
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
    OR
    "createdBy" = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
    OR
    "createdBy" = (SELECT auth.uid()::text)
  );

-- DELETE: Only owners can delete maintenance requests
CREATE POLICY "maintenance_request_owner_delete" ON public.maintenance_request
  FOR DELETE TO authenticated
  USING (
    "unitId" IN (
      SELECT u.id FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = (SELECT auth.uid()::text)
    )
  );

-- =====================================================
-- 3. UNIT TABLE - Add Tenant Read Access
-- =====================================================
-- Current: Only owners can view units
-- Fixed: Owners can manage units, tenants can VIEW their assigned unit

-- First, check if there are existing unit policies and drop them
DROP POLICY IF EXISTS "Users can only access units in their properties" ON public.unit;
DROP POLICY IF EXISTS "unit_owner_access" ON public.unit;
DROP POLICY IF EXISTS "unit_select_owner" ON public.unit;

-- SELECT: Owners see all their units, tenants see only their assigned unit
CREATE POLICY "unit_owner_or_tenant_select" ON public.unit
  FOR SELECT TO authenticated
  USING (
    -- Owners can see all units in their properties
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = (SELECT auth.uid()::text)
    )
    OR
    -- Tenants can see their assigned unit
    id IN (
      SELECT "unitId" FROM lease
      WHERE "tenantId" = (SELECT auth.uid()::text)
      AND status = 'ACTIVE'
    )
  );

-- INSERT/UPDATE/DELETE: Only owners can manage units
CREATE POLICY "unit_owner_insert" ON public.unit
  FOR INSERT TO authenticated
  WITH CHECK (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "unit_owner_update" ON public.unit
  FOR UPDATE TO authenticated
  USING (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = (SELECT auth.uid()::text)
    )
  )
  WITH CHECK (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY "unit_owner_delete" ON public.unit
  FOR DELETE TO authenticated
  USING (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = (SELECT auth.uid()::text)
    )
  );

-- =====================================================
-- COMMENTS FOR SECURITY AUDIT
-- =====================================================
COMMENT ON POLICY "lease_owner_or_tenant_select" ON public.lease IS
  'SECURITY: Owners can view all leases for their properties, tenants can view ONLY their own lease';

COMMENT ON POLICY "maintenance_request_owner_or_tenant_select" ON public.maintenance_request IS
  'SECURITY: Owners can view all maintenance requests for their properties, tenants can view ONLY requests they created';

COMMENT ON POLICY "unit_owner_or_tenant_select" ON public.unit IS
  'SECURITY: Owners can view all units in their properties, tenants can view ONLY their assigned unit (read-only)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- After running this migration, verify tenant isolation with:
--
-- As a tenant user:
-- SELECT * FROM lease WHERE "tenantId" != auth.uid()::text;  -- Should return 0 rows
-- SELECT * FROM maintenance_request WHERE "createdBy" != auth.uid()::text;  -- Should return 0 rows
-- SELECT * FROM unit WHERE id NOT IN (SELECT "unitId" FROM lease WHERE "tenantId" = auth.uid()::text);  -- Should return 0 rows
--
-- As an owner user:
-- SELECT * FROM lease WHERE "unitId" NOT IN (SELECT u.id FROM unit u JOIN property p ON u."propertyId" = p.id WHERE p."ownerId" = auth.uid()::text);  -- Should return 0 rows
