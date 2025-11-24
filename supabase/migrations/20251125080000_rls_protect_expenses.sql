-- Migration: Protect expenses table with RLS policies
-- Priority: HIGH - Financial Data
-- Table: expenses
-- Risk: Maintenance expense details accessible to all authenticated users

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- EXPENSES TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can select expenses for their properties
CREATE POLICY "Property owners can select expenses for their properties"
ON expenses
FOR SELECT
TO authenticated
USING (
  maintenance_request_id IN (
    SELECT id
    FROM maintenance_requests
    WHERE property_owner_id IN (
      SELECT id
      FROM property_owners
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 2: Property owners can insert expenses for their properties
-- Allows owners to add expense records for maintenance
CREATE POLICY "Property owners can insert expenses for their properties"
ON expenses
FOR INSERT
TO authenticated
WITH CHECK (
  maintenance_request_id IN (
    SELECT id
    FROM maintenance_requests
    WHERE property_owner_id IN (
      SELECT id
      FROM property_owners
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 3: Property owners can update expenses for their properties
CREATE POLICY "Property owners can update expenses for their properties"
ON expenses
FOR UPDATE
TO authenticated
USING (
  maintenance_request_id IN (
    SELECT id
    FROM maintenance_requests
    WHERE property_owner_id IN (
      SELECT id
      FROM property_owners
      WHERE user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  maintenance_request_id IN (
    SELECT id
    FROM maintenance_requests
    WHERE property_owner_id IN (
      SELECT id
      FROM property_owners
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 4: Property owners can delete expenses for their properties
CREATE POLICY "Property owners can delete expenses for their properties"
ON expenses
FOR DELETE
TO authenticated
USING (
  maintenance_request_id IN (
    SELECT id
    FROM maintenance_requests
    WHERE property_owner_id IN (
      SELECT id
      FROM property_owners
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 5: Service role has full access (backend operations)
CREATE POLICY "Service role full access to expenses"
ON expenses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Financial Data Protected:
-- - amount: Expense amount
-- - vendor_name: Vendor/contractor name
-- - expense_date: When expense occurred
-- - maintenance_request_id: Associated maintenance request

-- Access Control:
-- - Property Owners: Full CRUD on expenses for their properties
-- - Tenants: NO ACCESS (tenants should not see detailed expense breakdowns)
-- - Service Role: Full CRUD (backend manages expense tracking)

-- Privacy:
-- - Vendor names and pricing private to property owners
-- - Competitive pricing information protected
-- - Tenants can see maintenance requests but not detailed costs

-- Business Logic:
-- - Expenses linked to maintenance requests
-- - Property owners track repair costs
-- - Used for financial reporting and tax purposes

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Index needed for optimal RLS performance:
-- - maintenance_request_id (used in all policies)
-- This index will be created in the performance optimization migration

-- Join chain:
-- expenses → maintenance_requests → property_owners → user_id

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'expenses';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'expenses'
-- ORDER BY policyname;
-- Expected: 5 policies listed

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM expenses; -- Should return expenses for owner's properties only

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM expenses; -- Should return 0 (tenants have no access)
