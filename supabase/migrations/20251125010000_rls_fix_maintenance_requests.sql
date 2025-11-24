-- Migration: Fix RLS policies for maintenance_requests table
-- Priority: CRITICAL - Application breaking (RLS enabled but no policies)
-- Table: maintenance_requests
-- Issue: RLS was enabled but no policies were created, blocking all access

-- Note: RLS is already enabled on this table from a previous migration
-- We only need to create the policies

-- ============================================================================
-- MAINTENANCE_REQUESTS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can perform all operations on maintenance requests for their properties
CREATE POLICY "Property owners full access to property maintenance requests"
ON maintenance_requests
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id
    FROM property_owners
    WHERE id = property_owner_id
  )
)
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT user_id
    FROM property_owners
    WHERE id = property_owner_id
  )
);

-- Policy 2: Tenants can view their own maintenance requests
CREATE POLICY "Tenants can select own maintenance requests"
ON maintenance_requests
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 3: Tenants can create maintenance requests for themselves
CREATE POLICY "Tenants can insert own maintenance requests"
ON maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 4: Tenants can update their own maintenance requests
-- (Allows tenants to add notes, update description, or cancel requests)
CREATE POLICY "Tenants can update own maintenance requests"
ON maintenance_requests
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 5: Service role has full access (backend operations)
CREATE POLICY "Service role full access to maintenance requests"
ON maintenance_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'maintenance_requests';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'maintenance_requests';
-- Expected: 5 policies listed

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM maintenance_requests; -- Should return owner's requests only

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM maintenance_requests; -- Should return tenant's requests only
