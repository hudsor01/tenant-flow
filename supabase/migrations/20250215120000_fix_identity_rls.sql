-- Migration: Align RLS with tenant/auth identity mapping
-- Date: 2025-02-15
-- Purpose:
--   * Replace legacy helper functions that compared against owner ids.
--   * Rebuild Row Level Security policies so owners use property ownership
--     checks and tenants use tenant.auth_user_id matches.
--   * Extend RLS coverage to rent_payment, tenant_payment_method, and tenant
--     tables to guarantee tenant isolation.

-- ============================================================================
-- 1. Helper functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.user_owns_property(text);
DROP FUNCTION IF EXISTS public.user_is_active_tenant_of_unit(text);

CREATE OR REPLACE FUNCTION public.is_property_owner(property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM property p
    WHERE p.id = property_id
      AND p."ownerId" = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_property_owner IS
  'Checks whether the authenticated owner owns the given property.';

CREATE OR REPLACE FUNCTION public.is_authenticated_tenant(tenant_row_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = tenant_row_id
      AND t.auth_user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_authenticated_tenant IS
  'Checks whether the authenticated user matches the tenant row via tenant.auth_user_id.';

CREATE OR REPLACE FUNCTION public.is_authenticated_tenant_of_unit(unit_row_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM lease l
    JOIN tenant t ON t.id = l."tenantId"
    WHERE l."unitId" = unit_row_id
      AND l.status = 'ACTIVE'::"LeaseStatus"
      AND t.auth_user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_authenticated_tenant_of_unit IS
  'Checks whether the authenticated tenant currently holds an active lease on the unit.';

-- ============================================================================
-- 2. Property policies (owners only)
-- ============================================================================

DROP POLICY IF EXISTS "property_owner_select" ON property;
DROP POLICY IF EXISTS "property_owner_insert" ON property;
DROP POLICY IF EXISTS "property_owner_update" ON property;
DROP POLICY IF EXISTS "property_owner_delete" ON property;

CREATE POLICY "property_owner_select"
ON property
FOR SELECT
TO authenticated
USING (
  "ownerId" = auth.uid()
);

CREATE POLICY "property_owner_insert"
ON property
FOR INSERT
TO authenticated
WITH CHECK (
  "ownerId" = auth.uid()
);

CREATE POLICY "property_owner_update"
ON property
FOR UPDATE
TO authenticated
USING (
  "ownerId" = auth.uid()
)
WITH CHECK (
  "ownerId" = auth.uid()
);

CREATE POLICY "property_owner_delete"
ON property
FOR DELETE
TO authenticated
USING (
  "ownerId" = auth.uid()
);

-- ============================================================================
-- 3. Unit policies (owners + active tenants)
-- ============================================================================

DROP POLICY IF EXISTS "unit_owner_or_tenant_select" ON unit;
DROP POLICY IF EXISTS "unit_owner_insert" ON unit;
DROP POLICY IF EXISTS "unit_owner_update" ON unit;
DROP POLICY IF EXISTS "unit_owner_delete" ON unit;

CREATE POLICY "unit_owner_or_tenant_select"
ON unit
FOR SELECT
TO authenticated
USING (
  is_property_owner(unit."propertyId")
  OR is_authenticated_tenant_of_unit(unit.id)
);

CREATE POLICY "unit_owner_insert"
ON unit
FOR INSERT
TO authenticated
WITH CHECK (
  is_property_owner(unit."propertyId")
);

CREATE POLICY "unit_owner_update"
ON unit
FOR UPDATE
TO authenticated
USING (
  is_property_owner(unit."propertyId")
)
WITH CHECK (
  is_property_owner(unit."propertyId")
);

CREATE POLICY "unit_owner_delete"
ON unit
FOR DELETE
TO authenticated
USING (
  is_property_owner(unit."propertyId")
);

-- ============================================================================
-- 4. Lease policies (owners + tenants)
-- ============================================================================

DROP POLICY IF EXISTS "lease_owner_or_tenant_select" ON lease;
DROP POLICY IF EXISTS "lease_owner_insert" ON lease;
DROP POLICY IF EXISTS "lease_owner_update" ON lease;
DROP POLICY IF EXISTS "lease_owner_delete" ON lease;

CREATE POLICY "lease_owner_or_tenant_select"
ON lease
FOR SELECT
TO authenticated
USING (
  (
    lease."propertyId" IS NOT NULL
    AND is_property_owner(lease."propertyId")
  )
  OR (
    lease."unitId" IS NOT NULL
    AND is_property_owner(
      (SELECT u."propertyId" FROM unit u WHERE u.id = lease."unitId")
    )
  )
  OR is_authenticated_tenant(lease."tenantId")
);

CREATE POLICY "lease_owner_insert"
ON lease
FOR INSERT
TO authenticated
WITH CHECK (
  (
    lease."propertyId" IS NOT NULL
    AND is_property_owner(lease."propertyId")
  )
  OR (
    lease."unitId" IS NOT NULL
    AND is_property_owner(
      (SELECT u."propertyId" FROM unit u WHERE u.id = lease."unitId")
    )
  )
);

CREATE POLICY "lease_owner_update"
ON lease
FOR UPDATE
TO authenticated
USING (
  (
    lease."propertyId" IS NOT NULL
    AND is_property_owner(lease."propertyId")
  )
  OR (
    lease."unitId" IS NOT NULL
    AND is_property_owner(
      (SELECT u."propertyId" FROM unit u WHERE u.id = lease."unitId")
    )
  )
  OR is_authenticated_tenant(lease."tenantId")
)
WITH CHECK (
  (
    lease."propertyId" IS NOT NULL
    AND is_property_owner(lease."propertyId")
  )
  OR (
    lease."unitId" IS NOT NULL
    AND is_property_owner(
      (SELECT u."propertyId" FROM unit u WHERE u.id = lease."unitId")
    )
  )
);

CREATE POLICY "lease_owner_delete"
ON lease
FOR DELETE
TO authenticated
USING (
  (
    lease."propertyId" IS NOT NULL
    AND is_property_owner(lease."propertyId")
  )
  OR (
    lease."unitId" IS NOT NULL
    AND is_property_owner(
      (SELECT u."propertyId" FROM unit u WHERE u.id = lease."unitId")
    )
  )
);

-- ============================================================================
-- 5. Maintenance request policies (owners + tenants)
-- ============================================================================

DROP POLICY IF EXISTS "maintenance_request_owner_or_tenant_select" ON maintenance_request;
DROP POLICY IF EXISTS "maintenance_request_owner_or_tenant_insert" ON maintenance_request;
DROP POLICY IF EXISTS "maintenance_request_owner_or_tenant_update" ON maintenance_request;
DROP POLICY IF EXISTS "maintenance_request_owner_delete" ON maintenance_request;

CREATE POLICY "maintenance_request_owner_or_tenant_select"
ON maintenance_request
FOR SELECT
TO authenticated
USING (
  is_property_owner(
    (SELECT u."propertyId" FROM unit u WHERE u.id = maintenance_request."unitId")
  )
  OR maintenance_request."requestedBy" = auth.uid()
);

CREATE POLICY "maintenance_request_owner_or_tenant_insert"
ON maintenance_request
FOR INSERT
TO authenticated
WITH CHECK (
  is_property_owner(
    (SELECT u."propertyId" FROM unit u WHERE u.id = maintenance_request."unitId")
  )
  OR (
    is_authenticated_tenant_of_unit(maintenance_request."unitId")
    AND maintenance_request."requestedBy" = auth.uid()
  )
);

CREATE POLICY "maintenance_request_owner_or_tenant_update"
ON maintenance_request
FOR UPDATE
TO authenticated
USING (
  is_property_owner(
    (SELECT u."propertyId" FROM unit u WHERE u.id = maintenance_request."unitId")
  )
  OR maintenance_request."requestedBy" = auth.uid()
)
WITH CHECK (
  is_property_owner(
    (SELECT u."propertyId" FROM unit u WHERE u.id = maintenance_request."unitId")
  )
  OR (
    is_authenticated_tenant_of_unit(maintenance_request."unitId")
    AND maintenance_request."requestedBy" = auth.uid()
  )
);

CREATE POLICY "maintenance_request_owner_delete"
ON maintenance_request
FOR DELETE
TO authenticated
USING (
  is_property_owner(
    (SELECT u."propertyId" FROM unit u WHERE u.id = maintenance_request."unitId")
  )
);

-- ============================================================================
-- 6. Tenant table policies (owner read/write, tenants read-only)
-- ============================================================================

DROP POLICY IF EXISTS "tenant_owner_select" ON tenant;
DROP POLICY IF EXISTS "tenant_owner_insert" ON tenant;
DROP POLICY IF EXISTS "tenant_owner_update" ON tenant;
DROP POLICY IF EXISTS "tenant_owner_delete" ON tenant;
DROP POLICY IF EXISTS "tenant_self_select" ON tenant;

CREATE POLICY "tenant_owner_or_self_select"
ON tenant
FOR SELECT
TO authenticated
USING (
  tenant."userId" = auth.uid()
  OR tenant.auth_user_id = auth.uid()
);

CREATE POLICY "tenant_owner_insert"
ON tenant
FOR INSERT
TO authenticated
WITH CHECK (
  tenant."userId" = auth.uid()
);

CREATE POLICY "tenant_owner_update"
ON tenant
FOR UPDATE
TO authenticated
USING (
  tenant."userId" = auth.uid()
)
WITH CHECK (
  tenant."userId" = auth.uid()
);

CREATE POLICY "tenant_owner_delete"
ON tenant
FOR DELETE
TO authenticated
USING (
  tenant."userId" = auth.uid()
);

-- ============================================================================
-- 7. Rent payments (owners + tenants)
-- ============================================================================

DROP POLICY IF EXISTS "rent_payment_owner_access" ON rent_payment;
DROP POLICY IF EXISTS "rent_payment_tenant_access" ON rent_payment;

CREATE POLICY "rent_payment_owner_or_tenant_select"
ON rent_payment
FOR SELECT
TO authenticated
USING (
  rent_payment."ownerId" = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = rent_payment."tenantId"
      AND t.auth_user_id = auth.uid()
  )
);

CREATE POLICY "rent_payment_owner_insert"
ON rent_payment
FOR INSERT
TO authenticated
WITH CHECK (
  rent_payment."ownerId" = auth.uid()
);

CREATE POLICY "rent_payment_owner_update"
ON rent_payment
FOR UPDATE
TO authenticated
USING (
  rent_payment."ownerId" = auth.uid()
)
WITH CHECK (
  rent_payment."ownerId" = auth.uid()
);

CREATE POLICY "rent_payment_owner_delete"
ON rent_payment
FOR DELETE
TO authenticated
USING (
  rent_payment."ownerId" = auth.uid()
);

-- ============================================================================
-- 8. Tenant payment methods (tenants only)
-- ============================================================================

DROP POLICY IF EXISTS "tenant_payment_method_select" ON tenant_payment_method;
DROP POLICY IF EXISTS "tenant_payment_method_modify" ON tenant_payment_method;

CREATE POLICY "tenant_payment_method_self_select"
ON tenant_payment_method
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = tenant_payment_method."tenantId"
      AND t.auth_user_id = auth.uid()
  )
);

CREATE POLICY "tenant_payment_method_self_insert"
ON tenant_payment_method
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = tenant_payment_method."tenantId"
      AND t.auth_user_id = auth.uid()
  )
);

CREATE POLICY "tenant_payment_method_self_update"
ON tenant_payment_method
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = tenant_payment_method."tenantId"
      AND t.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = tenant_payment_method."tenantId"
      AND t.auth_user_id = auth.uid()
  )
);

CREATE POLICY "tenant_payment_method_self_delete"
ON tenant_payment_method
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = tenant_payment_method."tenantId"
      AND t.auth_user_id = auth.uid()
  )
);

-- End of migration
