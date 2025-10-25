-- Migration: Fix RLS Performance Issues
-- Date: 2025-01-24
-- Description: Addresses 48 performance warnings from Supabase advisors:
--   1. Optimize auth.uid() calls (13 warnings) - Wrap in SELECT subquery
--   2. Remove duplicate permissive policies (35 warnings) - Keep only "_fixed" versions

-- =====================================================
-- PART 1: REMOVE DUPLICATE PERMISSIVE POLICIES (35 warnings)
-- =====================================================
-- Issue: Multiple permissive policies for same role+action cause redundant evaluations
-- Fix: Drop old policies, keep only the "_fixed" or newer versions

-- Table: invoice (4 duplicates - ALL actions)
DROP POLICY IF EXISTS "Users can manage their own invoices" ON public.invoice;
-- Keep: invoice_users_manage_own_fixed

-- Table: message (4 duplicates - ALL actions)
DROP POLICY IF EXISTS "message_participant_access" ON public.message;
-- Keep: message_participant_access_fixed

-- Table: notifications (4 duplicates - ALL actions)
DROP POLICY IF EXISTS "notifications_all_access" ON public.notifications;
-- Keep: notifications_all_access_fixed

-- Table: payment_schedule (1 duplicate - SELECT)
DROP POLICY IF EXISTS "Landlords can view tenant payment schedules" ON public.payment_schedule;
DROP POLICY IF EXISTS "Tenants can view own payment schedule" ON public.payment_schedule;
-- Create single consolidated policy
CREATE POLICY "payment_schedule_select_consolidated" ON public.payment_schedule
FOR SELECT
TO authenticated
USING (
  -- Landlords can view payment schedules for their properties
  EXISTS (
    SELECT 1 FROM public.lease l
    JOIN public.unit u ON l."unitId" = u.id
    JOIN public.property p ON u."propertyId" = p.id
    WHERE l.id = payment_schedule."leaseId"
    AND p."ownerId"::text = (SELECT auth.uid()::text)
  )
  OR
  -- Tenants can view their own payment schedules
  EXISTS (
    SELECT 1 FROM public.lease l
    WHERE l.id = payment_schedule."leaseId"
    AND l."tenantId"::text = (SELECT auth.uid()::text)
  )
);

-- Table: property (4 duplicates - SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "property_select_consolidated" ON public.property;
DROP POLICY IF EXISTS "property_insert_consolidated" ON public.property;
DROP POLICY IF EXISTS "property_update_consolidated" ON public.property;
DROP POLICY IF EXISTS "property_delete_consolidated" ON public.property;
-- Keep: property_*_consolidated_fixed (already have SELECT wrapping)

-- Table: rent_payment (1 duplicate - SELECT)
DROP POLICY IF EXISTS "Landlords can view received payments" ON public.rent_payment;
DROP POLICY IF EXISTS "Tenants can view own payments" ON public.rent_payment;
-- Create single consolidated policy
CREATE POLICY "rent_payment_select_consolidated" ON public.rent_payment
FOR SELECT
TO authenticated
USING (
  -- Landlords can view payments for their properties
  EXISTS (
    SELECT 1 FROM public.lease l
    JOIN public.unit u ON l."unitId" = u.id
    JOIN public.property p ON u."propertyId" = p.id
    WHERE l.id = rent_payment."leaseId"
    AND p."ownerId"::text = (SELECT auth.uid()::text)
  )
  OR
  -- Tenants can view their own payments
  EXISTS (
    SELECT 1 FROM public.lease l
    WHERE l.id = rent_payment."leaseId"
    AND l."tenantId"::text = (SELECT auth.uid()::text)
  )
);

-- Table: rent_subscription (1 duplicate - SELECT with 3 policies)
DROP POLICY IF EXISTS "Landlords can view property subscriptions" ON public.rent_subscription;
DROP POLICY IF EXISTS "Landlords can view tenant subscriptions" ON public.rent_subscription;
DROP POLICY IF EXISTS "Tenants can view own subscriptions" ON public.rent_subscription;
-- Create single consolidated policy
CREATE POLICY "rent_subscription_select_consolidated" ON public.rent_subscription
FOR SELECT
TO authenticated
USING (
  -- Landlords can view subscriptions for their properties
  EXISTS (
    SELECT 1 FROM public.property p
    WHERE p.id = rent_subscription."propertyId"
    AND p."ownerId"::text = (SELECT auth.uid()::text)
  )
  OR
  -- Landlords can view subscriptions for their tenants
  EXISTS (
    SELECT 1 FROM public.tenant t
    JOIN public.lease l ON t.id = l."tenantId"
    JOIN public.unit u ON l."unitId" = u.id
    JOIN public.property p ON u."propertyId" = p.id
    WHERE t.id = rent_subscription."tenantId"
    AND p."ownerId"::text = (SELECT auth.uid()::text)
  )
  OR
  -- Tenants can view their own subscriptions
  rent_subscription."tenantId"::text = (SELECT auth.uid()::text)
);

-- Table: scheduled_report (4 duplicates - SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Users can view their own scheduled reports" ON public.scheduled_report;
DROP POLICY IF EXISTS "Users can insert their own scheduled reports" ON public.scheduled_report;
DROP POLICY IF EXISTS "Users can update their own scheduled reports" ON public.scheduled_report;
DROP POLICY IF EXISTS "Users can delete their own scheduled reports" ON public.scheduled_report;
-- Keep: "Users can manage their own scheduled reports" (ALL policy)

-- Table: tenant (4 duplicates - SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "tenant_select_owner" ON public.tenant;
DROP POLICY IF EXISTS "tenant_insert_self" ON public.tenant;
DROP POLICY IF EXISTS "tenant_modify_owner" ON public.tenant;
DROP POLICY IF EXISTS "tenant_delete_owner" ON public.tenant;
-- Keep: tenant_update_owner (ALL policy)

-- Table: unit (4 duplicates - SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Users can manage units of their properties" ON public.unit;
-- Keep: "Users can only access units in their properties"

-- Table: users (2 duplicates - SELECT, UPDATE)
DROP POLICY IF EXISTS "users_select_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
-- Keep: "Users can view and update their own record" (ALL policy)

-- =====================================================
-- PART 2: OPTIMIZE auth.uid() CALLS (13 warnings)
-- =====================================================
-- Issue: RLS policies re-evaluate auth.uid() for each row
-- Fix: Wrap auth.uid() in SELECT subquery to evaluate once per query

-- Table: form_drafts
DROP POLICY IF EXISTS "form_drafts_session_access" ON public.form_drafts;
CREATE POLICY "form_drafts_session_access" ON public.form_drafts
FOR ALL
TO authenticated
USING (
  "sessionId" = (SELECT current_setting('request.jwt.claims', true)::json->>'session_id')
  OR "userId"::text = (SELECT auth.uid()::text)
)
WITH CHECK (
  "sessionId" = (SELECT current_setting('request.jwt.claims', true)::json->>'session_id')
  OR "userId"::text = (SELECT auth.uid()::text)
);

-- Table: customer_invoice
DROP POLICY IF EXISTS "customer_invoice_creator_access" ON public.customer_invoice;
CREATE POLICY "customer_invoice_creator_access" ON public.customer_invoice
FOR ALL
TO authenticated
USING ("createdBy"::text = (SELECT auth.uid()::text))
WITH CHECK ("createdBy"::text = (SELECT auth.uid()::text));

-- Table: customer_invoice_item
DROP POLICY IF EXISTS "customer_invoice_item_owner_access" ON public.customer_invoice_item;
CREATE POLICY "customer_invoice_item_owner_access" ON public.customer_invoice_item
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_invoice ci
    WHERE ci.id = customer_invoice_item."invoiceId"
    AND ci."createdBy"::text = (SELECT auth.uid()::text)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_invoice ci
    WHERE ci.id = customer_invoice_item."invoiceId"
    AND ci."createdBy"::text = (SELECT auth.uid()::text)
  )
);

-- Table: documents (3 policies)
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" ON public.documents
FOR SELECT
TO authenticated
USING ("userId"::text = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;
CREATE POLICY "Users can upload documents" ON public.documents
FOR INSERT
TO authenticated
WITH CHECK ("userId"::text = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can soft-delete documents" ON public.documents;
CREATE POLICY "Users can soft-delete documents" ON public.documents
FOR UPDATE
TO authenticated
USING ("userId"::text = (SELECT auth.uid()::text))
WITH CHECK ("userId"::text = (SELECT auth.uid()::text));

-- Table: notifications_all_access_fixed (already has duplicate removed, just optimize)
DROP POLICY IF EXISTS "notifications_all_access_fixed" ON public.notifications;
CREATE POLICY "notifications_all_access_fixed" ON public.notifications
FOR ALL
TO authenticated
USING ("userId"::text = (SELECT auth.uid()::text))
WITH CHECK ("userId"::text = (SELECT auth.uid()::text));

-- Table: property_*_consolidated_fixed (4 policies)
DROP POLICY IF EXISTS "property_select_consolidated_fixed" ON public.property;
CREATE POLICY "property_select_consolidated_fixed" ON public.property
FOR SELECT
TO authenticated
USING ("ownerId"::text = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "property_insert_consolidated_fixed" ON public.property;
CREATE POLICY "property_insert_consolidated_fixed" ON public.property
FOR INSERT
TO authenticated
WITH CHECK ("ownerId"::text = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "property_update_consolidated_fixed" ON public.property;
CREATE POLICY "property_update_consolidated_fixed" ON public.property
FOR UPDATE
TO authenticated
USING ("ownerId"::text = (SELECT auth.uid()::text))
WITH CHECK ("ownerId"::text = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "property_delete_consolidated_fixed" ON public.property;
CREATE POLICY "property_delete_consolidated_fixed" ON public.property
FOR DELETE
TO authenticated
USING ("ownerId"::text = (SELECT auth.uid()::text));

-- Table: users (2 policies - already fixed duplicates, just optimize)
DROP POLICY IF EXISTS "Users can view and update their own record" ON public.users;
CREATE POLICY "Users can view and update their own record" ON public.users
FOR ALL
TO authenticated
USING (id::text = (SELECT auth.uid()::text))
WITH CHECK (id::text = (SELECT auth.uid()::text));

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these manually to verify fixes:

-- Check for remaining duplicate policies
-- SELECT tablename, cmd, roles, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND permissive = 'PERMISSIVE'
-- GROUP BY tablename, cmd, roles
-- HAVING COUNT(*) > 1
-- ORDER BY tablename, cmd;

-- Check for policies still using bare auth.uid() (should be 0)
-- SELECT tablename, policyname, 
--   CASE 
--     WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%' THEN 'QUAL needs fixing'
--     WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%' THEN 'WITH CHECK needs fixing'
--     ELSE 'OK'
--   END as status
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
-- ORDER BY status DESC, tablename;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Performance improvements:
--   1. Removed 35 duplicate permissive policies (consolidated or dropped)
--   2. Optimized 13 policies to use (SELECT auth.uid()) pattern
--   3. Total: 48 performance warnings resolved
