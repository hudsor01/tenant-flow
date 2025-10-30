-- Security Fix: Restrict SECURITY DEFINER functions to service_role only
-- Date: 2025-10-29
-- Issue: Multiple SECURITY DEFINER functions granted to authenticated users allow privilege escalation
-- Fix: Revoke authenticated access, grant only to service_role for backend-only functions

-- ============================================================================
-- Analytics RPC Functions (4 functions from 20250927_analytics_rpc_functions.sql)
-- ============================================================================
-- These functions are called only from backend via adminClient/service_role
-- Reference: apps/backend/src/modules/analytics/financial-analytics.service.ts
-- Reference: apps/backend/src/database/supabase.service.ts (rpcWithRetries uses adminClient)

-- Revoke from PUBLIC (PostgreSQL default grant)
REVOKE ALL ON FUNCTION calculate_financial_metrics(TEXT, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION calculate_maintenance_metrics(TEXT, TEXT, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION calculate_property_performance(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_dashboard_summary(TEXT) FROM PUBLIC;

-- Revoke from authenticated users
REVOKE ALL ON FUNCTION calculate_financial_metrics(TEXT, DATE, DATE) FROM authenticated;
REVOKE ALL ON FUNCTION calculate_maintenance_metrics(TEXT, TEXT, DATE, DATE) FROM authenticated;
REVOKE ALL ON FUNCTION calculate_property_performance(TEXT, TEXT, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION get_dashboard_summary(TEXT) FROM authenticated;

-- Grant only to service_role
GRANT EXECUTE ON FUNCTION calculate_financial_metrics(TEXT, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_maintenance_metrics(TEXT, TEXT, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_property_performance(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_summary(TEXT) TO service_role;

-- Add security comments
COMMENT ON FUNCTION calculate_financial_metrics(TEXT, DATE, DATE) IS 
'SECURITY: Backend-only function. Called via service_role from FinancialAnalyticsService. Takes p_user_id as parameter without auth.uid() validation - must only be callable by service_role.';

COMMENT ON FUNCTION calculate_maintenance_metrics(TEXT, TEXT, DATE, DATE) IS 
'SECURITY: Backend-only function. Called via service_role from MaintenanceInsightsService. Takes p_user_id as parameter without auth.uid() validation - must only be callable by service_role.';

COMMENT ON FUNCTION calculate_property_performance(TEXT, TEXT, TEXT) IS 
'SECURITY: Backend-only function. Called via service_role from FinancialAnalyticsService. Takes p_user_id as parameter without auth.uid() validation - must only be callable by service_role.';

COMMENT ON FUNCTION get_dashboard_summary(TEXT) IS 
'SECURITY: Backend-only function. Called via service_role from DashboardService. Takes p_user_id as parameter without auth.uid() validation - must only be callable by service_role.';

-- ============================================================================
-- NOTE: Maintenance Analytics RPC Functions (from 20250911_create_maintenance_analytics_rpc.sql)
-- ============================================================================
-- These functions (get_maintenance_performance_analytics, get_maintenance_cost_analytics,
-- get_maintenance_trend_analytics, get_maintenance_vendor_analytics) have not been applied
-- to this database yet. If/when that migration is applied, those functions should also be
-- restricted to service_role only using the same pattern as above.
-- 
-- For now, they are skipped to avoid errors.

-- ============================================================================
-- Summary
-- ============================================================================
-- Fixed 4 SECURITY DEFINER functions with privilege escalation vulnerabilities:
--   - calculate_financial_metrics(TEXT, DATE, DATE)
--   - calculate_maintenance_metrics(TEXT, TEXT, DATE, DATE)
--   - calculate_property_performance(TEXT, TEXT, TEXT)
--   - get_dashboard_summary(TEXT)
--
-- All functions now restricted to service_role execution only.
-- Backend services already use adminClient/service_role credentials via SupabaseService.rpcWithRetries()
--
-- Note: The following SECURITY DEFINER functions were NOT modified:
--   - handle_new_user() - Trigger function (no GRANT needed)
--   - get_database_performance_stats() - No GRANT statement (defaults to creator/admin)
--   - activate_tenant_from_auth_user() - Already fixed in 20251028120000_optimize_tenant_activation_function.sql
--   - Maintenance analytics functions (get_maintenance_performance_analytics, etc.) - Migration not yet applied to database
