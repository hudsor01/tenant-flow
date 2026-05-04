-- Drop the redundant FOR ALL TO service_role policy on public.app_config.
-- Reason: service_role has BYPASSRLS, so the policy never enforced anything.
-- The repo's RLS audit test (tests/integration/rls/for-all-audit.test.ts)
-- treats any non-allowlisted service_role FOR ALL policy as a defect — this
-- migration unblocks rls-security CI on PR #664.
--
-- Reads from public.app_config still work for:
--   - The 5 SECURITY DEFINER trigger functions (run as the function owner with
--     BYPASSRLS, so RLS does not apply to their SELECTs).
--   - Direct service_role API access (BYPASSRLS again).
--   - Operators using Supabase MCP / SQL Editor as `postgres` (BYPASSRLS).
-- No callers need a policy to access this table.

DROP POLICY IF EXISTS "Service role only" ON public.app_config;

-- Leave RLS ENABLED on the table so anon/authenticated role queries return
-- empty (deny-by-default) rather than 401. Only privileged roles (service_role
-- via API + postgres via SQL Editor + the BYPASSRLS-bearing function-owner
-- inside SECURITY DEFINER triggers) reach the rows.

COMMENT ON TABLE public.app_config IS
    'Service-role-only key/value config. RLS is enabled with no policies — anon/authenticated SELECTs return zero rows. Reads happen via SECURITY DEFINER trigger functions (notify_n8n_*, notify_critical_error) and direct service_role / postgres / supabase_admin connections, all of which bypass RLS.';
