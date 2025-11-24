-- Migration: Protect property_owners table with RLS policies
-- Priority: HIGH - Business Data & Stripe Account Protection
-- Table: property_owners
-- Risk: Stripe connected account IDs and business data accessible to all authenticated users

-- Enable RLS
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROPERTY_OWNERS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Property owners can select their own record
CREATE POLICY "Property owners can select own record"
ON property_owners
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

-- Policy 2: Property owners can insert their own record
-- Allows property owners to create their profile during onboarding
CREATE POLICY "Property owners can insert own record"
ON property_owners
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- Policy 3: Property owners can update their own record
-- Allows property owners to update business info, onboarding status, etc.
CREATE POLICY "Property owners can update own record"
ON property_owners
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- Policy 4: Property owners can delete their own record
-- Allows property owners to remove their profile (account deletion flow)
CREATE POLICY "Property owners can delete own record"
ON property_owners
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

-- Policy 5: Service role has full access (backend operations)
CREATE POLICY "Service role full access to property owners"
ON property_owners
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- Sensitive Business Data Protected:
-- - stripe_account_id: Stripe Connected Account ID (acct_xxx)
-- - business_name: Legal business name
-- - business_type: Business entity type
-- - tax_id: Employer Identification Number (EIN)
-- - charges_enabled: Whether can accept payments
-- - payouts_enabled: Whether can receive payouts
-- - onboarding_status: Stripe onboarding completion status
-- - requirements_due: Outstanding Stripe verification requirements

-- Access Control:
-- - Property Owners: Full CRUD on own record only
-- - Tenants: NO ACCESS (tenant users should never see owner data)
-- - Service Role: Full CRUD (backend manages Stripe sync)

-- Business Intelligence Protection:
-- - Competitors cannot enumerate Stripe accounts
-- - Business details remain private
-- - Onboarding status not leaked

-- Data Flow:
-- 1. User signs up as property owner
-- 2. Backend creates property_owners record (service_role)
-- 3. User goes through Stripe Connect onboarding
-- 4. Backend updates onboarding status via webhooks (service_role)
-- 5. User can view/update own business details

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Index needed for optimal RLS performance:
-- - user_id (used in all user-scoped policies)
-- This index will be created in the performance optimization migration

-- Simple user_id lookup means this policy is very fast
-- No complex joins required

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify policies work)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'property_owners';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'property_owners'
-- ORDER BY policyname;
-- Expected: 5 policies listed

-- Test as property owner A (replace UUID with actual owner user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_a_user_id>';
-- SELECT COUNT(*) FROM property_owners; -- Should return 1 (own record only)
-- SELECT stripe_account_id FROM property_owners WHERE user_id != '<owner_a_user_id>'; -- Should return 0 rows

-- Test as tenant (replace UUID with actual tenant user_id):
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<tenant_user_id>';
-- SELECT COUNT(*) FROM property_owners; -- Should return 0 (tenants have no access)

-- Test owner can insert own record:
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO '<owner_user_id>';
-- INSERT INTO property_owners (user_id, stripe_account_id, business_type)
-- VALUES ('<owner_user_id>', 'acct_test123', 'individual'); -- Should SUCCEED

-- Test owner cannot insert for another user:
-- INSERT INTO property_owners (user_id, stripe_account_id, business_type)
-- VALUES ('<other_user_id>', 'acct_test456', 'company'); -- Should FAIL (policy violation)
