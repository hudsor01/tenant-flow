-- Migration: Add User Access to Payment Methods
-- Created: 2025-12-20 06:10:00 UTC
-- Purpose: Allow users to view their own payment methods
-- Related: Stripe schema RLS security fix

-- ============================================================================
-- BACKGROUND
-- ============================================================================
-- Users need to view their own payment methods for:
-- 1. Seeing which cards/payment methods are on file
-- 2. Updating payment methods (future feature)
-- 3. Managing billing in the app
--
-- Payment methods are linked to customers via the 'customer' column
-- Users are matched to customers by email or metadata.user_id
-- ============================================================================

-- ============================================================================
-- USER SELECT POLICY - View Own Payment Methods
-- ============================================================================

CREATE POLICY "payment_methods_select_own" ON stripe.payment_methods
FOR SELECT TO authenticated
USING (
  customer IN (
    SELECT id FROM stripe.customers
    WHERE email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    OR (metadata->>'user_id')::uuid = auth.uid()
  )
);

COMMENT ON POLICY "payment_methods_select_own" ON stripe.payment_methods IS
'Users can view payment methods for their own Stripe customer record';

-- ============================================================================
-- FUTURE: USER UPDATE/DELETE POLICIES (Commented Out)
-- ============================================================================

-- Option 1: Allow users to delete their own payment methods
-- (Uncomment when ready to enable in-app payment method deletion)
--
-- CREATE POLICY "payment_methods_delete_own" ON stripe.payment_methods
-- FOR DELETE TO authenticated
-- USING (
--   customer IN (
--     SELECT id FROM stripe.customers
--     WHERE email IN (
--       SELECT email FROM auth.users WHERE id = auth.uid()
--     )
--     OR (metadata->>'user_id')::uuid = auth.uid()
--   )
-- );
--
-- COMMENT ON POLICY "payment_methods_delete_own" ON stripe.payment_methods IS
-- 'Users can delete their own payment methods';

-- Note: UPDATE is NOT recommended for payment_methods
-- Stripe payment methods should be replaced (detach old, attach new)
-- rather than updated in place.

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'stripe'
    AND tablename = 'payment_methods';

  RAISE NOTICE '✅ payment_methods now has % policies', policy_count;
  RAISE NOTICE '  - service_role (full access)';
  RAISE NOTICE '  - users can SELECT own payment methods';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Payment Method Management Options:';
  RAISE NOTICE '';
  RAISE NOTICE 'Option 1: Stripe Customer Portal (Recommended)';
  RAISE NOTICE '  - Users click link → Stripe-hosted page';
  RAISE NOTICE '  - Stripe handles all payment method updates';
  RAISE NOTICE '  - No PCI compliance needed on your end';
  RAISE NOTICE '  - Code: const session = await stripe.billingPortal.sessions.create()';
  RAISE NOTICE '';
  RAISE NOTICE 'Option 2: In-App with Stripe Elements';
  RAISE NOTICE '  - Embed Stripe payment form in your app';
  RAISE NOTICE '  - More control over UX';
  RAISE NOTICE '  - Requires Stripe Elements integration';
  RAISE NOTICE '  - Still PCI compliant (Stripe handles card data)';
END $$;
