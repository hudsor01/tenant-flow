-- Migration: Fix RLS infinite recursion on properties table
-- Issue: tenants_view_properties policy references properties in subquery, causing infinite recursion
-- Solution: Create SECURITY DEFINER function to get tenant-accessible property IDs

-- =============================================================================
-- Step 1: Create helper function for tenant property access (SECURITY DEFINER)
-- =============================================================================
-- This function bypasses RLS to return property IDs a tenant can access
-- via their lease_tenants -> leases -> units -> properties relationship

CREATE OR REPLACE FUNCTION public.get_tenant_property_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT DISTINCT u.property_id
  FROM lease_tenants lt
  JOIN leases l ON l.id = lt.lease_id
  JOIN units u ON u.id = l.unit_id
  WHERE lt.tenant_id = get_current_tenant_id();
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_tenant_property_ids() TO authenticated;

-- =============================================================================
-- Step 2: Drop the problematic policy and recreate it using the function
-- =============================================================================

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS tenants_view_properties ON public.properties;

-- Recreate the policy using the SECURITY DEFINER function instead of a subquery
-- This avoids the RLS check recursion because the function uses SECURITY DEFINER
CREATE POLICY tenants_view_properties ON public.properties
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT * FROM get_tenant_property_ids()));

-- =============================================================================
-- Step 3: Clean up duplicate/old-style policies on units table
-- =============================================================================
-- There are old-style policies that also cause recursion by querying properties

-- Drop old-style policies that reference properties with RLS
DROP POLICY IF EXISTS "Property owners can delete units" ON public.units;
DROP POLICY IF EXISTS "Property owners can insert units" ON public.units;
DROP POLICY IF EXISTS "Property owners can select units" ON public.units;
DROP POLICY IF EXISTS "Property owners can update units" ON public.units;

-- The new-style policies (units_select, units_insert_owner, etc.) use
-- get_current_property_owner_id() which is SECURITY DEFINER, so they're safe

-- =============================================================================
-- Step 4: Verify the policies are correct
-- =============================================================================
-- This is just a comment for documentation - actual verification happens in tests

-- Properties table should have these policies:
-- - properties_select_owner: property_owner_id = get_current_property_owner_id()
-- - tenants_view_properties: id IN (SELECT * FROM get_tenant_property_ids())
-- - properties_insert_owner, properties_update_owner, properties_delete_owner
-- - properties_service_role

-- Units table should have these policies:
-- - units_select: property_owner_id = get_current_property_owner_id() OR tenant access via function
-- - units_insert_owner, units_update_owner, units_delete_owner
-- - units_service_role

-- =============================================================================
-- Step 5: Create helper function for tenant unit access (SECURITY DEFINER)
-- =============================================================================
-- Update units_select policy to use a SECURITY DEFINER function as well

CREATE OR REPLACE FUNCTION public.get_tenant_unit_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT DISTINCT l.unit_id
  FROM lease_tenants lt
  JOIN leases l ON l.id = lt.lease_id
  WHERE lt.tenant_id = get_current_tenant_id();
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_tenant_unit_ids() TO authenticated;

-- Drop and recreate units_select to avoid any potential recursion
DROP POLICY IF EXISTS units_select ON public.units;

CREATE POLICY units_select ON public.units
  FOR SELECT
  TO authenticated
  USING (
    property_owner_id = get_current_property_owner_id()
    OR id IN (SELECT * FROM get_tenant_unit_ids())
  );

-- =============================================================================
-- Step 6: Fix leases infinite recursion
-- =============================================================================
-- leases_select policy references lease_tenants which references back to leases

CREATE OR REPLACE FUNCTION public.get_tenant_lease_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT DISTINCT lt.lease_id
  FROM lease_tenants lt
  WHERE lt.tenant_id = get_current_tenant_id();
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_lease_ids() TO authenticated;

DROP POLICY IF EXISTS leases_select ON public.leases;

CREATE POLICY leases_select ON public.leases
  FOR SELECT
  TO authenticated
  USING (
    property_owner_id = get_current_property_owner_id()
    OR id IN (SELECT * FROM get_tenant_lease_ids())
  );

-- =============================================================================
-- Step 7: Fix lease_tenants infinite recursion
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_owner_lease_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT DISTINCT lt.id
  FROM lease_tenants lt
  JOIN leases l ON l.id = lt.lease_id
  WHERE l.property_owner_id = get_current_property_owner_id();
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_lease_tenant_ids() TO authenticated;

DROP POLICY IF EXISTS lease_tenants_select ON public.lease_tenants;

CREATE POLICY lease_tenants_select ON public.lease_tenants
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR id IN (SELECT * FROM get_owner_lease_tenant_ids())
  );

DROP POLICY IF EXISTS lease_tenants_update_owner ON public.lease_tenants;
DROP POLICY IF EXISTS lease_tenants_delete_owner ON public.lease_tenants;

CREATE POLICY lease_tenants_update_owner ON public.lease_tenants
  FOR UPDATE
  TO authenticated
  USING (id IN (SELECT * FROM get_owner_lease_tenant_ids()));

CREATE POLICY lease_tenants_delete_owner ON public.lease_tenants
  FOR DELETE
  TO authenticated
  USING (id IN (SELECT * FROM get_owner_lease_tenant_ids()));

-- =============================================================================
-- Step 8: Add missing GRANT statements for authenticated role
-- =============================================================================
-- The authenticated role needs base table permissions for RLS to work

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_owners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_tenants TO authenticated;
