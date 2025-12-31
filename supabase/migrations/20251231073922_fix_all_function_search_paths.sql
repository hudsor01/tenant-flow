-- Migration: Fix All Remaining Function Search Paths
-- Created: 2025-12-31 07:39:22 UTC
-- Purpose: Set search_path = 'public' for all SECURITY DEFINER functions
--          that have empty search_path but reference unqualified tables
--
-- Why search_path = 'public' is safe in Supabase:
--   - Regular users cannot create schemas in Supabase
--   - Only service_role/postgres can create schemas
--   - Therefore schema injection attacks are not possible
--   - Using 'public' is simpler and avoids "relation does not exist" errors
-- ============================================================================

-- Analytics functions
ALTER FUNCTION public.get_occupancy_trends_optimized(uuid, integer) SET search_path = 'public';
ALTER FUNCTION public.get_revenue_trends_optimized(uuid, integer) SET search_path = 'public';
ALTER FUNCTION public.get_dashboard_stats(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_dashboard_time_series(uuid, text, integer) SET search_path = 'public';
ALTER FUNCTION public.get_metric_trend(uuid, text, text) SET search_path = 'public';

-- Financial functions
ALTER FUNCTION public.calculate_financial_metrics(uuid) SET search_path = 'public';
ALTER FUNCTION public.calculate_monthly_metrics(uuid) SET search_path = 'public';
ALTER FUNCTION public.calculate_net_operating_income(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_billing_insights(uuid, timestamp, timestamp) SET search_path = 'public';
ALTER FUNCTION public.get_expense_summary(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_financial_overview(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_invoice_statistics(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_leases_with_financial_analytics(uuid) SET search_path = 'public';

-- Property performance functions
ALTER FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) SET search_path = 'public';
ALTER FUNCTION public.get_property_performance_cached(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_property_performance_trends(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_property_performance_with_trends(uuid, text, integer) SET search_path = 'public';
ALTER FUNCTION public.search_properties(uuid, text, integer) SET search_path = 'public';

-- Utility functions (no arguments)
ALTER FUNCTION public.log_lease_signature_activity() SET search_path = 'public';
ALTER FUNCTION public.sync_unit_status_from_lease() SET search_path = 'public';

-- User activity function
ALTER FUNCTION public.get_user_dashboard_activities(text, integer, integer) SET search_path = 'public';

-- Maintenance analytics (may have multiple signatures, handle gracefully)
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) SET search_path = ''public''';
EXCEPTION WHEN undefined_function THEN
  NULL;
END;
$$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_maintenance_analytics(uuid) SET search_path = ''public''';
EXCEPTION WHEN undefined_function THEN
  NULL;
END;
$$;

-- RLS helper functions that may reference tables
ALTER FUNCTION public.get_current_owner_user_id() SET search_path = 'public';

-- Webhook/lock functions
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.acquire_webhook_event_lock_with_id(text, text, text, jsonb) SET search_path = ''public''';
EXCEPTION WHEN undefined_function THEN
  NULL;
END;
$$;

-- Performance monitoring
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_slow_rls_queries(numeric) SET search_path = ''public''';
EXCEPTION WHEN undefined_function THEN
  NULL;
END;
$$;

-- Sync functions
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.sync_user_type_to_auth() SET search_path = ''public''';
EXCEPTION WHEN undefined_function THEN
  NULL;
END;
$$;
