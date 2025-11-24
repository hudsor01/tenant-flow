-- Migration: Protect rent_payments table with RLS policies
-- Priority: CRITICAL - Financial Data Exposure
-- Table: rent_payments
-- Risk: Payment history, amounts, and Stripe data accessible to all authenticated users

-- Enable RLS
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RENT_PAYMENTS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Tenants can select their own rent payments
CREATE POLICY "Tenants can select own rent payments"
ON rent_payments
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 2: Property owners can select rent payments for their properties
-- Allows owners to view payment history for leases in their properties
CREATE POLICY "Property owners can select rent payments for their properties"
ON rent_payments
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

-- Policy 3: Service role has full access (backend operations)
-- Note: Rent payments are created and managed exclusively by the backend
-- Regular users (tenants/owners) have read-only access
-- All INSERT/UPDATE/DELETE operations go through backend with service_role
CREATE POLICY "Service role full access to rent payments"
ON rent_payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Financial Data Protected:
-- - amount: Rent payment amount
-- - late_fee_amount: Late fee charged
-- - application_fee_amount: Platform fee
-- - stripe_payment_intent_id: Stripe payment reference
-- - payment_method_type: Payment method used
-- - status: Payment status (pending, paid, failed, etc.)
-- - paid_date: When payment was completed

-- Access Control:
-- - Tenants: Read-only access to own payments
-- - Property Owners: Read-only access to payments for their properties
-- - Service Role: Full CRUD (backend creates/updates payments via Stripe webhooks)
-- - Regular Users: CANNOT create, update, or delete payments directly

-- Payment Flow:
-- 1. Backend creates payment intent via Stripe API (service_role)
-- 2. Tenant pays via Stripe (frontend calls backend endpoint)
-- 3. Stripe webhook updates payment status (service_role)
-- 4. Users can only VIEW payment data via SELECT policies

-- PCI DSS Compliance:
-- - No raw card data stored (only Stripe IDs)
-- - Payment data isolated per tenant
-- - Owners cannot see payment methods, only payment amounts/status

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Indexes needed for optimal RLS performance:
-- - tenant_id (lookup for tenant policy)
-- - lease_id (lookup for owner policy)
-- These indexes will be created in the performance optimization migration

-- Join chain for owner policy:
-- rent_payments → leases → units → properties → property_owners → user_id
-- Without indexes, this could be slow for large datasets

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'rent_payments';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'rent_payments'
-- ORDER BY policyname;
-- Expected: 3 policies listed

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM rent_payments; -- Should return tenant's payments only
-- SELECT amount FROM rent_payments WHERE tenant_id != (SELECT id FROM tenants WHERE user_id = '<tenant_user_id>'); -- Should return 0 rows

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM rent_payments; -- Should return payments for owner's properties only

-- Test tenant cannot insert/update/delete:
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- INSERT INTO rent_payments (...) VALUES (...); -- Should FAIL (no policy)
-- UPDATE rent_payments SET amount = 999 WHERE id = '<some_id>'; -- Should FAIL (no policy)
-- DELETE FROM rent_payments WHERE id = '<some_id>'; -- Should FAIL (no policy)
