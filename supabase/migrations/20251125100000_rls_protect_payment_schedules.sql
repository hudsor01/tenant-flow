-- Migration: Protect payment_schedules table with RLS policies
-- Priority: HIGH - Payment Schedule Data
-- Table: payment_schedules
-- Risk: Payment schedules accessible to all authenticated users

-- Enable RLS
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PAYMENT_SCHEDULES TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can select payment schedules for their properties
CREATE POLICY "Property owners can select payment schedules for their properties"
ON payment_schedules
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

-- Policy 2: Tenants can select payment schedules for their own leases
CREATE POLICY "Tenants can select own payment schedules"
ON payment_schedules
FOR SELECT
TO authenticated
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN lease_tenants lt ON l.id = lt.lease_id
    JOIN tenants t ON lt.tenant_id = t.id
    WHERE t.user_id = (SELECT auth.uid())
  )
);

-- Policy 3: Service role has full access (backend operations)
-- Note: Payment schedules are created and managed by backend only
-- Regular users have read-only access to view when payments are due
CREATE POLICY "Service role full access to payment schedules"
ON payment_schedules
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Schedule Data Protected:
-- - lease_id: Which lease the schedule applies to
-- - frequency: Payment frequency (monthly, weekly, etc.)
-- - next_payment_date: When next payment is due
-- - is_active: Whether schedule is currently active

-- Access Control:
-- - Property Owners: Read-only access to schedules for their properties
-- - Tenants: Read-only access to their own payment schedules
-- - Service Role: Full CRUD (backend manages schedule lifecycle)
-- - Regular Users: CANNOT create, update, or delete schedules

-- Payment Schedule Lifecycle:
-- 1. Backend creates schedule when lease is created (service_role)
-- 2. Schedule determines when rent payments are due
-- 3. Backend generates rent_payment records based on schedule
-- 4. Users can view schedule to know payment dates
-- 5. Backend updates next_payment_date after each payment cycle

-- Privacy:
-- - Tenants see only their own payment schedules
-- - Property owners see schedules for their properties
-- - Prevents schedule information leakage across tenants

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Index needed for optimal RLS performance:
-- - lease_id (used in both owner and tenant policies)
-- This index will be created in the performance optimization migration

-- Join chain for owner policy:
-- payment_schedules → leases → units → properties → property_owners → user_id

-- Join chain for tenant policy:
-- payment_schedules → leases → lease_tenants → tenants → user_id

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'payment_schedules';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'payment_schedules'
-- ORDER BY policyname;
-- Expected: 3 policies listed

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM payment_schedules; -- Should return schedules for owner's properties

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM payment_schedules; -- Should return tenant's own schedules

-- Test tenant cannot modify schedule:
-- UPDATE payment_schedules SET next_payment_date = '2025-01-01' WHERE id = '<schedule_id>'; -- Should FAIL (no policy)
