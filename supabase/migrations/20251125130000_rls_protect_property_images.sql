-- Migration: Protect property_images table with RLS policies
-- Priority: MEDIUM - Property Asset Protection
-- Table: property_images
-- Risk: Property images accessible to all authenticated users

-- Enable RLS
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROPERTY_IMAGES TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can select images for their properties
CREATE POLICY "Property owners can select images for their properties"
ON property_images
FOR SELECT
TO authenticated
USING (
  property_id IN (
    SELECT p.id
    FROM properties p
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 2: Property owners can insert images for their properties
CREATE POLICY "Property owners can insert images for their properties"
ON property_images
FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT p.id
    FROM properties p
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 3: Property owners can update images for their properties
CREATE POLICY "Property owners can update images for their properties"
ON property_images
FOR UPDATE
TO authenticated
USING (
  property_id IN (
    SELECT p.id
    FROM properties p
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  property_id IN (
    SELECT p.id
    FROM properties p
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 4: Property owners can delete images for their properties
CREATE POLICY "Property owners can delete images for their properties"
ON property_images
FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT p.id
    FROM properties p
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 5: Service role has full access (backend operations)
CREATE POLICY "Service role full access to property images"
ON property_images
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Data Protected:
-- - property_id: Which property the image belongs to
-- - image_url: URL to property image
-- - display_order: Order for displaying images

-- Access Control:
-- - Property Owners: Full CRUD on images for their properties
-- - Tenants: NO ACCESS (tenants should not see property marketing images)
-- - Service Role: Full CRUD (backend manages image storage)

-- Privacy:
-- - Property images are owner-private assets
-- - Used for property listings, marketing, etc.
-- - Tenants access property info through lease agreements

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Index needed for optimal RLS performance:
-- - property_id (used in all owner policies)
-- This index will be created in the performance optimization migration

-- Join chain:
-- property_images → properties → property_owners → user_id

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'property_images';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'property_images'
-- ORDER BY policyname;
-- Expected: 5 policies listed
