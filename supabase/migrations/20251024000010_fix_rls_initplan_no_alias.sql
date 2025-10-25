-- Migration: Fix final 4 RLS InitPlan issues by avoiding AS alias entirely
-- Date: 2025-10-24
--
-- Issue: Supabase linter detects InitPlan re-evaluation even with (SELECT auth.uid())
-- Root cause: PostgreSQL adds "AS uid" alias internally when storing policy
-- Solution: Use different subquery pattern that avoids implicit aliasing

-- 1. form_drafts: form_drafts_session_access
DROP POLICY IF EXISTS "form_drafts_session_access" ON public.form_drafts;
CREATE POLICY "form_drafts_session_access"
ON public.form_drafts
FOR ALL
TO authenticated
USING (session_id = (SELECT auth.uid())::text)
WITH CHECK (session_id = (SELECT auth.uid())::text);

-- 2. rent_subscription: rent_subscription_select_consolidated
DROP POLICY IF EXISTS "rent_subscription_select_consolidated" ON public.rent_subscription;
CREATE POLICY "rent_subscription_select_consolidated"
ON public.rent_subscription
FOR SELECT
TO authenticated
USING (
  "landlordId" = (SELECT auth.uid())::text
  OR
  "tenantId" = (SELECT auth.uid())::text
);

-- 3. payment_schedule: payment_schedule_select_consolidated
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
    AND p."ownerId" = (SELECT auth.uid())::text
  )
  OR
  -- Tenants can view their own payment schedules
  EXISTS (
    SELECT 1
    FROM lease l
    WHERE l.id = payment_schedule."leaseId"
    AND l."tenantId" = (SELECT auth.uid())::text
  )
);

-- 4. rent_payment: rent_payment_select_consolidated
DROP POLICY IF EXISTS "rent_payment_select_consolidated" ON public.rent_payment;
CREATE POLICY "rent_payment_select_consolidated"
ON public.rent_payment
FOR SELECT
TO authenticated
USING (
  -- Landlords can view rent payments for their properties
  EXISTS (
    SELECT 1
    FROM lease l
    JOIN unit u ON l."unitId" = u.id
    JOIN property p ON u."propertyId" = p.id
    WHERE l.id = rent_payment."leaseId"
    AND p."ownerId" = (SELECT auth.uid())::text
  )
  OR
  -- Tenants can view their own rent payments
  EXISTS (
    SELECT 1
    FROM lease l
    WHERE l.id = rent_payment."leaseId"
    AND l."tenantId" = (SELECT auth.uid())::text
  )
);

-- Verification query
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('form_drafts', 'rent_subscription', 'payment_schedule', 'rent_payment')
-- ORDER BY tablename;
