-- Migration: Fix Critical RLS Policy Issues
-- Date: 2025-10-12
-- Issues:
--   1. stripe_webhook_event has broken policy (authenticated role with service_role check)
--   2. Public read access to stripe_prices/products not working
--   3. Missing service_role policy on stripe_webhook_event

-- ============================================
-- FIX 1: stripe_webhook_event - Replace broken policy
-- ============================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Service role full access to webhook events" ON public.stripe_webhook_event;

-- Create correct service_role policy
CREATE POLICY "stripe_webhook_event_service_only"
ON public.stripe_webhook_event
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block regular users from webhook events (sensitive data)
CREATE POLICY "stripe_webhook_event_no_user_access"
ON public.stripe_webhook_event
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- ============================================
-- FIX 2: Verify and fix public read access to pricing
-- ============================================

-- Ensure stripe_prices has correct read-only policy for public access
-- Note: This should already exist, but recreating to ensure it's correct
DROP POLICY IF EXISTS "stripe_prices_read_only" ON public.stripe_prices;
CREATE POLICY "stripe_prices_read_only"
ON public.stripe_prices
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "stripe_products_read_only" ON public.stripe_products;
CREATE POLICY "stripe_products_read_only"
ON public.stripe_products
FOR SELECT
TO authenticated, anon
USING (true);

-- ============================================
-- VERIFICATION: Ensure all policies are correct
-- ============================================

-- Log the fix to security audit
INSERT INTO public.security_audit_log (
  "eventType",
  resource,
  action,
  severity,
  details,
  "userId",
  "ipAddress",
  "userAgent",
  timestamp
) VALUES (
  'SECURITY_CONFIG_UPDATE',
  'stripe_webhook_event',
  'FIXED_BROKEN_RLS_POLICY',
  'CRITICAL',
  jsonb_build_object(
    'issue', 'stripe_webhook_event had broken policy with wrong role assignment',
    'fix', 'Replaced with correct service_role policy and user blocking policy',
    'migration', '20251012_fix_rls_policy_critical_issues',
    'tables_affected', ARRAY['stripe_webhook_event', 'stripe_prices', 'stripe_products']
  ),
  'system',
  '127.0.0.1',
  'PostgreSQL Migration',
  NOW()
);

-- Verification query (output for migration logs)
DO $$
DECLARE
  policy_count INT;
BEGIN
  -- Count policies on stripe_webhook_event (should be 2)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'stripe_webhook_event';

  IF policy_count = 2 THEN
    RAISE NOTICE 'SUCCESS: stripe_webhook_event now has % policies (service_role + user block)', policy_count;
  ELSE
    RAISE WARNING 'ISSUE: stripe_webhook_event has % policies, expected 2', policy_count;
  END IF;
END $$;
