-- Migration: Protect payment_methods table with RLS policies
-- Priority: CRITICAL - PCI Compliance (Payment instruments)
-- Table: payment_methods
-- Risk: Payment method tokens and card details accessible to all authenticated users

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PAYMENT_METHODS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Tenants can select their own payment methods
CREATE POLICY "Tenants can select own payment methods"
ON payment_methods
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 2: Tenants can insert their own payment methods
-- Allows tenants to add new cards or bank accounts via Stripe
CREATE POLICY "Tenants can insert own payment methods"
ON payment_methods
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 3: Tenants can update their own payment methods
-- Allows tenants to set default payment method or update metadata
CREATE POLICY "Tenants can update own payment methods"
ON payment_methods
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

-- Policy 4: Tenants can delete their own payment methods
-- Allows tenants to remove payment methods from their account
CREATE POLICY "Tenants can delete own payment methods"
ON payment_methods
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT id
    FROM tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Policy 5: Service role has full access (backend operations)
CREATE POLICY "Service role full access to payment methods"
ON payment_methods
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- PCI DSS Sensitive Data Protected:
-- - stripe_payment_method_id: Stripe payment method token (pm_xxx)
-- - last_four: Last 4 digits of card/account
-- - brand: Card brand (Visa, Mastercard, etc.)
-- - exp_month: Card expiration month
-- - exp_year: Card expiration year
-- - bank_name: Bank name for ACH payments
-- - type: Payment type (card, us_bank_account, etc.)

-- Access Control:
-- - Tenants: Full CRUD on own payment methods
-- - Property Owners: NO ACCESS to payment methods (PCI requirement)
-- - Service Role: Full CRUD (backend syncs with Stripe)

-- PCI DSS Compliance:
-- ✓ Payment method data is isolated per tenant
-- ✓ Property owners CANNOT see tenant payment methods
-- ✓ Only Stripe tokens stored (no raw card data)
-- ✓ Tenants can only access their own payment instruments
-- ✓ Backend manages Stripe sync via service_role

-- Important: Property owners can see:
-- - rent_payments table: Payment amounts and status
-- - They CANNOT see: Payment method details or card numbers

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Index needed for optimal RLS performance:
-- - tenant_id (used in all tenant policies)
-- This index will be created in the performance optimization migration

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'payment_methods';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'payment_methods'
-- ORDER BY policyname;
-- Expected: 5 policies listed

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM payment_methods; -- Should return tenant's payment methods only
-- SELECT stripe_payment_method_id FROM payment_methods WHERE tenant_id != (SELECT id FROM tenants WHERE user_id = '<tenant_user_id>'); -- Should return 0 rows

-- Test as property owner (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- SELECT COUNT(*) FROM payment_methods; -- Should return 0 rows (owners have no access)

-- Test tenant can insert:
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- INSERT INTO payment_methods (tenant_id, stripe_payment_method_id, type, last_four)
-- VALUES ((SELECT id FROM tenants WHERE user_id = '<tenant_user_id>'), 'pm_test123', 'card', '4242'); -- Should SUCCEED

-- Test tenant cannot insert for other tenant:
-- INSERT INTO payment_methods (tenant_id, stripe_payment_method_id, type, last_four)
-- VALUES ('<other_tenant_id>', 'pm_test456', 'card', '1234'); -- Should FAIL (policy violation)
