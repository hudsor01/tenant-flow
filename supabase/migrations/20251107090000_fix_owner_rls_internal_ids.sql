-- Align owner-facing RLS policies with internal users.id mapping
-- Ensures property, tenant, and rent_payment tables respect users.supabaseId

-- Helper to map auth.uid() -> users.id
CREATE OR REPLACE FUNCTION public.current_internal_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
  SELECT u.id
  FROM users u
  WHERE u."supabaseId" = auth.uid()::text
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_internal_user_id IS
  'Maps Supabase auth.uid() to internal users.id for owner-scoped RLS policies.';

-- Rebuild is_property_owner helper to use internal IDs
CREATE OR REPLACE FUNCTION public.is_property_owner(property_id text)
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
      AND p."ownerId" = public.current_internal_user_id()
  );
$$;

COMMENT ON FUNCTION public.is_property_owner IS
  'Checks whether the authenticated user owns the given property using users.supabaseId mapping.';

-- =====================================================================
-- Property policies (owners only)
-- =====================================================================

DROP POLICY IF EXISTS "property_owner_select" ON public.property;
DROP POLICY IF EXISTS "property_owner_insert" ON public.property;
DROP POLICY IF EXISTS "property_owner_update" ON public.property;
DROP POLICY IF EXISTS "property_owner_delete" ON public.property;

CREATE POLICY "property_owner_select"
ON public.property
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = property."ownerId"
      AND u."supabaseId" = auth.uid()::text
      AND u."role" = 'OWNER'
  )
);

CREATE POLICY "property_owner_insert"
ON public.property
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = property."ownerId"
      AND u."supabaseId" = auth.uid()::text
      AND u."role" = 'OWNER'
  )
);

CREATE POLICY "property_owner_update"
ON public.property
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = property."ownerId"
      AND u."supabaseId" = auth.uid()::text
      AND u."role" = 'OWNER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = property."ownerId"
      AND u."supabaseId" = auth.uid()::text
      AND u."role" = 'OWNER'
  )
);

CREATE POLICY "property_owner_delete"
ON public.property
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = property."ownerId"
      AND u."supabaseId" = auth.uid()::text
      AND u."role" = 'OWNER'
  )
);

-- =====================================================================
-- Tenant policies (owners manage their tenants, tenants see their own data)
-- =====================================================================

DROP POLICY IF EXISTS "tenant_owner_or_self_select" ON public.tenant;
DROP POLICY IF EXISTS "tenant_owner_insert" ON public.tenant;
DROP POLICY IF EXISTS "tenant_owner_update" ON public.tenant;
DROP POLICY IF EXISTS "tenant_owner_delete" ON public.tenant;

CREATE POLICY "tenant_owner_or_self_select"
ON public.tenant
FOR SELECT
TO authenticated
USING (
  tenant.auth_user_id = auth.uid()
  OR (
    tenant."userId" IS NOT NULL
    AND tenant."userId" = public.current_internal_user_id()
  )
);

CREATE POLICY "tenant_owner_insert"
ON public.tenant
FOR INSERT
TO authenticated
WITH CHECK (
  tenant."userId" = public.current_internal_user_id()
);

CREATE POLICY "tenant_owner_update"
ON public.tenant
FOR UPDATE
TO authenticated
USING (
  tenant."userId" = public.current_internal_user_id()
)
WITH CHECK (
  tenant."userId" = public.current_internal_user_id()
);

CREATE POLICY "tenant_owner_delete"
ON public.tenant
FOR DELETE
TO authenticated
USING (
  tenant."userId" = public.current_internal_user_id()
);

-- =====================================================================
-- Rent payment policies (owners + tenants)
-- =====================================================================

DROP POLICY IF EXISTS "rent_payment_owner_access" ON public.rent_payment;
DROP POLICY IF EXISTS "rent_payment_owner_or_tenant_select" ON public.rent_payment;
DROP POLICY IF EXISTS "rent_payment_owner_insert" ON public.rent_payment;
DROP POLICY IF EXISTS "rent_payment_owner_update" ON public.rent_payment;
DROP POLICY IF EXISTS "rent_payment_owner_delete" ON public.rent_payment;

CREATE POLICY "rent_payment_owner_or_tenant_select"
ON public.rent_payment
FOR SELECT
TO authenticated
USING (
  rent_payment."ownerId" = public.current_internal_user_id()
  OR EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = rent_payment."tenantId"
      AND t.auth_user_id = auth.uid()
  )
);

CREATE POLICY "rent_payment_owner_insert"
ON public.rent_payment
FOR INSERT
TO authenticated
WITH CHECK (
  rent_payment."ownerId" = public.current_internal_user_id()
);

CREATE POLICY "rent_payment_owner_update"
ON public.rent_payment
FOR UPDATE
TO authenticated
USING (
  rent_payment."ownerId" = public.current_internal_user_id()
)
WITH CHECK (
  rent_payment."ownerId" = public.current_internal_user_id()
);

CREATE POLICY "rent_payment_owner_delete"
ON public.rent_payment
FOR DELETE
TO authenticated
USING (
  rent_payment."ownerId" = public.current_internal_user_id()
);
