-- Migration: Optimize RLS Policies for Performance
-- Date: 2025-01-24
-- Description: Fixes 48 performance warnings from Supabase advisors
--   1. Optimize auth.uid() calls (13 warnings) - Wrap in subquery to prevent per-row re-evaluation
--   2. Remove duplicate permissive policies (35 warnings) - Consolidate into single policies

-- =====================================================
-- PART 1: OPTIMIZE auth.uid() CALLS IN RLS POLICIES
-- =====================================================
-- Issue: auth.uid() re-evaluated for each row (InitPlan performance issue)
-- Fix: Replace auth.uid() with (SELECT auth.uid()) to evaluate once per query

-- Table: form_drafts
DROP POLICY IF EXISTS "form_drafts_session_access" ON public.form_drafts;
CREATE POLICY "form_drafts_session_access"
ON public.form_drafts
FOR ALL
TO authenticated
USING (session_id = (SELECT auth.uid()::text))
WITH CHECK (session_id = (SELECT auth.uid()::text));

-- Table: customer_invoice
DROP POLICY IF EXISTS "customer_invoice_creator_access" ON public.customer_invoice;
CREATE POLICY "customer_invoice_creator_access"
ON public.customer_invoice
FOR ALL
TO authenticated
USING (created_by = (SELECT auth.uid()::text))
WITH CHECK (created_by = (SELECT auth.uid()::text));

-- Table: customer_invoice_item
DROP POLICY IF EXISTS "customer_invoice_item_owner_access" ON public.customer_invoice_item;
CREATE POLICY "customer_invoice_item_owner_access"
ON public.customer_invoice_item
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_invoice
    WHERE customer_invoice.id = customer_invoice_item.invoice_id
    AND customer_invoice.created_by = (SELECT auth.uid()::text)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_invoice
    WHERE customer_invoice.id = customer_invoice_item.invoice_id
    AND customer_invoice.created_by = (SELECT auth.uid()::text)
  )
);

-- Table: documents (3 policies)
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents"
ON public.documents
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;
CREATE POLICY "Users can upload documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can soft-delete documents" ON public.documents;
CREATE POLICY "Users can soft-delete documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()::text))
WITH CHECK (user_id = (SELECT auth.uid()::text));

-- Table: notifications_all_access_fixed (optimize the fixed version)
DROP POLICY IF EXISTS "notifications_all_access_fixed" ON public.notifications;
CREATE POLICY "notifications_all_access_fixed"
ON public.notifications
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()::text))
WITH CHECK (user_id = (SELECT auth.uid()::text));

-- Table: property (optimize *_fixed versions)
DROP POLICY IF EXISTS "property_select_consolidated_fixed" ON public.property;
CREATE POLICY "property_select_consolidated_fixed"
ON public.property
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "property_insert_consolidated_fixed" ON public.property;
CREATE POLICY "property_insert_consolidated_fixed"
ON public.property
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "property_update_consolidated_fixed" ON public.property;
CREATE POLICY "property_update_consolidated_fixed"
ON public.property
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()::text))
WITH CHECK (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "property_delete_consolidated_fixed" ON public.property;
CREATE POLICY "property_delete_consolidated_fixed"
ON public.property
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()::text));

-- Table: users (optimize own profile policies)
DROP POLICY IF EXISTS "users_select_own_profile" ON public.users;
CREATE POLICY "users_select_own_profile"
ON public.users
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()::text) OR supabase_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()::text) OR supabase_id = (SELECT auth.uid()::text))
WITH CHECK (id = (SELECT auth.uid()::text) OR supabase_id = (SELECT auth.uid()::text));

-- =====================================================
-- PART 2: REMOVE DUPLICATE PERMISSIVE POLICIES
-- =====================================================
-- Issue: Multiple permissive policies for same role/action cause performance degradation
-- Fix: Drop old policies, keep only the "*_fixed" versions or consolidated versions

-- Table: invoice (drop old - keep "invoice_users_manage_own_fixed")
DROP POLICY IF EXISTS "Users can manage their own invoices" ON public.invoice;

-- Table: message (drop old - keep "message_participant_access_fixed")
DROP POLICY IF EXISTS "message_participant_access" ON public.message;

-- Table: notifications (drop old - keep "notifications_all_access_fixed")
DROP POLICY IF EXISTS "notifications_all_access" ON public.notifications;

-- Table: property (drop old consolidated - keep "*_consolidated_fixed")
DROP POLICY IF EXISTS "property_select_consolidated" ON public.property;
DROP POLICY IF EXISTS "property_insert_consolidated" ON public.property;
DROP POLICY IF EXISTS "property_update_consolidated" ON public.property;
DROP POLICY IF EXISTS "property_delete_consolidated" ON public.property;

-- Table: payment_schedule (consolidate into single policy)
DROP POLICY IF EXISTS "Landlords can view tenant payment schedules" ON public.payment_schedule;
DROP POLICY IF EXISTS "Tenants can view own payment schedule" ON public.payment_schedule;
CREATE POLICY "payment_schedule_view_access"
ON public.payment_schedule
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lease l
    JOIN public.unit u ON l.unit_id = u.id
    JOIN public.property p ON u.property_id = p.id
    WHERE l.id = payment_schedule.lease_id
    AND p.user_id = (SELECT auth.uid()::text)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.lease l
    WHERE l.id = payment_schedule.lease_id
    AND l.tenant_id = (SELECT auth.uid()::text)
  )
);

-- Table: rent_payment (consolidate into single policy)
DROP POLICY IF EXISTS "Landlords can view received payments" ON public.rent_payment;
DROP POLICY IF EXISTS "Tenants can view own payments" ON public.rent_payment;
CREATE POLICY "rent_payment_view_access"
ON public.rent_payment
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lease l
    JOIN public.unit u ON l.unit_id = u.id
    JOIN public.property p ON u.property_id = p.id
    WHERE l.id = rent_payment.lease_id
    AND p.user_id = (SELECT auth.uid()::text)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.lease l
    WHERE l.id = rent_payment.lease_id
    AND l.tenant_id = (SELECT auth.uid()::text)
  )
);

-- Table: rent_subscription (consolidate 3 policies into 1)
DROP POLICY IF EXISTS "Landlords can view property subscriptions" ON public.rent_subscription;
DROP POLICY IF EXISTS "Landlords can view tenant subscriptions" ON public.rent_subscription;
DROP POLICY IF EXISTS "Tenants can view own subscriptions" ON public.rent_subscription;
CREATE POLICY "rent_subscription_view_access"
ON public.rent_subscription
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lease l
    JOIN public.unit u ON l.unit_id = u.id
    JOIN public.property p ON u.property_id = p.id
    WHERE l.id = rent_subscription.lease_id
    AND p.user_id = (SELECT auth.uid()::text)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.lease l
    WHERE l.id = rent_subscription.lease_id
    AND l.tenant_id = (SELECT auth.uid()::text)
  )
);

-- Table: scheduled_report (drop specific action policies, keep ALL)
DROP POLICY IF EXISTS "Users can view their own scheduled reports" ON public.scheduled_report;
DROP POLICY IF EXISTS "Users can insert their own scheduled reports" ON public.scheduled_report;
DROP POLICY IF EXISTS "Users can update their own scheduled reports" ON public.scheduled_report;
DROP POLICY IF EXISTS "Users can delete their own scheduled reports" ON public.scheduled_report;

-- Table: tenant (drop specific action policies, keep ALL)
DROP POLICY IF EXISTS "tenant_select_owner" ON public.tenant;
DROP POLICY IF EXISTS "tenant_insert_self" ON public.tenant;
DROP POLICY IF EXISTS "tenant_modify_owner" ON public.tenant;
DROP POLICY IF EXISTS "tenant_delete_owner" ON public.tenant;

-- Table: unit (drop duplicate)
DROP POLICY IF EXISTS "Users can manage units of their properties" ON public.unit;

-- Table: users (drop duplicates, keep ALL policy)
DROP POLICY IF EXISTS "users_select_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
