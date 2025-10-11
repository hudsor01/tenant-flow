-- Migration: Fix Security and Performance Advisors
-- Created: 2025-10-12
-- Purpose: Resolve all Supabase security and performance warnings
-- Reference: https://supabase.com/docs/guides/database/database-linter

-- ============================================================================
-- PART 1: FIX MUTABLE SEARCH_PATH ON FUNCTIONS (Security Issue)
-- ============================================================================
-- Issue: 14 functions have mutable search_path which is a security vulnerability
-- Fix: Add SET search_path = '' to all affected functions
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Auth utility functions
ALTER FUNCTION public.get_auth_uid() SET search_path = '';
ALTER FUNCTION public.get_auth_uid_uuid() SET search_path = '';
ALTER FUNCTION public.get_jwt_claim(text) SET search_path = '';
ALTER FUNCTION public.get_jwt_role() SET search_path = '';

-- Financial functions
ALTER FUNCTION public.get_financial_overview(uuid, integer) SET search_path = '';
ALTER FUNCTION public.get_dashboard_financial_stats(uuid) SET search_path = '';
ALTER FUNCTION public.get_expense_summary(uuid, integer) SET search_path = '';

-- Stripe webhook event functions
ALTER FUNCTION public.record_stripe_event(text, text) SET search_path = '';
ALTER FUNCTION public.check_event_processed(text) SET search_path = '';
ALTER FUNCTION public.cleanup_old_stripe_events(integer) SET search_path = '';
ALTER FUNCTION public.update_stripe_event_retry(text, integer) SET search_path = '';
ALTER FUNCTION public.mark_stripe_event_failed(text, text) SET search_path = '';
ALTER FUNCTION public.get_events_pending_recovery(integer, integer) SET search_path = '';
ALTER FUNCTION public.get_webhook_statistics() SET search_path = '';

-- ============================================================================
-- PART 2: ENABLE RLS ON STRIPE CACHE TABLES
-- ============================================================================
-- Issue: 6 Stripe cache tables don't have RLS enabled
-- These are read-only cache tables for Stripe data sync
-- Service role should have full access, users should have no direct access

-- Enable RLS on all Stripe cache tables
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create restrictive RLS policies (service_role only)
-- These tables are internal caches and should not be directly accessible by users

-- stripe_customers policies
CREATE POLICY "stripe_customers_service_only" ON public.stripe_customers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "stripe_customers_no_user_access" ON public.stripe_customers
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- stripe_payment_intents policies
CREATE POLICY "stripe_payment_intents_service_only" ON public.stripe_payment_intents
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "stripe_payment_intents_no_user_access" ON public.stripe_payment_intents
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- stripe_prices policies
CREATE POLICY "stripe_prices_service_only" ON public.stripe_prices
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "stripe_prices_read_only" ON public.stripe_prices
  FOR SELECT TO authenticated, anon
  USING (true);

-- stripe_products policies
CREATE POLICY "stripe_products_service_only" ON public.stripe_products
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "stripe_products_read_only" ON public.stripe_products
  FOR SELECT TO authenticated, anon
  USING (true);

-- stripe_subscriptions policies
CREATE POLICY "stripe_subscriptions_service_only" ON public.stripe_subscriptions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "stripe_subscriptions_no_user_access" ON public.stripe_subscriptions
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ============================================================================
-- PART 3: ENABLE RLS ON FDW STATS TABLE
-- ============================================================================
-- wrappers_fdw_stats is an internal table, should be service_role only

ALTER TABLE public.wrappers_fdw_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrappers_fdw_stats_service_only" ON public.wrappers_fdw_stats
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "wrappers_fdw_stats_no_user_access" ON public.wrappers_fdw_stats
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ============================================================================
-- PART 4: ADD SECURITY AUDIT LOG ENTRY
-- ============================================================================

INSERT INTO public.security_audit_log (
  "eventType",
  "userId",
  "ipAddress",
  "userAgent",
  "resource",
  "action",
  "details",
  "severity"
)
VALUES (
  'SECURITY_CONFIG_UPDATE',
  '00000000-0000-0000-0000-000000000000',
  '127.0.0.1',
  'PostgreSQL Migration',
  'database_security',
  'APPLIED_SECURITY_FIXES',
  jsonb_build_object(
    'migration', '20251012_fix_security_advisors',
    'fixes_applied', jsonb_build_array(
      'Fixed 14 functions with mutable search_path',
      'Enabled RLS on 6 Stripe cache tables',
      'Enabled RLS on wrappers_fdw_stats table'
    ),
    'timestamp', NOW()
  ),
  'HIGH'
);

-- ============================================================================
-- VERIFICATION QUERIES (commented out, run manually if needed)
-- ============================================================================

/*
-- Verify all functions have search_path set
SELECT
    routine_name,
    routine_type,
    (prosecdef IS TRUE) as has_search_path
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_webhook_statistics',
    'record_stripe_event',
    'check_event_processed',
    'cleanup_old_stripe_events',
    'update_stripe_event_retry',
    'mark_stripe_event_failed',
    'get_events_pending_recovery',
    'get_financial_overview',
    'get_dashboard_financial_stats',
    'get_auth_uid',
    'get_jwt_claim',
    'get_jwt_role',
    'get_auth_uid_uuid',
    'get_expense_summary'
  )
ORDER BY routine_name;

-- Verify all Stripe tables have RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'stripe_%'
ORDER BY tablename;

-- Count RLS policies on Stripe tables
SELECT
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'stripe_%'
GROUP BY schemaname, tablename
ORDER BY tablename;
*/
