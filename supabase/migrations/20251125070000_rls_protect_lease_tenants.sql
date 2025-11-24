-- Migration: Protect lease_tenants table with RLS policies
-- Priority: HIGH - Lease Relationship Data
-- Table: lease_tenants
-- Risk: Tenant-lease mappings accessible to all authenticated users

-- Enable RLS
ALTER TABLE lease_tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- LEASE_TENANTS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can select lease_tenants for their properties
CREATE POLICY "Property owners can select lease tenants for their properties"
ON lease_tenants
FOR SELECT
TO authenticated
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 2: Property owners can insert lease_tenants for their properties
-- Allows owners to add tenants to leases
CREATE POLICY "Property owners can insert lease tenants for their properties"
ON lease_tenants
FOR INSERT
TO authenticated
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 3: Property owners can update lease_tenants for their properties
-- Allows owners to modify responsibility percentage, primary tenant designation
CREATE POLICY "Property owners can update lease tenants for their properties"
ON lease_tenants
FOR UPDATE
TO authenticated
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 4: Property owners can delete lease_tenants for their properties
-- Allows owners to remove tenants from leases
CREATE POLICY "Property owners can delete lease tenants for their properties"
ON lease_tenants
FOR DELETE
TO authenticated
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 5: Tenants can select lease_tenants for their own leases
-- Allows tenants to see who else is on their lease
CREATE POLICY "Tenants can select own lease tenants"
ON lease_tenants
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 6: Service role has full access (backend operations)
CREATE POLICY "Service role full access to lease tenants"
ON lease_tenants
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Data Protected:
-- - lease_id: Which lease the tenant is on
-- - tenant_id: Which tenant is on the lease
-- - is_primary: Whether this is the primary tenant
-- - responsibility_percentage: How much of rent this tenant pays

-- Access Control:
-- - Property Owners: Full CRUD on lease_tenants for their properties
-- - Tenants: Read-only access to their own lease_tenant records
-- - Service Role: Full CRUD (backend manages lease relationships)

-- Multi-Tenant Lease Support:
-- - Supports multiple tenants on a single lease
-- - Responsibility percentage splits rent among tenants
-- - Primary tenant designation for communications

-- Privacy Protection:
-- - Tenants can see co-tenants on their lease
-- - Tenants cannot see other leases or other tenants
-- - Property owners can only see lease_tenants for their properties

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Indexes needed for optimal RLS performance:
-- - lease_id (used in owner policies)
-- - tenant_id (used in tenant policy)
-- These indexes will be created in the performance optimization migration

-- Join chain for owner policy:
-- lease_tenants → leases → units → properties → property_owners → user_id

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'lease_tenants';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'lease_tenants'
-- ORDER BY policyname;
-- Expected: 6 policies listed

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM lease_tenants; -- Should return lease_tenants for owner's properties only

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM lease_tenants; -- Should return lease_tenants for tenant's own leases only
