-- Migration: Protect documents table with RLS policies
-- Priority: MEDIUM - Document Metadata Protection
-- Table: documents
-- Risk: Document metadata accessible to all authenticated users

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DOCUMENTS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can select documents for their properties
CREATE POLICY "Property owners can select documents for their properties"
ON documents
FOR SELECT
TO authenticated
USING (
  (
    -- Documents attached to properties
    entity_type = 'property'
    AND entity_id = ANY(
      SELECT p.id::text
      FROM properties p
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    -- Documents attached to leases
    entity_type = 'lease'
    AND entity_id = ANY(
      SELECT l.id::text
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    -- Documents attached to units
    entity_type = 'unit'
    AND entity_id = ANY(
      SELECT u.id::text
      FROM units u
      JOIN properties p ON u.property_id = p.id
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    -- Documents attached to maintenance requests
    entity_type = 'maintenance_request'
    AND entity_id = ANY(
      SELECT mr.id::text
      FROM maintenance_requests mr
      JOIN property_owners po ON mr.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 2: Property owners can insert documents for their entities
CREATE POLICY "Property owners can insert documents for their entities"
ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  (
    entity_type = 'property'
    AND entity_id = ANY(
      SELECT p.id::text
      FROM properties p
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    entity_type = 'lease'
    AND entity_id = ANY(
      SELECT l.id::text
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    entity_type = 'unit'
    AND entity_id = ANY(
      SELECT u.id::text
      FROM units u
      JOIN properties p ON u.property_id = p.id
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    entity_type = 'maintenance_request'
    AND entity_id = ANY(
      SELECT mr.id::text
      FROM maintenance_requests mr
      JOIN property_owners po ON mr.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 3: Property owners can delete documents for their entities
CREATE POLICY "Property owners can delete documents for their entities"
ON documents
FOR DELETE
TO authenticated
USING (
  (
    entity_type = 'property'
    AND entity_id = ANY(
      SELECT p.id::text
      FROM properties p
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    entity_type = 'lease'
    AND entity_id = ANY(
      SELECT l.id::text
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    entity_type = 'unit'
    AND entity_id = ANY(
      SELECT u.id::text
      FROM units u
      JOIN properties p ON u.property_id = p.id
      JOIN property_owners po ON p.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
  OR
  (
    entity_type = 'maintenance_request'
    AND entity_id = ANY(
      SELECT mr.id::text
      FROM maintenance_requests mr
      JOIN property_owners po ON mr.property_owner_id = po.id
      WHERE po.user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 4: Tenants can select documents for their leases
CREATE POLICY "Tenants can select documents for their leases"
ON documents
FOR SELECT
TO authenticated
USING (
  entity_type = 'lease'
  AND entity_id = ANY(
    SELECT l.id::text
    FROM leases l
    JOIN lease_tenants lt ON l.id = lt.lease_id
    JOIN tenants t ON lt.tenant_id = t.id
    WHERE t.user_id = (SELECT auth.uid())
  )
);

-- Policy 5: Tenants can select documents for maintenance requests they created
CREATE POLICY "Tenants can select documents for their maintenance requests"
ON documents
FOR SELECT
TO authenticated
USING (
  entity_type = 'maintenance_request'
  AND entity_id = ANY(
    SELECT mr.id::text
    FROM maintenance_requests mr
    WHERE mr.tenant_id IN (
      SELECT id
      FROM tenants
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 6: Service role has full access (backend operations)
CREATE POLICY "Service role full access to documents"
ON documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Document Metadata Protected:
-- - entity_type: Type of entity (property, lease, unit, maintenance_request, etc.)
-- - entity_id: ID of the entity the document belongs to
-- - document_type: Type of document (lease_agreement, inspection_report, etc.)
-- - file_path: Path in storage bucket
-- - storage_url: Full URL to access document
-- - file_size: Size of document

-- Access Control:
-- - Property Owners: Full CRUD on documents for their properties/leases/units/maintenance
-- - Tenants: Read-only access to lease documents and their maintenance request documents
-- - Service Role: Full CRUD (backend manages document storage)

-- Entity Types Supported:
-- - property: Property-level documents
-- - lease: Lease agreements and related docs
-- - unit: Unit-specific documents
-- - maintenance_request: Maintenance photos/receipts

-- Note: This table stores metadata only
-- Actual files are in Supabase Storage with their own RLS policies

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Indexes needed for optimal RLS performance:
-- - (entity_type, entity_id) composite index
-- These indexes will be created in the performance optimization migration

-- Complex policies with multiple ORs and joins
-- May benefit from query plan analysis in production

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'documents';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'documents'
-- ORDER BY policyname;
-- Expected: 6 policies listed

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM documents; -- Should return documents for owner's entities

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM documents; -- Should return documents for tenant's leases and maintenance requests
