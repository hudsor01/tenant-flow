-- Migration: Fix Function Security Issues
-- Created: 2025-12-30 24:00:00 UTC
-- Purpose:
--   1. Add search_path to SECURITY DEFINER functions missing it
--   2. Restrict function grants from PUBLIC to appropriate roles
-- Security Impact: HIGH - Prevents SQL injection and unauthorized access
-- Note: Uses DO blocks with IF EXISTS to handle functions that may not exist

-- ============================================================================
-- PART 1: FIX SECURITY DEFINER FUNCTIONS WITHOUT search_path
-- ============================================================================
-- Using dynamic SQL with IF EXISTS checks to handle optional functions

DO $$
DECLARE
  func RECORD;
BEGIN
  -- List of functions to secure with search_path
  FOR func IN
    SELECT *
    FROM (VALUES
      ('public', 'acquire_internal_event_lock', '(text, text, text)'),
      ('public', 'cleanup_old_errors', '()'),
      ('public', 'cleanup_old_security_events', '()'),
      ('public', 'get_common_errors', '(integer, integer)'),
      ('public', 'get_error_prone_users', '(integer, integer)'),
      ('public', 'get_error_summary', '(integer)'),
      ('public', 'get_lead_paint_compliance_report', '()'),
      ('public', 'get_slow_rls_queries', '(numeric)'),
      ('public', 'cleanup_old_internal_events', '(integer)'),
      ('public', 'acquire_webhook_event_lock_with_id', '(text, text, text, jsonb)')
    ) AS t(schema_name, func_name, args)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = func.schema_name AND p.proname = func.func_name
    ) THEN
      EXECUTE format('ALTER FUNCTION %I.%I%s SET search_path = ''''',
        func.schema_name, func.func_name, func.args);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 2: RESTRICT FUNCTION GRANTS
-- ============================================================================
-- Uses DO block to safely handle functions that may not exist

DO $$
DECLARE
  func RECORD;
BEGIN
  -- Backend-only functions (service_role only)
  FOR func IN
    SELECT *
    FROM (VALUES
      ('public', 'acquire_internal_event_lock', '(text, text, text)'),
      ('public', 'acquire_webhook_event_lock_with_id', '(text, text, text, jsonb)'),
      ('public', 'cleanup_old_errors', '()'),
      ('public', 'cleanup_old_internal_events', '(integer)'),
      ('public', 'cleanup_old_security_events', '()'),
      ('public', 'activate_lease_with_pending_subscription', '(uuid)'),
      ('public', 'upsert_rent_payment', '(uuid, uuid, integer, text, text, text, text, text, text, text, text, integer)'),
      ('public', 'link_stripe_customer_to_user', '(text, text)'),
      ('public', 'sync_user_type_to_auth', '()'),
      ('public', 'ensure_public_user_for_auth', '()'),
      ('public', 'get_common_errors', '(integer, integer)'),
      ('public', 'get_error_prone_users', '(integer, integer)'),
      ('public', 'get_error_summary', '(integer)'),
      ('public', 'get_slow_rls_queries', '(numeric)'),
      ('public', 'handle_property_image_upload', '()'),
      ('public', 'ledger_aggregation', '()')
    ) AS t(schema_name, func_name, args)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = func.schema_name AND p.proname = func.func_name
    ) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %I.%I%s FROM public, anon, authenticated',
        func.schema_name, func.func_name, func.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I%s TO service_role',
        func.schema_name, func.func_name, func.args);
    END IF;
  END LOOP;

  -- User-facing functions (authenticated only)
  FOR func IN
    SELECT *
    FROM (VALUES
      ('public', 'get_dashboard_stats', '(uuid)'),
      ('public', 'get_dashboard_time_series', '(uuid, text, integer)'),
      ('public', 'get_billing_insights', '(uuid, timestamp, timestamp)'),
      ('public', 'get_financial_overview', '(uuid)'),
      ('public', 'get_expense_summary', '(uuid)'),
      ('public', 'get_invoice_statistics', '(uuid)'),
      ('public', 'get_lease_financial_summary', '(uuid)'),
      ('public', 'get_leases_with_financial_analytics', '(uuid)'),
      ('public', 'get_maintenance_analytics', '(uuid)'),
      ('public', 'get_metric_trend', '(uuid, text, text)'),
      ('public', 'get_occupancy_trends_optimized', '(uuid, integer)'),
      ('public', 'get_property_performance_analytics', '(uuid, uuid, text, integer)'),
      ('public', 'get_property_performance_cached', '(uuid)'),
      ('public', 'get_property_performance_trends', '(uuid)'),
      ('public', 'get_property_performance_with_trends', '(uuid, text, integer)'),
      ('public', 'get_revenue_trends_optimized', '(uuid, integer)'),
      ('public', 'get_user_profile', '(uuid)'),
      ('public', 'get_user_sessions', '(uuid)'),
      ('public', 'get_user_dashboard_activities', '(text, integer, integer)'),
      ('public', 'get_user_plan_limits', '(text)'),
      ('public', 'search_properties', '(uuid, text, integer)'),
      ('public', 'sign_lease_and_check_activation', '(uuid, text, text, timestamptz, signature_method)'),
      ('public', 'revoke_user_session', '(uuid, uuid)'),
      ('public', 'log_user_error', '(text, text, text, text, jsonb, text, inet)'),
      ('public', 'check_user_feature_access', '(uuid, text)'),
      ('public', 'assert_can_create_lease', '(uuid, uuid)'),
      ('public', 'calculate_financial_metrics', '(uuid)'),
      ('public', 'calculate_maintenance_metrics', '(uuid, uuid, uuid, uuid)'),
      ('public', 'calculate_monthly_metrics', '(uuid)'),
      ('public', 'calculate_net_operating_income', '(uuid)'),
      ('public', 'get_lead_paint_compliance_report', '()')
    ) AS t(schema_name, func_name, args)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = func.schema_name AND p.proname = func.func_name
    ) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %I.%I%s FROM public, anon',
        func.schema_name, func.func_name, func.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I%s TO authenticated',
        func.schema_name, func.func_name, func.args);
    END IF;
  END LOOP;

  -- RLS helper functions (authenticated - used in policies)
  FOR func IN
    SELECT *
    FROM (VALUES
      ('public', 'get_current_owner_user_id', '()'),
      ('public', 'get_current_tenant_id', '()'),
      ('public', 'get_current_user_type', '()'),
      ('public', 'get_owner_lease_tenant_ids', '()'),
      ('public', 'get_tenant_lease_ids', '()'),
      ('public', 'get_tenant_property_ids', '()'),
      ('public', 'get_tenant_unit_ids', '()'),
      ('public', 'user_is_tenant', '()')
    ) AS t(schema_name, func_name, args)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = func.schema_name AND p.proname = func.func_name
    ) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %I.%I%s FROM public, anon',
        func.schema_name, func.func_name, func.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I%s TO authenticated',
        func.schema_name, func.func_name, func.args);
    END IF;
  END LOOP;

  -- Private schema helper functions (authenticated - used in policies)
  FOR func IN
    SELECT *
    FROM (VALUES
      ('private', 'get_my_stripe_customer_id', '()'),
      ('private', 'get_user_stripe_customer_id', '()')
    ) AS t(schema_name, func_name, args)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = func.schema_name AND p.proname = func.func_name
    ) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %I.%I%s FROM public, anon',
        func.schema_name, func.func_name, func.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I%s TO authenticated',
        func.schema_name, func.func_name, func.args);
    END IF;
  END LOOP;

  -- Stripe lookup functions (authenticated + service_role)
  FOR func IN
    SELECT *
    FROM (VALUES
      ('public', 'get_stripe_customer_by_user_id', '(uuid)'),
      ('public', 'get_user_id_by_stripe_customer', '(text)')
    ) AS t(schema_name, func_name, args)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = func.schema_name AND p.proname = func.func_name
    ) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %I.%I%s FROM public, anon',
        func.schema_name, func.func_name, func.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I%s TO authenticated, service_role',
        func.schema_name, func.func_name, func.args);
    END IF;
  END LOOP;
END $$;

-- Keep health_check public (for monitoring) - already has proper grants
