-- Pass 3 of the SECURITY DEFINER lockdown -- closes the two functions that
-- passes 1 (20260529224926) and 2 (20260529225039) intentionally skipped,
-- after re-verifying the skip-reasoning against the live schema and disproving
-- both assumptions.
--
--   * is_admin(): pass 2 kept it PUBLIC on the assumption "RLS needs to call it
--     from any role, including anon." Not true here: every policy that calls
--     is_admin() is scoped to the `authenticated` role only -- blogs_insert_admin,
--     blogs_update_admin, blogs_delete_admin, email_deliverability_admin_select,
--     "admins can read gate_events", onboarding_funnel_events_admin_select (6
--     policies, all {authenticated}). anon never evaluates an is_admin() policy,
--     so the PUBLIC grant is pure attack surface: a direct PostgREST /rpc/is_admin
--     probe that leaks function existence and only ever returns false for anon.
--     Every SECURITY DEFINER function that calls is_admin() internally invokes it
--     as the function owner (not the caller) and is itself not anon-executable, so
--     revoking anon is inert for them. authenticated KEEPS EXECUTE so RLS evaluation
--     for signed-in users is unchanged -- which means is_admin stays flagged as
--     `authenticated_security_definer_function_executable` BY DESIGN (that lint is
--     expected for any SECURITY DEFINER function authenticated must reach via RLS).
--     Pass 3 only clears the *anon*-executable lint, not the authenticated one.
--
--   * log_lease_signature_activity(): pass 2 kept it PUBLIC on "trigger function,
--     EXECUTE is moot." Trigger firing indeed bypasses EXECUTE checks, but the
--     function has NO trigger currently attached (orphaned) and the PUBLIC grant
--     still places it on the role surface the Security Advisor flags. It returns
--     `trigger` so PostgREST will not expose it. With no anon and no authenticated
--     grant and no trigger attached, it drops out of the advisor entirely.
--
-- REVOKE FROM PUBLIC is load-bearing: Postgres auto-grants EXECUTE to PUBLIC at
-- function creation and anon inherits it, so a bare REVOKE FROM anon is a no-op
-- while the PUBLIC grant stands. Each block revokes PUBLIC then re-grants the
-- roles that legitimately need it.

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_lease_signature_activity() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_lease_signature_activity() TO service_role;
