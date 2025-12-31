-- Migration: Fix Function Security Issues
-- Created: 2025-12-30 24:00:00 UTC
-- Purpose:
--   1. Add search_path to SECURITY DEFINER functions missing it
--   2. Restrict function grants from PUBLIC to appropriate roles
-- Security Impact: HIGH - Prevents SQL injection and unauthorized access

-- ============================================================================
-- PART 1: FIX SECURITY DEFINER FUNCTIONS WITHOUT search_path
-- ============================================================================
-- Using ALTER FUNCTION to set search_path without replacing the function body
-- This is safer as it doesn't require matching the exact function signature

-- 1. acquire_internal_event_lock - backend webhook idempotency
alter function public.acquire_internal_event_lock(text, text, text) set search_path = '';

-- 2. cleanup_old_errors - scheduled cleanup
alter function public.cleanup_old_errors() set search_path = '';

-- 3. cleanup_old_security_events - scheduled cleanup
alter function public.cleanup_old_security_events() set search_path = '';

-- 4. get_common_errors - admin monitoring
alter function public.get_common_errors(integer, integer) set search_path = '';

-- 5. get_error_prone_users - admin monitoring
alter function public.get_error_prone_users(integer, integer) set search_path = '';

-- 6. get_error_summary - admin monitoring
alter function public.get_error_summary(integer) set search_path = '';

-- 7. get_lead_paint_compliance_report - compliance reporting
alter function public.get_lead_paint_compliance_report() set search_path = '';

-- 8. get_slow_rls_queries - performance monitoring
alter function public.get_slow_rls_queries(numeric) set search_path = '';

-- 9. cleanup_old_internal_events - scheduled cleanup
alter function public.cleanup_old_internal_events(integer) set search_path = '';

-- 10. acquire_webhook_event_lock_with_id - webhook idempotency
alter function public.acquire_webhook_event_lock_with_id(text, text, text, jsonb) set search_path = '';

-- ============================================================================
-- PART 2: RESTRICT FUNCTION GRANTS
-- ============================================================================
-- Revoke PUBLIC and grant only to appropriate roles

-- Backend-only functions (service_role only)
revoke all on function public.acquire_internal_event_lock(text, text, text) from public, anon, authenticated;
grant execute on function public.acquire_internal_event_lock(text, text, text) to service_role;

revoke all on function public.acquire_webhook_event_lock_with_id(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.acquire_webhook_event_lock_with_id(text, text, text, jsonb) to service_role;

revoke all on function public.cleanup_old_errors() from public, anon, authenticated;
grant execute on function public.cleanup_old_errors() to service_role;

revoke all on function public.cleanup_old_internal_events(integer) from public, anon, authenticated;
grant execute on function public.cleanup_old_internal_events(integer) to service_role;

revoke all on function public.cleanup_old_security_events() from public, anon, authenticated;
grant execute on function public.cleanup_old_security_events() to service_role;

revoke all on function public.activate_lease_with_pending_subscription(uuid) from public, anon, authenticated;
grant execute on function public.activate_lease_with_pending_subscription(uuid) to service_role;

revoke all on function public.upsert_rent_payment(uuid, uuid, integer, text, text, text, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.upsert_rent_payment(uuid, uuid, integer, text, text, text, text, text, text, text, text, integer) to service_role;

revoke all on function public.link_stripe_customer_to_user(text, text) from public, anon, authenticated;
grant execute on function public.link_stripe_customer_to_user(text, text) to service_role;

revoke all on function public.sync_user_type_to_auth() from public, anon, authenticated;
grant execute on function public.sync_user_type_to_auth() to service_role;

revoke all on function public.ensure_public_user_for_auth() from public, anon, authenticated;
grant execute on function public.ensure_public_user_for_auth() to service_role;

-- Admin/monitoring functions (service_role only)
revoke all on function public.get_common_errors(integer, integer) from public, anon, authenticated;
grant execute on function public.get_common_errors(integer, integer) to service_role;

revoke all on function public.get_error_prone_users(integer, integer) from public, anon, authenticated;
grant execute on function public.get_error_prone_users(integer, integer) to service_role;

revoke all on function public.get_error_summary(integer) from public, anon, authenticated;
grant execute on function public.get_error_summary(integer) to service_role;

revoke all on function public.get_slow_rls_queries(numeric) from public, anon, authenticated;
grant execute on function public.get_slow_rls_queries(numeric) to service_role;

-- User-facing functions (authenticated only)
revoke all on function public.get_dashboard_stats(uuid) from public, anon;
grant execute on function public.get_dashboard_stats(uuid) to authenticated;

revoke all on function public.get_dashboard_time_series(uuid, text, integer) from public, anon;
grant execute on function public.get_dashboard_time_series(uuid, text, integer) to authenticated;

revoke all on function public.get_billing_insights(uuid, timestamp, timestamp) from public, anon;
grant execute on function public.get_billing_insights(uuid, timestamp, timestamp) to authenticated;

revoke all on function public.get_financial_overview(uuid) from public, anon;
grant execute on function public.get_financial_overview(uuid) to authenticated;

revoke all on function public.get_expense_summary(uuid) from public, anon;
grant execute on function public.get_expense_summary(uuid) to authenticated;

revoke all on function public.get_invoice_statistics(uuid) from public, anon;
grant execute on function public.get_invoice_statistics(uuid) to authenticated;

revoke all on function public.get_lease_financial_summary(uuid) from public, anon;
grant execute on function public.get_lease_financial_summary(uuid) to authenticated;

revoke all on function public.get_leases_with_financial_analytics(uuid) from public, anon;
grant execute on function public.get_leases_with_financial_analytics(uuid) to authenticated;

revoke all on function public.get_maintenance_analytics(uuid) from public, anon;
grant execute on function public.get_maintenance_analytics(uuid) to authenticated;

revoke all on function public.get_metric_trend(uuid, text, text) from public, anon;
grant execute on function public.get_metric_trend(uuid, text, text) to authenticated;

revoke all on function public.get_occupancy_trends_optimized(uuid, integer) from public, anon;
grant execute on function public.get_occupancy_trends_optimized(uuid, integer) to authenticated;

revoke all on function public.get_property_performance_analytics(uuid, uuid, text, integer) from public, anon;
grant execute on function public.get_property_performance_analytics(uuid, uuid, text, integer) to authenticated;

revoke all on function public.get_property_performance_cached(uuid) from public, anon;
grant execute on function public.get_property_performance_cached(uuid) to authenticated;

revoke all on function public.get_property_performance_trends(uuid) from public, anon;
grant execute on function public.get_property_performance_trends(uuid) to authenticated;

revoke all on function public.get_property_performance_with_trends(uuid, text, integer) from public, anon;
grant execute on function public.get_property_performance_with_trends(uuid, text, integer) to authenticated;

revoke all on function public.get_revenue_trends_optimized(uuid, integer) from public, anon;
grant execute on function public.get_revenue_trends_optimized(uuid, integer) to authenticated;

revoke all on function public.get_user_profile(uuid) from public, anon;
grant execute on function public.get_user_profile(uuid) to authenticated;

revoke all on function public.get_user_sessions(uuid) from public, anon;
grant execute on function public.get_user_sessions(uuid) to authenticated;

revoke all on function public.get_user_dashboard_activities(text, integer, integer) from public, anon;
grant execute on function public.get_user_dashboard_activities(text, integer, integer) to authenticated;

revoke all on function public.get_user_plan_limits(text) from public, anon;
grant execute on function public.get_user_plan_limits(text) to authenticated;

revoke all on function public.search_properties(uuid, text, integer) from public, anon;
grant execute on function public.search_properties(uuid, text, integer) to authenticated;

revoke all on function public.sign_lease_and_check_activation(uuid, text, text, timestamptz, signature_method) from public, anon;
grant execute on function public.sign_lease_and_check_activation(uuid, text, text, timestamptz, signature_method) to authenticated;

revoke all on function public.revoke_user_session(uuid, uuid) from public, anon;
grant execute on function public.revoke_user_session(uuid, uuid) to authenticated;

revoke all on function public.log_user_error(text, text, text, text, jsonb, text, inet) from public, anon;
grant execute on function public.log_user_error(text, text, text, text, jsonb, text, inet) to authenticated;

revoke all on function public.check_user_feature_access(text, text) from public, anon;
grant execute on function public.check_user_feature_access(text, text) to authenticated;

revoke all on function public.assert_can_create_lease(uuid, uuid) from public, anon;
grant execute on function public.assert_can_create_lease(uuid, uuid) to authenticated;

-- RLS helper functions (authenticated - used in policies)
revoke all on function public.get_current_owner_user_id() from public, anon;
grant execute on function public.get_current_owner_user_id() to authenticated;

revoke all on function public.get_current_tenant_id() from public, anon;
grant execute on function public.get_current_tenant_id() to authenticated;

revoke all on function public.get_current_user_type() from public, anon;
grant execute on function public.get_current_user_type() to authenticated;

revoke all on function public.get_owner_lease_tenant_ids() from public, anon;
grant execute on function public.get_owner_lease_tenant_ids() to authenticated;

revoke all on function public.get_tenant_lease_ids() from public, anon;
grant execute on function public.get_tenant_lease_ids() to authenticated;

revoke all on function public.get_tenant_property_ids() from public, anon;
grant execute on function public.get_tenant_property_ids() to authenticated;

revoke all on function public.get_tenant_unit_ids() from public, anon;
grant execute on function public.get_tenant_unit_ids() to authenticated;

revoke all on function public.user_is_tenant() from public, anon;
grant execute on function public.user_is_tenant() to authenticated;

-- Private schema helper functions (authenticated - used in policies)
revoke all on function private.get_my_stripe_customer_id() from public, anon;
grant execute on function private.get_my_stripe_customer_id() to authenticated;

revoke all on function private.get_user_stripe_customer_id() from public, anon;
grant execute on function private.get_user_stripe_customer_id() to authenticated;

-- Stripe lookup functions (authenticated + service_role)
revoke all on function public.get_stripe_customer_by_user_id(uuid) from public, anon;
grant execute on function public.get_stripe_customer_by_user_id(uuid) to authenticated, service_role;

revoke all on function public.get_user_id_by_stripe_customer(text) from public, anon;
grant execute on function public.get_user_id_by_stripe_customer(text) to authenticated, service_role;

-- Analytics functions with overloaded signatures
revoke all on function public.calculate_financial_metrics(uuid) from public, anon;
grant execute on function public.calculate_financial_metrics(uuid) to authenticated;

revoke all on function public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.calculate_maintenance_metrics(uuid, uuid, uuid, uuid) to authenticated;

revoke all on function public.calculate_monthly_metrics(uuid) from public, anon;
grant execute on function public.calculate_monthly_metrics(uuid) to authenticated;

revoke all on function public.calculate_net_operating_income(uuid) from public, anon;
grant execute on function public.calculate_net_operating_income(uuid) to authenticated;

revoke all on function public.get_lead_paint_compliance_report() from public, anon;
grant execute on function public.get_lead_paint_compliance_report() to authenticated;

-- Trigger helper functions (service_role - called by triggers)
revoke all on function public.handle_property_image_upload() from public, anon, authenticated;
grant execute on function public.handle_property_image_upload() to service_role;

revoke all on function public.ledger_aggregation() from public, anon, authenticated;
grant execute on function public.ledger_aggregation() to service_role;

-- Keep health_check public (for monitoring)
-- Already has proper grants
