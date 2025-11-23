-- Migration: Add RLS policies for properties table
-- Description: Fixes "infinite recursion detected in policy for relation 'properties'" error
--              by adding proper owner-only access policies for the properties table.
--
-- Access Pattern:
-- - OWNER users can CRUD their own properties (via property_owners.user_id = auth.uid())
-- - T3NANT users have NO direct access to properties (they access through leases/units)

-- ============================================================================
-- SELECT Policy: Property owners can view their properties
-- ============================================================================
CREATE POLICY "property_owners_select_own_properties" ON public.properties
  FOR SELECT
  USING (
    property_owner_id IN (
      SELECT id FROM public.property_owners WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- INSERT Policy: Property owners can create properties
-- ============================================================================
CREATE POLICY "property_owners_insert_own_properties" ON public.properties
  FOR INSERT
  WITH CHECK (
    property_owner_id IN (
      SELECT id FROM public.property_owners WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- UPDATE Policy: Property owners can update their properties
-- ============================================================================
CREATE POLICY "property_owners_update_own_properties" ON public.properties
  FOR UPDATE
  USING (
    property_owner_id IN (
      SELECT id FROM public.property_owners WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- DELETE Policy: Property owners can delete their properties
-- ============================================================================
CREATE POLICY "property_owners_delete_own_properties" ON public.properties
  FOR DELETE
  USING (
    property_owner_id IN (
      SELECT id FROM public.property_owners WHERE user_id = auth.uid()
    )
  );
