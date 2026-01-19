-- Migration: Fix Service Role Function Permissions
-- Created: 2025-12-31 06:39:02 UTC
-- Purpose: Grant EXECUTE permission to service_role for backend RPC calls
--
-- Root Cause Analysis:
--   The migration 20251230240000_fix_function_security.sql correctly secured functions
--   by revoking PUBLIC access, but only granted EXECUTE to 'authenticated' role.
--   The backend uses the service role key (SUPABASE_SERVICE_ROLE_KEY) which authenticates as the
--   'service_role' PostgreSQL role. Even though service_role has bypassrls privilege,
--   function EXECUTE permissions are separate and must be explicitly granted.
--
-- Impact: This fixes 503 errors on:
--   - /api/v1/owner/analytics/dashboard
--   - /api/v1/financial/analytics/*
--   - Any endpoint using SubscriptionGuard
--
-- Reference: https://supabase.com/docs/guides/database/functions
-- ============================================================================

-- Grant service_role EXECUTE permission on check_user_feature_access
-- This function is called by SubscriptionGuard via rpcWithRetries using adminClient
-- Note: The (text, text) signature was dropped in migration 20251110151620
-- Only the (uuid, text) signature exists now
grant execute on function public.check_user_feature_access(uuid, text) to service_role;

-- ============================================================================
-- PART 2: Fix other backend functions that may have been missed
-- ============================================================================
-- These functions are called by the backend and need service_role access

-- Dashboard analytics functions
grant execute on function public.get_dashboard_stats(uuid) to service_role;
grant execute on function public.get_dashboard_time_series(uuid, text, integer) to service_role;

-- Financial analytics functions
grant execute on function public.get_billing_insights(uuid, timestamp, timestamp) to service_role;
grant execute on function public.get_financial_overview(uuid) to service_role;
grant execute on function public.get_expense_summary(uuid) to service_role;
grant execute on function public.get_invoice_statistics(uuid) to service_role;
grant execute on function public.get_lease_financial_summary(uuid) to service_role;
grant execute on function public.get_leases_with_financial_analytics(uuid) to service_role;
grant execute on function public.get_revenue_trends_optimized(uuid, integer) to service_role;

-- Property analytics functions
grant execute on function public.get_property_performance_analytics(uuid, uuid, text, integer) to service_role;
grant execute on function public.get_property_performance_cached(uuid) to service_role;
grant execute on function public.get_property_performance_trends(uuid) to service_role;
grant execute on function public.get_property_performance_with_trends(uuid, text, integer) to service_role;
grant execute on function public.get_occupancy_trends_optimized(uuid, integer) to service_role;
grant execute on function public.search_properties(uuid, text, integer) to service_role;

-- Maintenance analytics
grant execute on function public.get_maintenance_analytics(uuid) to service_role;

-- Metric functions
grant execute on function public.get_metric_trend(uuid, text, text) to service_role;
grant execute on function public.calculate_financial_metrics(uuid) to service_role;
grant execute on function public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.calculate_monthly_metrics(uuid) to service_role;
grant execute on function public.calculate_net_operating_income(uuid) to service_role;

-- User functions (needed for backend user lookups)
grant execute on function public.get_user_profile(uuid) to service_role;
grant execute on function public.get_user_sessions(uuid) to service_role;
grant execute on function public.get_user_dashboard_activities(text, integer, integer) to service_role;
grant execute on function public.get_user_plan_limits(text) to service_role;

-- Lease functions
grant execute on function public.sign_lease_and_check_activation(uuid, text, text, timestamptz, signature_method) to service_role;
grant execute on function public.assert_can_create_lease(uuid, uuid) to service_role;

-- Session management
grant execute on function public.revoke_user_session(uuid, uuid) to service_role;

-- Error logging (backend writes errors)
grant execute on function public.log_user_error(text, text, text, text, jsonb, text, inet) to service_role;

-- RLS helper functions (may be called in some contexts)
grant execute on function public.get_current_owner_user_id() to service_role;
grant execute on function public.get_current_tenant_id() to service_role;
grant execute on function public.get_current_user_type() to service_role;
grant execute on function public.get_owner_lease_tenant_ids() to service_role;
grant execute on function public.get_tenant_lease_ids() to service_role;
grant execute on function public.get_tenant_property_ids() to service_role;
grant execute on function public.get_tenant_unit_ids() to service_role;
grant execute on function public.user_is_tenant() to service_role;

-- Private schema functions
grant execute on function private.get_my_stripe_customer_id() to service_role;
grant execute on function private.get_user_stripe_customer_id() to service_role;

-- Compliance
grant execute on function public.get_lead_paint_compliance_report() to service_role;

-- ============================================================================
-- VERIFICATION QUERY (for manual verification after migration)
-- ============================================================================
-- Run this query to verify permissions are correctly set:
--
-- SELECT
--     p.proname as function_name,
--     has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
--     has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proname LIKE '%check_user_feature%'
-- ORDER BY p.proname;
