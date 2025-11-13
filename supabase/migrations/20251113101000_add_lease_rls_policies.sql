-- Ensures Row Level Security on `lease` is enforced for owners and tenants
-- so authenticated API clients cannot bypass tenant boundaries.

ALTER TABLE public.lease ENABLE ROW LEVEL SECURITY;

-- Helper condition for owner access via the property-owner relationship
-- Only allow authenticated users whose Supabase ID matches a property's owner
-- to read or modify leases tied to that property.

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
      AND u.supabaseId = auth.uid()
  )
);

-- Owner modification policy (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "lease_owner_modify" ON public.lease;
CREATE POLICY "lease_owner_modify"
ON public.lease
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM property p
    JOIN users u ON p."ownerId" = u.id
    WHERE p.id = lease."propertyId"
      AND u.supabaseId = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM property p
    JOIN users u ON p."ownerId" = u.id
    WHERE p.id = lease."propertyId"
      AND u.supabaseId = auth.uid()
  )
);

-- Tenant SELECT policy (tenants can only read their own lease)
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
      AND t.auth_user_id = auth.uid()
  )
);

-- Service role should be able to manage leases for background jobs / migrations
DROP POLICY IF EXISTS "lease_service_role_access" ON public.lease;
CREATE POLICY "lease_service_role_access"
ON public.lease
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
