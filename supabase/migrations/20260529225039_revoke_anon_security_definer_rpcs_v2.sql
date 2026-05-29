-- Pass 2 of the SECURITY DEFINER lockdown -- defense-in-depth follow-up.
--
-- Pass 1 (`20260529224926_revoke_anon_security_definer_rpcs.sql`) closed the
-- two IDOR vectors. This pass revokes EXECUTE from the remaining 20
-- SECURITY DEFINER functions in `public` that the Security Advisor flagged
-- as anon-executable. Each function below already gates on `auth.uid()`
-- (or `is_admin()`) internally, so an anon caller currently just wastes
-- cycles tripping the exception. Closing the gate at the role level removes
-- the noise and removes the function-existence leak from error responses.
--
-- The `REVOKE FROM PUBLIC` pattern is load-bearing. Postgres auto-grants
-- EXECUTE to PUBLIC at function creation; anon (and every other role)
-- inherits from PUBLIC. A bare `REVOKE FROM anon` is a no-op while the
-- PUBLIC grant exists. Every block below revokes from PUBLIC and re-grants
-- to authenticated + service_role so legitimate callers keep working.
--
-- Intentionally NOT touched here (kept public by design):
--   * `is_admin()` -- used inside RLS policy evaluation contexts. RLS needs
--     to be able to call this from any role, including anon. Returns false
--     for anon because `auth.uid()` is null.
--   * `log_lease_signature_activity()` -- trigger function. Trigger
--     execution does not go through EXECUTE checks, so the GRANT is moot.

-- Self-targeting (no user-identifying param; reads auth.uid() directly):
REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion()  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.cancel_account_deletion()  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_invoices(integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_invoices(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated, service_role;

-- Owner-id-parameterized (each gates on `p_*_id = (select auth.uid())`):
REVOKE EXECUTE ON FUNCTION public.get_billing_insights(uuid, timestamp, timestamp) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_billing_insights(uuid, timestamp, timestamp) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_data_v2(uuid)            FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_data_v2(uuid)            TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats(uuid)              FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_stats(uuid)              TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_time_series(uuid, text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_time_series(uuid, text, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_financial_overview(uuid)           FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_financial_overview(uuid)           TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_lease_stats(uuid)                  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_lease_stats(uuid)                  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_maintenance_stats(uuid)            FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_maintenance_stats(uuid)            TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_metric_trend(uuid, text, text)     FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_metric_trend(uuid, text, text)     TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_occupancy_trends_optimized(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_occupancy_trends_optimized(uuid, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_property_performance_cached(uuid)  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_property_performance_cached(uuid)  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_revenue_trends_optimized(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_revenue_trends_optimized(uuid, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_subscription_status(text)          FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_subscription_status(text)          TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_profile(uuid)                 FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_profile(uuid)                 TO authenticated, service_role;

-- Admin-gated aggregates (each gates on `is_admin()` or `public.is_admin()`):
REVOKE EXECUTE ON FUNCTION public.get_deliverability_stats(integer)      FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_deliverability_stats(integer)      TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_funnel_stats(timestamptz, timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_funnel_stats(timestamptz, timestamptz) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_gate_conversion_stats(integer)     FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_gate_conversion_stats(integer)     TO authenticated, service_role;
