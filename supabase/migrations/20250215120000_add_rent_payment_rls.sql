-- Migration: Add RLS Policies for rent_payment Table
-- Date: 2025-02-15
-- Priority: P0 - SECURITY CRITICAL
--
-- ISSUE: rent_payment table has NO RLS policies
-- IMPACT: All tenant payment data exposed if application code has bugs
-- SEVERITY: HIGH (financial data, PCI scope)
--
-- SECURITY MODEL:
--   - Landlords: Can view payments for their properties
--   - Tenants: Can view ONLY their own payments
--   - System: Can create/update via service role (Stripe webhooks)
--   - DELETE: PROHIBITED (7-year legal retention for financial records)

-- ============================================================================
-- 1. Enable RLS on rent_payment table
-- ============================================================================

ALTER TABLE rent_payment ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Helper Function: Get current user ID for RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
$$;

COMMENT ON FUNCTION get_current_user_id() IS
  'OPTIMIZATION: Efficiently resolves current authenticated user to users.id. Used by RLS policies to avoid repeated subqueries.';

-- ============================================================================
-- 3. SELECT Policy: Landlords and Tenants see their own payments
-- ============================================================================

CREATE POLICY "rent_payment_owner_or_tenant_select"
ON rent_payment
FOR SELECT
TO authenticated
USING (
  landlordId = get_current_user_id()
  OR
  tenantId = get_current_user_id()
);

COMMENT ON POLICY "rent_payment_owner_or_tenant_select" ON rent_payment IS
  'SECURITY: Landlords view payments for their properties, tenants view ONLY their own payments';

-- ============================================================================
-- 4. INSERT Policy: System-only via service role (Stripe webhooks)
-- ============================================================================
-- Only the service role can INSERT payments. Authenticated users must request
-- payment creation via the application/backend, which then uses the service
-- role to perform the INSERT during Stripe webhook processing.

CREATE POLICY "rent_payment_system_insert"
ON rent_payment
FOR INSERT
TO service_role
WITH CHECK (true);

COMMENT ON POLICY "rent_payment_system_insert" ON rent_payment IS
  'SYSTEM: Allows backend to create payments via service role. Backend enforces authorization rules.';

-- ============================================================================
-- 5. UPDATE Policy: System-only for status changes (Stripe webhooks)
-- ============================================================================
-- Payments are generally immutable after creation (accounting best practice)
-- Only system can update payment status via Stripe webhook events

CREATE POLICY "rent_payment_system_update"
ON rent_payment
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (
  amount = OLD.amount
  AND landlordId = OLD.landlordId
  AND tenantId = OLD.tenantId
  AND leaseId = OLD.leaseId
  AND dueDate = OLD.dueDate
  AND stripePaymentIntentId = OLD.stripePaymentIntentId
  AND landlordReceives = OLD.landlordReceives
);

COMMENT ON POLICY "rent_payment_system_update" ON rent_payment IS
  'SYSTEM: Allows backend to update ONLY payment status via Stripe webhooks. All other fields are immutable after creation.';

-- ============================================================================
-- 6. DELETE Policy: NONE (no deletes allowed)
-- ============================================================================
-- No DELETE policy = no user can delete payments
-- 7-year retention requirement for financial/legal compliance
-- Only database administrators can delete via direct database access

COMMENT ON TABLE rent_payment IS
  'COMPLIANCE: 7-year retention required. No DELETE policy = no application-level deletes allowed.';

-- ============================================================================
-- 7. Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify helper function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_current_user_id'
    AND pg_get_function_identity_arguments(oid) = ''
  ) THEN
    RAISE EXCEPTION 'get_current_user_id function not created';
  END IF;

  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'rent_payment'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on rent_payment table';
  END IF;

  -- Verify SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'rent_payment'
    AND policyname = 'rent_payment_owner_or_tenant_select'
  ) THEN
    RAISE EXCEPTION 'SELECT policy not created for rent_payment';
  END IF;

  -- Verify INSERT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'rent_payment'
    AND policyname = 'rent_payment_system_insert'
  ) THEN
    RAISE EXCEPTION 'INSERT policy not created for rent_payment';
  END IF;

  -- Verify UPDATE policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'rent_payment'
    AND policyname = 'rent_payment_system_update'
  ) THEN
    RAISE EXCEPTION 'UPDATE policy not created for rent_payment';
  END IF;

  -- Test helper function
  IF get_current_user_id() IS NULL THEN
    RAISE EXCEPTION 'get_current_user_id function returned NULL';
  END IF;

  RAISE NOTICE 'All verifications passed - RLS policies are properly configured';
END $$;
