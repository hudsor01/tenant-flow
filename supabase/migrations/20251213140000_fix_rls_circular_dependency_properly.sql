-- PROPER Fix for RLS Circular Dependency
--
-- **PROBLEM**: Previous migration (20251213130000) did NOT fix the circular dependency.
--
-- The cycle still exists:
-- 1. User queries leases → RLS evaluates leases_select
-- 2. leases_select reads lease_tenants → RLS evaluates lease_tenants_select
-- 3. lease_tenants_select reads leases → RLS evaluates leases_select AGAIN
-- 4. → Infinite recursion!
--
-- **SOLUTION**: Use SECURITY DEFINER functions to bypass RLS within policy checks.
-- This breaks the recursion cycle by allowing the policy subqueries to read
-- without triggering additional RLS checks.

BEGIN;

-- Drop existing problematic policies
DROP POLICY IF EXISTS leases_select ON public.leases;
DROP POLICY IF EXISTS lease_tenants_select ON public.lease_tenants;

-- ============================================================================
-- SECURITY DEFINER Functions (bypass RLS)
-- ============================================================================

-- Get lease IDs that a specific tenant can access
-- SECURITY DEFINER allows this to bypass RLS on lease_tenants table
CREATE OR REPLACE FUNCTION public.get_tenant_accessible_lease_ids(p_tenant_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT lease_id
  FROM public.lease_tenants
  WHERE tenant_id = p_tenant_id;
$$;

-- Get lease_tenants IDs that a specific property owner can access
-- SECURITY DEFINER allows this to bypass RLS on leases table
CREATE OR REPLACE FUNCTION public.get_owner_accessible_lease_tenant_ids(p_owner_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT lt.id
  FROM public.lease_tenants lt
  INNER JOIN public.leases l ON lt.lease_id = l.id
  WHERE l.property_owner_id = p_owner_id;
$$;

-- ============================================================================
-- RLS Policies (using SECURITY DEFINER functions - NO RECURSION)
-- ============================================================================

-- Leases SELECT policy: Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY leases_select ON public.leases FOR SELECT TO authenticated USING (
  -- Owner can see their own leases
  (property_owner_id = public.get_current_property_owner_id()) OR
  -- Tenant can see leases they're assigned to (via SECURITY DEFINER function)
  (id IN (SELECT public.get_tenant_accessible_lease_ids(public.get_current_tenant_id())))
);

-- Lease Tenants SELECT policy: Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY lease_tenants_select ON public.lease_tenants FOR SELECT TO authenticated USING (
  -- Tenant can see their own records
  (tenant_id = public.get_current_tenant_id()) OR
  -- Owner can see lease_tenant records for their leases (via SECURITY DEFINER function)
  (id IN (SELECT public.get_owner_accessible_lease_tenant_ids(public.get_current_property_owner_id())))
);

-- ============================================================================
-- Security: Grant EXECUTE on SECURITY DEFINER functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_tenant_accessible_lease_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_accessible_lease_tenant_ids(uuid) TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify no circular dependency:
--
-- 1. Enable query logging:
--    SET log_statement = 'all';
--
-- 2. Query as a tenant:
--    SELECT * FROM leases WHERE id = '<some-lease-id>';
--
-- 3. Check logs - should see:
--    - leases_select policy triggered
--    - get_tenant_accessible_lease_ids() called
--    - NO additional RLS policy triggers from within the function
--
-- 4. Query should complete in <100ms (no infinite recursion)
