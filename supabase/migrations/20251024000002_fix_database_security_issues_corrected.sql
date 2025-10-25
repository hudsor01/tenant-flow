-- Migration: Fix Database Security Issues (Corrected)
-- Date: 2025-01-24
-- Description: Addresses security advisors findings with corrected function signatures

-- =====================================================
-- 1. RLS POLICY FOR stripe_processed_events
-- =====================================================
-- Issue: Table has RLS enabled but no policies exist
-- Fix: Type mismatch - stripe_customer_id is TEXT, not UUID

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can manage stripe events" ON public.stripe_processed_events;
DROP POLICY IF EXISTS "Users can view their own stripe events" ON public.stripe_processed_events;

-- Service role can manage all events (backend webhook processing)
CREATE POLICY "Service role can manage stripe events"
ON public.stripe_processed_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can view events related to their stripe_customer_id
CREATE POLICY "Users can view their own stripe events"
ON public.stripe_processed_events
FOR SELECT
TO authenticated
USING (
  -- Allow if event is related to user's subscription/customer
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id::text = auth.uid()::text
    AND users.stripe_customer_id = stripe_processed_events.stripe_customer_id
  )
);

-- =====================================================
-- 2. SET search_path FOR EXISTING DATABASE FUNCTIONS
-- =====================================================
-- Issue: Functions have mutable search_path (security risk)
-- Fix: Only update functions that actually exist in the database

-- Analytics Functions (that exist)
ALTER FUNCTION public.get_property_stats(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_property_occupancy_analytics(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_property_financial_analytics(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_property_maintenance_analytics(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_dashboard_financial_stats(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_financial_overview(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_expense_summary(uuid, integer) SET search_path = public, pg_temp;

-- Auth & Tenant Functions
ALTER FUNCTION public.sync_tenant_on_auth_confirm() SET search_path = public, pg_temp;
ALTER FUNCTION public.activate_tenant_from_auth_user(uuid) SET search_path = public, pg_temp;

-- Stripe Integration Functions
ALTER FUNCTION public.get_stripe_customer_by_user_id(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.link_stripe_customer_to_user(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_id_by_stripe_customer(text) SET search_path = public, pg_temp;

-- Subscription Functions
ALTER FUNCTION public.get_user_active_subscription(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_subscription_history(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_user_feature_access(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_upcoming_invoice_preview(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_user_on_trial(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_trial_days_remaining(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_active_stripe_products() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_invoices(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_payment_methods(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_plan_limits(uuid) SET search_path = public, pg_temp;

-- Email & Notification Functions
ALTER FUNCTION public.send_email_via_resend(text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.send_trial_ending_email(uuid, text, integer, timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.send_payment_failed_email(uuid, text, integer, text, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.send_payment_success_email(uuid, text, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_lease_expiry_notifications() SET search_path = public, pg_temp;

-- Security Hook Function
ALTER FUNCTION public.hook_password_verification_attempt(jsonb) SET search_path = public, pg_temp;

-- =====================================================
-- 3. RESTRICT API ACCESS TO STRIPE FOREIGN TABLES
-- =====================================================
-- Issue: Foreign tables accessible via PostgREST API (no RLS support)
-- Fix: Revoke API access, only allow via backend functions

-- Revoke public access to Stripe schema foreign tables
REVOKE ALL ON stripe.customers FROM anon, authenticated;
REVOKE ALL ON stripe.payment_intents FROM anon, authenticated;
REVOKE ALL ON stripe.subscriptions FROM anon, authenticated;
REVOKE ALL ON stripe.products FROM anon, authenticated;
REVOKE ALL ON stripe.prices FROM anon, authenticated;
REVOKE ALL ON stripe.invoices FROM anon, authenticated;
REVOKE ALL ON stripe.charges FROM anon, authenticated;

-- Grant access only to service_role (backend only)
GRANT SELECT ON stripe.customers TO service_role;
GRANT SELECT ON stripe.payment_intents TO service_role;
GRANT SELECT ON stripe.subscriptions TO service_role;
GRANT SELECT ON stripe.products TO service_role;
GRANT SELECT ON stripe.prices TO service_role;
GRANT SELECT ON stripe.invoices TO service_role;
GRANT SELECT ON stripe.charges TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- All security issues identified by Supabase advisors have been addressed.
-- Remaining manual steps:
--   1. Remove 'stripe' schema from Supabase Dashboard → API → Exposed Schemas
--   2. Enable leaked password protection in Supabase Dashboard → Auth → Security
--   3. Schedule Postgres upgrade to apply security patches
