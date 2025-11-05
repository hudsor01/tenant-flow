-- Migration: Add RLS Policies for tenant_payment_method Table
-- Date: 2025-02-15
-- Priority: P0 - SECURITY CRITICAL
--
-- ISSUE: tenant_payment_method table has NO RLS policies
-- IMPACT: All saved payment methods exposed (PCI compliance violation)
-- SEVERITY: CRITICAL (PCI DSS scope, Stripe payment method IDs)
--
-- SECURITY MODEL:
--   - Tenants: Can manage (CRUD) ONLY their own payment methods
--   - Landlords: CANNOT view tenant payment methods (PCI restriction)
--   - System: Read-only access via service role for Stripe operations
--   - Storage: Only Stripe PM IDs stored (pm_xxx), never full card numbers
--
-- PCI DSS COMPLIANCE:
--   - Payment methods contain: last4, brand, Stripe PM ID
--   - Full card data NEVER stored (Stripe handles)
--   - Tenant-scoped access only (principle of least privilege)

-- ============================================================================
-- 1. Enable RLS on tenant_payment_method table
-- ============================================================================

ALTER TABLE tenant_payment_method ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. SELECT Policy: Tenants see ONLY their own payment methods
-- ============================================================================

CREATE POLICY "tenant_payment_method_owner_select"
ON tenant_payment_method
FOR SELECT
TO authenticated
USING (
  tenantId IN (
    SELECT id FROM users WHERE "supabaseId" = (SELECT auth.uid()::text)
  )
);

COMMENT ON POLICY "tenant_payment_method_owner_select" ON tenant_payment_method IS
  'PCI SECURITY: Tenants view ONLY their own payment methods. Landlords CANNOT view tenant payment data.';

-- ============================================================================
-- 3. INSERT Policy: Tenants can add their own payment methods
-- ============================================================================

CREATE POLICY "tenant_payment_method_owner_insert"
ON tenant_payment_method
FOR INSERT
TO authenticated
WITH CHECK (
  tenantId IN (
    SELECT id FROM users WHERE "supabaseId" = (SELECT auth.uid()::text)
  )
);

COMMENT ON POLICY "tenant_payment_method_owner_insert" ON tenant_payment_method IS
  'SECURITY: Tenants can add payment methods ONLY for themselves. Backend validates Stripe PM ownership.';

-- ============================================================================
-- 4. UPDATE Policy: Tenants can update their own payment methods
-- ============================================================================
-- Typical updates: setting default payment method, updating verification status

CREATE POLICY "tenant_payment_method_owner_update"
ON tenant_payment_method
FOR UPDATE
TO authenticated
USING (
  tenantId IN (
    SELECT id FROM users WHERE "supabaseId" = (SELECT auth.uid()::text)
  )
)
WITH CHECK (
  tenantId IN (
    SELECT id FROM users WHERE "supabaseId" = (SELECT auth.uid()::text)
  )
);

COMMENT ON POLICY "tenant_payment_method_owner_update" ON tenant_payment_method IS
  'SECURITY: Tenants can update ONLY their own payment methods (e.g., set default, update status).';

-- ============================================================================
-- 5. DELETE Policy: Tenants can delete their own payment methods
-- ============================================================================
-- When tenant removes a payment method, it must be detached from Stripe first
-- Backend handles Stripe detachment before allowing database deletion

CREATE POLICY "tenant_payment_method_owner_delete"
ON tenant_payment_method
FOR DELETE
TO authenticated
USING (
  tenantId IN (
    SELECT id FROM users WHERE "supabaseId" = (SELECT auth.uid()::text)
  )
);

COMMENT ON POLICY "tenant_payment_method_owner_delete" ON tenant_payment_method IS
  'SECURITY: Tenants can delete ONLY their own payment methods. Backend detaches from Stripe first.';

-- ============================================================================
-- 6. PCI Compliance Verification
-- ============================================================================

COMMENT ON TABLE tenant_payment_method IS
  'PCI DSS: Stores ONLY Stripe payment method IDs (pm_xxx), last4, and brand. Full card data NEVER stored.';

-- ============================================================================
-- 7. Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'tenant_payment_method'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on tenant_payment_method table';
  END IF;

  -- Verify SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tenant_payment_method'
    AND policyname = 'tenant_payment_method_owner_select'
  ) THEN
    RAISE EXCEPTION 'SELECT policy not created for tenant_payment_method';
  END IF;

  -- Verify INSERT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tenant_payment_method'
    AND policyname = 'tenant_payment_method_owner_insert'
  ) THEN
    RAISE EXCEPTION 'INSERT policy not created for tenant_payment_method';
  END IF;

  -- Verify UPDATE policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tenant_payment_method'
    AND policyname = 'tenant_payment_method_owner_update'
  ) THEN
    RAISE EXCEPTION 'UPDATE policy not created for tenant_payment_method';
  END IF;

  -- Verify DELETE policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tenant_payment_method'
    AND policyname = 'tenant_payment_method_owner_delete'
  ) THEN
    RAISE EXCEPTION 'DELETE policy not created for tenant_payment_method';
  END IF;

  RAISE NOTICE 'tenant_payment_method RLS policies successfully created and verified';
END $$;
