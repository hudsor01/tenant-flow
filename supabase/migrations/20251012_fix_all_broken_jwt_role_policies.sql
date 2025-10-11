-- Migration: Fix All Broken JWT Role Policies
-- Date: 2025-10-12
-- Issue: 6 policies across 3 tables have wrong role assignment
--        They check for service_role in JWT but are assigned to authenticated role
--        Result: NOBODY can access these tables!
--
-- Affected Tables:
--   1. payment_schedule (2 broken policies)
--   2. rent_payment (2 broken policies)
--   3. rent_subscription (2 broken policies)

-- ============================================
-- FIX 1: payment_schedule
-- ============================================

-- Drop broken policies
DROP POLICY IF EXISTS "Service role full access to schedules" ON public.payment_schedule;
DROP POLICY IF EXISTS "payment_schedule_service_full_access_fixed" ON public.payment_schedule;

-- Create correct service_role policy
CREATE POLICY "payment_schedule_service_only"
ON public.payment_schedule
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX 2: rent_payment
-- ============================================

-- Drop broken policies
DROP POLICY IF EXISTS "Service role full access to payments" ON public.rent_payment;
DROP POLICY IF EXISTS "rent_payment_service_full_access_fixed" ON public.rent_payment;

-- Create correct service_role policy
CREATE POLICY "rent_payment_service_only"
ON public.rent_payment
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX 3: rent_subscription
-- ============================================

-- Drop broken policies
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.rent_subscription;
DROP POLICY IF EXISTS "rent_subscription_service_full_access_fixed" ON public.rent_subscription;

-- Create correct service_role policy
CREATE POLICY "rent_subscription_service_only"
ON public.rent_subscription
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- AUDIT LOGGING
-- ============================================

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
  'multiple_tables',
  'FIXED_BROKEN_JWT_ROLE_POLICIES',
  'CRITICAL',
  jsonb_build_object(
    'issue', '6 policies had wrong role assignment (authenticated) but checked for service_role in JWT',
    'tables_affected', ARRAY['payment_schedule', 'rent_payment', 'rent_subscription'],
    'policies_dropped', 6,
    'policies_created', 3,
    'fix', 'Replaced broken policies with correct service_role policies',
    'migration', '20251012_fix_all_broken_jwt_role_policies'
  ),
  'system',
  '127.0.0.1',
  'PostgreSQL Migration',
  NOW()
);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  broken_count INT;
  fixed_count INT;
BEGIN
  -- Check for remaining broken policies
  SELECT COUNT(*) INTO broken_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND qual LIKE '%get_jwt_role()%'
    AND NOT ('service_role' = ANY(roles));

  -- Check that new policies exist
  SELECT COUNT(*) INTO fixed_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'payment_schedule_service_only',
      'rent_payment_service_only',
      'rent_subscription_service_only'
    );

  IF broken_count = 0 AND fixed_count = 3 THEN
    RAISE NOTICE 'SUCCESS: All broken JWT role policies fixed. % new service_role policies created.', fixed_count;
  ELSIF broken_count > 0 THEN
    RAISE WARNING 'ISSUE: Still have % broken policies remaining', broken_count;
  ELSE
    RAISE WARNING 'ISSUE: Only % of 3 expected policies were created', fixed_count;
  END IF;
END $$;
