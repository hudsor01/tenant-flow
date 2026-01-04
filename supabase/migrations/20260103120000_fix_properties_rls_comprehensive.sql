-- Comprehensive fix for properties table RLS policies
-- This migration drops ALL existing policies and creates clean, secure policies
-- that properly enforce data isolation between owners and prevent tenant access.
--
-- Issue: Previous migrations left conflicting policies that allowed cross-owner access
-- and unintended tenant access to properties.

BEGIN;

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES ON PROPERTIES
-- ============================================================================
-- Drop all policies to start fresh - we don't know which ones exist in the DB
DROP POLICY IF EXISTS "properties_delete_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_select_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_update_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_service_role" ON public.properties;
DROP POLICY IF EXISTS "tenants_view_properties" ON public.properties;
-- Drop any old policies that may exist from base schema
DROP POLICY IF EXISTS "properties_select" ON public.properties;
DROP POLICY IF EXISTS "properties_insert" ON public.properties;
DROP POLICY IF EXISTS "properties_update" ON public.properties;
DROP POLICY IF EXISTS "properties_delete" ON public.properties;

-- ============================================================================
-- STEP 2: CREATE CLEAN OWNER-ONLY POLICIES
-- ============================================================================
-- These policies use owner_user_id which directly references the user's auth.uid()
-- No intermediate lookup through property_owners or stripe_connected_accounts needed.

-- SELECT: Owners can only see their own properties
CREATE POLICY "properties_select_owner" ON public.properties
FOR SELECT TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

COMMENT ON POLICY "properties_select_owner" ON public.properties IS
  'Owners can only read properties where owner_user_id matches their auth.uid().
   Tenants have no direct SELECT access to properties table.';

-- INSERT: Owners can only create properties for themselves
CREATE POLICY "properties_insert_owner" ON public.properties
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = (SELECT auth.uid()));

COMMENT ON POLICY "properties_insert_owner" ON public.properties IS
  'Owners can only create properties with their own user_id as owner_user_id.
   Prevents users from creating properties owned by others.';

-- UPDATE: Owners can only update their own properties
CREATE POLICY "properties_update_owner" ON public.properties
FOR UPDATE TO authenticated
USING (owner_user_id = (SELECT auth.uid()))
WITH CHECK (owner_user_id = (SELECT auth.uid()));

COMMENT ON POLICY "properties_update_owner" ON public.properties IS
  'Owners can only update properties they own. Both USING and WITH CHECK ensure
   the property belongs to them before and after the update.';

-- DELETE: Owners can only delete their own properties
CREATE POLICY "properties_delete_owner" ON public.properties
FOR DELETE TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

COMMENT ON POLICY "properties_delete_owner" ON public.properties IS
  'Owners can only delete properties they own.';

-- SERVICE_ROLE: Full access for backend operations
CREATE POLICY "properties_service_role" ON public.properties
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "properties_service_role" ON public.properties IS
  'Service role has full access for backend administrative operations.';

-- ============================================================================
-- STEP 3: VERIFY RLS IS ENABLED
-- ============================================================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: FIX UNITS TABLE POLICIES (follows same pattern)
-- ============================================================================
-- Drop existing unit policies
DROP POLICY IF EXISTS "units_delete_owner" ON public.units;
DROP POLICY IF EXISTS "units_insert_owner" ON public.units;
DROP POLICY IF EXISTS "units_select" ON public.units;
DROP POLICY IF EXISTS "units_update_owner" ON public.units;
DROP POLICY IF EXISTS "units_service_role" ON public.units;

-- SELECT: Owners see their units, tenants see units they're leasing
CREATE POLICY "units_select" ON public.units
FOR SELECT TO authenticated
USING (
  -- Owner access: direct match on owner_user_id
  owner_user_id = (SELECT auth.uid())
  OR
  -- Tenant access: units they have active leases for
  id IN (
    SELECT l.unit_id
    FROM public.leases l
    JOIN public.lease_tenants lt ON lt.lease_id = l.id
    JOIN public.tenants t ON t.id = lt.tenant_id
    WHERE t.user_id = (SELECT auth.uid())
  )
);

COMMENT ON POLICY "units_select" ON public.units IS
  'Owners can see all their units. Tenants can only see units where they have a lease.';

-- INSERT: Only owners can create units in their properties
CREATE POLICY "units_insert_owner" ON public.units
FOR INSERT TO authenticated
WITH CHECK (
  owner_user_id = (SELECT auth.uid())
  AND
  -- Verify the property belongs to the same owner
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = (SELECT auth.uid())
  )
);

COMMENT ON POLICY "units_insert_owner" ON public.units IS
  'Owners can only create units in properties they own.';

-- UPDATE: Only owners can update their units
CREATE POLICY "units_update_owner" ON public.units
FOR UPDATE TO authenticated
USING (owner_user_id = (SELECT auth.uid()))
WITH CHECK (owner_user_id = (SELECT auth.uid()));

COMMENT ON POLICY "units_update_owner" ON public.units IS
  'Owners can only update units they own.';

-- DELETE: Only owners can delete their units
CREATE POLICY "units_delete_owner" ON public.units
FOR DELETE TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

COMMENT ON POLICY "units_delete_owner" ON public.units IS
  'Owners can only delete units they own.';

-- SERVICE_ROLE: Full access
CREATE POLICY "units_service_role" ON public.units
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled and forced
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units FORCE ROW LEVEL SECURITY;

COMMIT;
