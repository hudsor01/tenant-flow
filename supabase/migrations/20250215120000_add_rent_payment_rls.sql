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
-- 2. SELECT Policy: Landlords and Tenants see their own payments
-- ============================================================================

CREATE POLICY "rent_payment_owner_or_tenant_select"
ON rent_payment
FOR SELECT
TO authenticated
USING (
  -- Landlords can see payments where they are the landlord
  landlordId IN (
    SELECT id FROM users WHERE "supabaseId" = (SELECT auth.uid()::text)
  )
  OR
  -- Tenants can see payments where they are the tenant
  tenantId IN (
    SELECT id FROM users WHERE "supabaseId" = (SELECT auth.uid()::text)
  )
);

COMMENT ON POLICY "rent_payment_owner_or_tenant_select" ON rent_payment IS
  'SECURITY: Landlords view payments for their properties, tenants view ONLY their own payments';

-- ============================================================================
-- 3. INSERT Policy: System-only via service role (Stripe webhooks)
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
-- 4. UPDATE Policy: System-only for status changes (Stripe webhooks)
-- ============================================================================
-- Payments are generally immutable after creation (accounting best practice)
-- Only system can update payment status via Stripe webhook events

CREATE POLICY "rent_payment_system_update"
ON rent_payment
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "rent_payment_system_update" ON rent_payment IS
  'SYSTEM: Allows backend to update payment status via Stripe webhooks. Payments are otherwise immutable.';

-- ============================================================================
-- 5. DELETE Policy: NONE (no deletes allowed)
-- ============================================================================
-- No DELETE policy = no user can delete payments
-- 7-year retention requirement for financial/legal compliance
-- Only database administrators can delete via direct database access

COMMENT ON TABLE rent_payment IS
  'COMPLIANCE: 7-year retention required. No DELETE policy = no application-level deletes allowed.';

-- ============================================================================
-- 6. Verification
-- ============================================================================

DO $$
BEGIN
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

  RAISE NOTICE 'rent_payment RLS policies successfully created and verified';
END $$;
