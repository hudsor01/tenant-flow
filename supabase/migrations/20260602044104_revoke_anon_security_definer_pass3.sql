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
--     The 6 SECURITY DEFINER functions that call is_admin() internally invoke it
--     as the function owner (not the caller) and are themselves not anon-executable,
--     so revoking anon is inert for them. authenticated keeps EXECUTE, so RLS
--     evaluation for signed-in users is unchanged.
--
--   * log_lease_signature_activity(): pass 2 kept it PUBLIC on "trigger function,
--     EXECUTE is moot." Trigger firing indeed bypasses EXECUTE checks, but the
--     function has NO trigger currently attached (orphaned) and the PUBLIC grant
--     still places it on the role surface the Security Advisor flags. It returns
--     `trigger` so PostgREST will not expose it, but the grant is removed for
--     hygiene and to clear the advisor finding.
--
-- REVOKE FROM PUBLIC is load-bearing: Postgres auto-grants EXECUTE to PUBLIC at
-- function creation and anon inherits it, so a bare REVOKE FROM anon is a no-op
-- while the PUBLIC grant stands. Each block revokes PUBLIC then re-grants the
-- roles that legitimately need it.

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_lease_signature_activity() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_lease_signature_activity() TO service_role;
