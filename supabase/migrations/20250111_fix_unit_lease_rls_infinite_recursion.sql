-- Migration: Fix RLS infinite recursion and critical security vulnerabilities
-- Date: 2025-01-11
-- 
-- CRITICAL FIXES:
-- 1. Unit/Lease Infinite Recursion: Circular dependency causing production errors
-- 2. Property Table: RLS enabled but NO policies (all data exposed!)
-- 3. Notifications Table: RLS enabled but NO policies (all data exposed!)
--
-- ISSUES FIXED:
-- - Unit SELECT policy checks lease table (for active tenants)
-- - Lease SELECT policy checks unit table (for property owners)
-- - This creates infinite recursion: unit → lease → unit → lease → ...
-- - Property table has RLS enabled but zero policies
-- - Notifications table has RLS enabled but zero policies
--
-- SOLUTION:
-- - Create SECURITY DEFINER helper functions per official Supabase docs
-- - Use helper functions in RLS policies to break circular dependency
-- - Add missing RLS policies for property and notifications tables

-- ============================================================================
-- 1. Create helper function to check if user owns a property
-- ============================================================================
-- Pattern from Supabase docs: Use STABLE SECURITY DEFINER functions to break
-- circular RLS dependencies. SQL language is more performant than plpgsql.
-- COST hint helps query planner optimize execution.

CREATE OR REPLACE FUNCTION public.user_owns_property(property_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
COST 100
AS $$
  SELECT EXISTS (
    SELECT 1 FROM property
    WHERE id = property_id
    AND "ownerId" = get_auth_uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_property(text) TO authenticated;

COMMENT ON FUNCTION public.user_owns_property IS 'Supabase RLS helper: Check property ownership without triggering circular RLS recursion. Uses SECURITY DEFINER pattern per official docs.';

-- ============================================================================
-- 2. Create helper function to check if user is active tenant of a unit
-- ============================================================================
-- Pattern from Supabase docs: Use STABLE SECURITY DEFINER functions to break
-- circular RLS dependencies. SQL language is more performant than plpgsql.
-- COST hint helps query planner optimize execution.

CREATE OR REPLACE FUNCTION public.user_is_active_tenant_of_unit(unit_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
COST 100
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lease
    WHERE "unitId" = unit_id
    AND "tenantId" = get_auth_uid()
    AND status = 'ACTIVE'::"LeaseStatus"
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_active_tenant_of_unit(text) TO authenticated;

COMMENT ON FUNCTION public.user_is_active_tenant_of_unit IS 'Supabase RLS helper: Check active tenant status without triggering circular RLS recursion. Uses SECURITY DEFINER pattern per official docs.';

-- ============================================================================
-- 3. Drop existing unit RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "unit_owner_or_tenant_select" ON unit;
DROP POLICY IF EXISTS "unit_owner_insert" ON unit;
DROP POLICY IF EXISTS "unit_owner_update" ON unit;
DROP POLICY IF EXISTS "unit_owner_delete" ON unit;

-- ============================================================================
-- 4. Create new unit RLS policies using helper functions
-- ============================================================================

-- SELECT: Allow property owners OR active tenants to view units
CREATE POLICY "unit_owner_or_tenant_select"
ON unit
FOR SELECT
TO authenticated
USING (
  user_owns_property("propertyId")
  OR
  user_is_active_tenant_of_unit(id)
);

-- INSERT: Allow property owners to create units
CREATE POLICY "unit_owner_insert"
ON unit
FOR INSERT
TO authenticated
WITH CHECK (
  user_owns_property("propertyId")
);

-- UPDATE: Allow property owners to update units
CREATE POLICY "unit_owner_update"
ON unit
FOR UPDATE
TO authenticated
USING (
  user_owns_property("propertyId")
)
WITH CHECK (
  user_owns_property("propertyId")
);

-- DELETE: Allow property owners to delete units
CREATE POLICY "unit_owner_delete"
ON unit
FOR DELETE
TO authenticated
USING (
  user_owns_property("propertyId")
);

-- ============================================================================
-- 5. Drop existing lease RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "lease_owner_or_tenant_select" ON lease;
DROP POLICY IF EXISTS "Users can only access leases in their properties" ON lease;
DROP POLICY IF EXISTS "Users can update leases for their properties" ON lease;
DROP POLICY IF EXISTS "Users can delete leases for their properties" ON lease;

-- ============================================================================
-- 6. Create new lease RLS policies using helper functions
-- ============================================================================

-- SELECT: Allow property owners OR tenants to view their leases
CREATE POLICY "lease_owner_or_tenant_select"
ON lease
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM unit
    WHERE unit.id = lease."unitId"
    AND user_owns_property(unit."propertyId")
  )
  OR
  "tenantId" = get_auth_uid()
);

-- INSERT: Allow property owners to create leases for their units
CREATE POLICY "lease_owner_insert"
ON lease
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM unit
    WHERE unit.id = lease."unitId"
    AND user_owns_property(unit."propertyId")
  )
);

-- UPDATE: Allow property owners to update leases for their units
CREATE POLICY "lease_owner_update"
ON lease
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM unit
    WHERE unit.id = lease."unitId"
    AND user_owns_property(unit."propertyId")
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM unit
    WHERE unit.id = lease."unitId"
    AND user_owns_property(unit."propertyId")
  )
);

-- DELETE: Allow property owners to delete leases for their units
CREATE POLICY "lease_owner_delete"
ON lease
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM unit
    WHERE unit.id = lease."unitId"
    AND user_owns_property(unit."propertyId")
  )
);

-- ============================================================================
-- 7. Add missing RLS policies for property table (CRITICAL SECURITY FIX)
-- ============================================================================
-- Security Advisory: property table has RLS enabled but NO policies exist
-- This is a critical security vulnerability - anyone can access all properties!

-- SELECT: Allow owners to view their own properties
CREATE POLICY "property_owner_select"
ON property
FOR SELECT
TO authenticated
USING (
  "ownerId" = get_auth_uid()
);

-- INSERT: Allow owners to create their own properties
CREATE POLICY "property_owner_insert"
ON property
FOR INSERT
TO authenticated
WITH CHECK (
  "ownerId" = get_auth_uid()
);

-- UPDATE: Allow owners to update their own properties
CREATE POLICY "property_owner_update"
ON property
FOR UPDATE
TO authenticated
USING (
  "ownerId" = get_auth_uid()
)
WITH CHECK (
  "ownerId" = get_auth_uid()
);

-- DELETE: Allow owners to delete their own properties
CREATE POLICY "property_owner_delete"
ON property
FOR DELETE
TO authenticated
USING (
  "ownerId" = get_auth_uid()
);

-- ============================================================================
-- 8. Add missing RLS policies for notifications table (CRITICAL SECURITY FIX)
-- ============================================================================
-- Security Advisory: notifications table has RLS enabled but NO policies exist
-- This is a critical security vulnerability - anyone can access all notifications!

-- SELECT: Allow users to view their own notifications
CREATE POLICY "notifications_user_select"
ON notifications
FOR SELECT
TO authenticated
USING (
  "userId" = get_auth_uid()
);

-- INSERT: System can create notifications for users
CREATE POLICY "notifications_system_insert"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  true
);

-- UPDATE: Allow users to update their own notifications (e.g., mark as read)
CREATE POLICY "notifications_user_update"
ON notifications
FOR UPDATE
TO authenticated
USING (
  "userId" = get_auth_uid()
)
WITH CHECK (
  "userId" = get_auth_uid()
);

-- DELETE: Allow users to delete their own notifications
CREATE POLICY "notifications_user_delete"
ON notifications
FOR DELETE
TO authenticated
USING (
  "userId" = get_auth_uid()
);

-- ============================================================================
-- Verification
-- ============================================================================

COMMENT ON POLICY "unit_owner_or_tenant_select" ON unit IS 'Allow property owners or active tenants to view units - uses security definer functions to prevent infinite recursion';
COMMENT ON POLICY "lease_owner_or_tenant_select" ON lease IS 'Allow property owners or tenants to view leases - uses security definer functions to prevent infinite recursion';
COMMENT ON POLICY "property_owner_select" ON property IS 'SECURITY FIX: Allow property owners to view their own properties';
COMMENT ON POLICY "notifications_user_select" ON notifications IS 'SECURITY FIX: Allow users to view their own notifications';
