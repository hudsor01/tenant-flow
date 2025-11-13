-- Ensures Row Level Security on `lease` is enforced for owners and tenants
-- so authenticated API clients cannot bypass tenant boundaries.

ALTER TABLE public.lease ENABLE ROW LEVEL SECURITY;

-- Owner SELECT policy
DROP POLICY IF EXISTS "lease_owner_select" ON public.lease;
CREATE POLICY "lease_owner_select"
ON public.lease
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM property p
    JOIN users u ON p."ownerId" = u.id
    WHERE p.id = lease."propertyId"
      AND u."supabaseId" = auth.uid()::text
  )
);

-- Owner INSERT policy
DROP POLICY IF EXISTS "lease_owner_insert" ON public.lease;
CREATE POLICY "lease_owner_insert"
ON public.lease
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM property p
    JOIN users u ON p."ownerId" = u.id
    WHERE p.id = lease."propertyId"
      AND u."supabaseId" = auth.uid()::text
  )
);

-- Owner UPDATE policy
DROP POLICY IF EXISTS "lease_owner_update" ON public.lease;
CREATE POLICY "lease_owner_update"
ON public.lease
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM property p
    JOIN users u ON p."ownerId" = u.id
    WHERE p.id = lease."propertyId"
      AND u."supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM property p
    JOIN users u ON p."ownerId" = u.id
    WHERE p.id = lease."propertyId"
      AND u."supabaseId" = auth.uid()::text
  )
);

-- Owner DELETE policy
DROP POLICY IF EXISTS "lease_owner_delete" ON public.lease;
CREATE POLICY "lease_owner_delete"
ON public.lease
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM property p
    JOIN users u ON p."ownerId" = u.id
    WHERE p.id = lease."propertyId"
      AND u."supabaseId" = auth.uid()::text
  )
);

-- Tenant SELECT policy
DROP POLICY IF EXISTS "lease_tenant_select" ON public.lease;
CREATE POLICY "lease_tenant_select"
ON public.lease
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tenant t
    WHERE t.id = lease."tenantId"
      AND t.auth_user_id = auth.uid()::text
  )
);

-- Service role access
DROP POLICY IF EXISTS "lease_service_role_access" ON public.lease;
CREATE POLICY "lease_service_role_access"
ON public.lease
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
