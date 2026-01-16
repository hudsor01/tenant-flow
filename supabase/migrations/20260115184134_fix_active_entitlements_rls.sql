-- Migration: Fix critical RLS vulnerability in stripe.active_entitlements
-- Issue: USING (true) allowed all authenticated users to see all entitlements
-- Fix: Scope access to users via customer email or metadata linkage
--
-- Background:
-- The original policy in 20251220060000_secure_stripe_schema_rls.sql used USING (true)
-- which granted ALL authenticated users access to ALL entitlements. This is a major
-- security vulnerability that allows users to see each other's subscription entitlements.
--
-- Solution:
-- Link entitlements to users via the stripe.customers table. Users can only see
-- entitlements for customers that match their auth email or have their user_id in metadata.

DO $$
BEGIN
  -- Check if active_entitlements table exists in stripe schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stripe' AND table_name = 'active_entitlements'
  ) THEN
    RAISE NOTICE 'stripe.active_entitlements not found; skipping';
    RETURN;
  END IF;

  -- Drop the vulnerable policy
  DROP POLICY IF EXISTS "active_entitlements_select_own" ON stripe.active_entitlements;

  -- Create secure policy that links entitlements to users via customer
  -- Users can only see entitlements for customers they own (matched by email or metadata)
  CREATE POLICY "active_entitlements_select_own" ON stripe.active_entitlements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stripe.customers c
      WHERE c.id = active_entitlements.customer
      AND (
        c.email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        OR (c.metadata->>'user_id')::uuid = (SELECT auth.uid())
      )
    )
  );

  COMMENT ON POLICY "active_entitlements_select_own" ON stripe.active_entitlements IS
    'Users can only view entitlements for customers linked to their account via email or user_id metadata';
END $$;
