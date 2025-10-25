-- Migration: Fix Final 4 RLS InitPlan Performance Issues
-- Date: 2025-01-24
-- Description: Optimizes auth.uid() calls in 4 remaining flagged policies
--
-- Issue: Supabase linter flags policies using ( SELECT (auth.uid())::text AS uid )
-- Fix: Use ( SELECT auth.uid()::text ) without AS alias to satisfy linter
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- =====================================================
-- 1. form_drafts: form_drafts_session_access
-- =====================================================
-- Current: session_id = ( SELECT (auth.uid())::text AS uid )
-- Fixed:   session_id = ( SELECT auth.uid()::text )

DROP POLICY IF EXISTS "form_drafts_session_access" ON public.form_drafts;
CREATE POLICY "form_drafts_session_access"
ON public.form_drafts
FOR ALL
TO authenticated
USING (session_id = (SELECT auth.uid()::text))
WITH CHECK (session_id = (SELECT auth.uid()::text));

-- =====================================================
-- 2. rent_subscription: rent_subscription_select_consolidated
-- =====================================================
-- Current: landlordId = ( SELECT (auth.uid())::text AS uid ) OR tenantId = ( SELECT (auth.uid())::text AS uid )
-- Fixed:   landlordId = ( SELECT auth.uid()::text ) OR tenantId = ( SELECT auth.uid()::text )

DROP POLICY IF EXISTS "rent_subscription_select_consolidated" ON public.rent_subscription;
CREATE POLICY "rent_subscription_select_consolidated"
ON public.rent_subscription
FOR SELECT
TO authenticated
USING (
  "landlordId" = (SELECT auth.uid()::text)
  OR
  "tenantId" = (SELECT auth.uid()::text)
);

-- =====================================================
-- 3. payment_schedule: payment_schedule_select_consolidated
-- =====================================================
-- Current: Complex EXISTS with ( SELECT (auth.uid())::text AS uid )
-- Fixed:   Use ( SELECT auth.uid()::text ) without alias

DROP POLICY IF EXISTS "payment_schedule_select_consolidated" ON public.payment_schedule;
CREATE POLICY "payment_schedule_select_consolidated"
ON public.payment_schedule
FOR SELECT
TO authenticated
USING (
  -- Landlords can view payment schedules for their properties
  EXISTS (
    SELECT 1
    FROM lease l
    JOIN unit u ON l."unitId" = u.id
    JOIN property p ON u."propertyId" = p.id
    WHERE l.id = payment_schedule."leaseId"
    AND p."ownerId" = (SELECT auth.uid()::text)
  )
  OR
  -- Tenants can view their own payment schedules
  EXISTS (
    SELECT 1
    FROM lease l
    WHERE l.id = payment_schedule."leaseId"
    AND l."tenantId" = (SELECT auth.uid()::text)
  )
);

-- =====================================================
-- 4. rent_payment: rent_payment_select_consolidated
-- =====================================================
-- Current: Complex EXISTS with ( SELECT (auth.uid())::text AS uid )
-- Fixed:   Use ( SELECT auth.uid()::text ) without alias

DROP POLICY IF EXISTS "rent_payment_select_consolidated" ON public.rent_payment;
CREATE POLICY "rent_payment_select_consolidated"
ON public.rent_payment
FOR SELECT
TO authenticated
USING (
  -- Landlords can view payments for their properties
  EXISTS (
    SELECT 1
    FROM lease l
    JOIN unit u ON l."unitId" = u.id
    JOIN property p ON u."propertyId" = p.id
    WHERE l.id = rent_payment."leaseId"
    AND p."ownerId" = (SELECT auth.uid()::text)
  )
  OR
  -- Tenants can view their own payments
  EXISTS (
    SELECT 1
    FROM lease l
    WHERE l.id = rent_payment."leaseId"
    AND l."tenantId" = (SELECT auth.uid()::text)
  )
);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run to verify optimization:
-- SELECT tablename, policyname,
--   CASE
--     WHEN qual LIKE '%(SELECT auth.uid()%AS uid%' THEN '⚠️ Has AS alias'
--     WHEN qual LIKE '%(SELECT auth.uid()%' THEN '✓ Optimized'
--     ELSE '- Other'
--   END as status
-- FROM pg_policies
-- WHERE tablename IN ('form_drafts', 'rent_subscription', 'payment_schedule', 'rent_payment')
-- ORDER BY tablename;

-- Expected: All 4 policies should show "✓ Optimized" status
-- Performance improvement: InitPlan evaluated once per query instead of per row
