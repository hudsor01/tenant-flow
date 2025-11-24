-- Migration: Protect payment_transactions table with RLS policies
-- Priority: HIGH - Transaction Log Data
-- Table: payment_transactions
-- Risk: Payment attempt history accessible to all authenticated users

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PAYMENT_TRANSACTIONS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can select payment transactions for their properties
CREATE POLICY "Property owners can select payment transactions for their properties"
ON payment_transactions
FOR SELECT
TO authenticated
USING (
  rent_payment_id IN (
    SELECT rp.id
    FROM rent_payments rp
    JOIN leases l ON rp.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE po.user_id = (SELECT auth.uid())
  )
);

-- Policy 2: Tenants can select their own payment transactions
CREATE POLICY "Tenants can select own payment transactions"
ON payment_transactions
FOR SELECT
TO authenticated
USING (
  rent_payment_id IN (
    SELECT id
    FROM rent_payments
    WHERE tenant_id IN (
      SELECT id
      FROM tenants
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Policy 3: Service role has full access (backend operations)
-- Note: Payment transactions are created and managed by backend only
-- Regular users have read-only access to track payment attempts
CREATE POLICY "Service role full access to payment transactions"
ON payment_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Transaction Data Protected:
-- - stripe_payment_intent_id: Stripe payment intent ID
-- - amount: Transaction amount
-- - status: Transaction status (pending, succeeded, failed)
-- - failure_reason: Why transaction failed (if applicable)
-- - retry_count: Number of retry attempts
-- - attempted_at: When first attempted
-- - last_attempted_at: Most recent attempt
-- - payment_method_id: Which payment method was used

-- Access Control:
-- - Property Owners: Read-only access to transactions for their properties
-- - Tenants: Read-only access to their own payment transactions
-- - Service Role: Full CRUD (backend manages via Stripe webhooks)
-- - Regular Users: CANNOT create, update, or delete transactions

-- Transaction Lifecycle:
-- 1. Backend creates payment intent via Stripe (service_role)
-- 2. Transaction record created (pending status)
-- 3. Stripe processes payment
-- 4. Webhook updates transaction status (succeeded/failed)
-- 5. If failed, backend may retry
-- 6. Users can view transaction history

-- Privacy:
-- - Tenants see only their own transaction attempts
-- - Property owners see transactions for their properties
-- - Failure reasons visible to help troubleshoot issues

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Index needed for optimal RLS performance:
-- - rent_payment_id (used in both owner and tenant policies)
-- This index will be created in the performance optimization migration

-- Join chain for owner policy:
-- payment_transactions → rent_payments → leases → units → properties → property_owners → user_id

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'payment_transactions';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'payment_transactions'
-- ORDER BY policyname;
-- Expected: 3 policies listed

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM payment_transactions; -- Should return transactions for owner's properties

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM payment_transactions; -- Should return tenant's own transactions

-- Test tenant cannot insert:
-- INSERT INTO payment_transactions (...) VALUES (...); -- Should FAIL (no policy)
