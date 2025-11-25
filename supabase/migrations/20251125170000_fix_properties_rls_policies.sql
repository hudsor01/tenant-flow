-- Migration: Fix properties RLS policies
-- Priority: CRITICAL - Fixes infinite recursion error in bulk import
-- Table: properties
-- Issues Fixed:
--   1. Missing WITH CHECK clause in UPDATE policy (causes infinite recursion)
--   2. Missing service_role policy for backend operations
--
-- Changes:
--   - Drop and recreate UPDATE policy with proper WITH CHECK clause
--   - Add service_role policy for full backend access
--   - Follow standard RLS patterns from property_owners and property_images tables

-- ============================================================================
-- DROP EXISTING UPDATE POLICY (to recreate with WITH CHECK clause)
-- ============================================================================
DROP POLICY IF EXISTS "property_owners_update_own_properties" ON public.properties;

-- ============================================================================
-- RECREATE UPDATE POLICY with proper USING + WITH CHECK
-- ============================================================================
-- The UPDATE policy requires BOTH clauses:
--   - USING: Checks if user can see/select the existing row
--   - WITH CHECK: Validates the modified row meets policy requirements
--
-- Without WITH CHECK, PostgreSQL can encounter infinite recursion when
-- evaluating policy conditions during UPDATE operations.
CREATE POLICY "property_owners_update_own_properties" ON public.properties
  FOR UPDATE
  TO authenticated
  USING (
    property_owner_id IN (
      SELECT id FROM public.property_owners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    property_owner_id IN (
      SELECT id FROM public.property_owners WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- ADD SERVICE ROLE POLICY (for backend operations)
-- ============================================================================
-- Standard practice: Backend using service_role should have full access
-- This allows backend to bypass RLS when using service role credentials
-- Follows same pattern as property_owners, property_images, and other tables
CREATE POLICY "properties_service_role_access" ON public.properties
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work correctly)
-- ============================================================================

-- Verify all policies exist for properties table:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'properties'
-- ORDER BY policyname;
-- 
-- Expected: 5 policies total
--   1. property_owners_select_own_properties (SELECT, authenticated)
--   2. property_owners_insert_own_properties (INSERT, authenticated)
--   3. property_owners_update_own_properties (UPDATE, authenticated) -- NOW WITH both USING and WITH CHECK
--   4. property_owners_delete_own_properties (DELETE, authenticated)
--   5. properties_service_role_access (ALL, service_role) -- NEW

-- Verify UPDATE policy has both USING and WITH CHECK:
-- SELECT 
--   policyname, 
--   qual IS NOT NULL as has_using, 
--   with_check IS NOT NULL as has_with_check
-- FROM pg_policies 
-- WHERE tablename = 'properties' 
--   AND policyname = 'property_owners_update_own_properties';
-- 
-- Expected: has_using = true, has_with_check = true

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================
-- To rollback this migration:
-- 1. DROP POLICY "properties_service_role_access" ON public.properties;
-- 2. DROP POLICY "property_owners_update_own_properties" ON public.properties;
-- 3. CREATE POLICY "property_owners_update_own_properties" ON public.properties
--      FOR UPDATE USING (
--        property_owner_id IN (
--          SELECT id FROM public.property_owners WHERE user_id = auth.uid()
--        )
--      );
-- (Recreates the broken policy without WITH CHECK for exact rollback)
