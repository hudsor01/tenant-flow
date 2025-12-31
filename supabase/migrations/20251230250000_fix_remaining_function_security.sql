-- Migration: Fix Remaining Function Security Issues
-- Created: 2025-12-30 25:00:00 UTC
-- Purpose: Add search_path = '' to all remaining SECURITY DEFINER functions
-- Security Impact: HIGH - Prevents SQL injection via search_path manipulation
--
-- Note: Using ALTER FUNCTION to add search_path without changing function bodies
-- This is safer as it preserves existing signatures and behavior

-- ============================================================================
-- PART 1: RLS HELPER FUNCTIONS (no arguments)
-- ============================================================================
alter function public.get_current_owner_user_id() set search_path = '';
alter function public.get_current_tenant_id() set search_path = '';
alter function public.get_current_user_type() set search_path = '';
alter function public.get_owner_lease_tenant_ids() set search_path = '';
alter function public.get_tenant_lease_ids() set search_path = '';
alter function public.get_tenant_property_ids() set search_path = '';
alter function public.get_tenant_unit_ids() set search_path = '';
alter function public.user_is_tenant() set search_path = '';

-- ============================================================================
-- PART 2: DASHBOARD AND ANALYTICS FUNCTIONS
-- ============================================================================
alter function public.get_dashboard_stats(uuid) set search_path = '';
alter function public.get_dashboard_time_series(uuid, text, integer) set search_path = '';
alter function public.get_billing_insights(uuid, timestamp, timestamp) set search_path = '';
alter function public.get_financial_overview(uuid) set search_path = '';
alter function public.get_expense_summary(uuid) set search_path = '';
alter function public.get_invoice_statistics(uuid) set search_path = '';
alter function public.get_lease_financial_summary(uuid) set search_path = '';
alter function public.get_leases_with_financial_analytics(uuid) set search_path = '';
alter function public.get_maintenance_analytics(uuid) set search_path = '';
alter function public.get_metric_trend(uuid, text, text) set search_path = '';
alter function public.get_occupancy_trends_optimized(uuid, integer) set search_path = '';
alter function public.get_property_performance_analytics(uuid, uuid, text, integer) set search_path = '';
alter function public.get_property_performance_cached(uuid) set search_path = '';
alter function public.get_property_performance_trends(uuid) set search_path = '';
alter function public.get_property_performance_with_trends(uuid, text, integer) set search_path = '';
alter function public.get_revenue_trends_optimized(uuid, integer) set search_path = '';

-- ============================================================================
-- PART 3: CALCULATION FUNCTIONS
-- ============================================================================
alter function public.calculate_financial_metrics(uuid) set search_path = '';
alter function public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) set search_path = '';
alter function public.calculate_monthly_metrics(uuid) set search_path = '';
alter function public.calculate_net_operating_income(uuid) set search_path = '';

-- ============================================================================
-- PART 4: USER FUNCTIONS
-- ============================================================================
alter function public.get_user_profile(uuid) set search_path = '';
alter function public.get_user_sessions(uuid) set search_path = '';
alter function public.get_user_dashboard_activities(text, integer, integer) set search_path = '';
alter function public.get_user_plan_limits(text) set search_path = '';
alter function public.check_user_feature_access(text, text) set search_path = '';
alter function public.revoke_user_session(uuid, uuid) set search_path = '';
alter function public.log_user_error(text, text, text, text, jsonb, text, inet) set search_path = '';

-- ============================================================================
-- PART 5: TENANT FUNCTIONS
-- ============================================================================
alter function public.get_tenants_by_owner(uuid) set search_path = '';
alter function public.get_tenants_with_lease_by_owner(uuid) set search_path = '';

-- ============================================================================
-- PART 6: LEASE FUNCTIONS
-- ============================================================================
alter function public.sign_lease_and_check_activation(uuid, text, text, timestamptz, signature_method) set search_path = '';
alter function public.activate_lease_with_pending_subscription(uuid) set search_path = '';
alter function public.assert_can_create_lease(uuid, uuid) set search_path = '';

-- ============================================================================
-- PART 7: STRIPE FUNCTIONS
-- ============================================================================
alter function public.get_stripe_customer_by_user_id(uuid) set search_path = '';
alter function public.get_user_id_by_stripe_customer(text) set search_path = '';
alter function public.link_stripe_customer_to_user(text, text) set search_path = '';

-- ============================================================================
-- PART 8: UTILITY FUNCTIONS
-- ============================================================================
alter function public.search_properties(uuid, text, integer) set search_path = '';
