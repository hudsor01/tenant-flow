-- v3.0 Security Hardening, Phase 1 -- tighten 3 authenticated SECURITY DEFINER
-- functions flagged by the Supabase Security Advisor
-- (authenticated_security_definer_function_executable).
--
-- Applied to prod via Supabase MCP apply_migration; prod-assigned timestamp
-- 20260602202339 reconciled into this filename (migration-mcp-prod-drift).
--
-- ACL REALITY (verified live 2026-06-02 via aclexplode(proacl)): these three
-- functions carry a DIRECT `authenticated` EXECUTE grant, NOT an inherited PUBLIC
-- grant -- a prior migration (20251230240000 / 20251231063902) already revoked
-- PUBLIC and granted specific roles. So the load-bearing revoke is FROM
-- authenticated; a REVOKE FROM PUBLIC alone would be a no-op and leave the
-- function authenticated-executable. We REVOKE FROM PUBLIC defensively too
-- (idempotent; guards a future re-grant) and then FROM authenticated to actually
-- remove the grant. service_role is retained (re-granted idempotently).
--
--   * get_lead_paint_compliance_report(): no caller anywhere (0 frontend .rpc;
--     not in any policy/trigger/cron). Lock to service_role.
--   * assert_can_create_lease(uuid, uuid): ORPHANED -- the live
--     bulk_import_create_lease no longer calls it (it validates the lease
--     invariant inline) and no frontend reaches it. Single (uuid, uuid) signature,
--     owner postgres. Lock to service_role.
--   * audit_for_all_policies(text): admin schema-diagnostic; only a test calls it.
--     KEEP the authenticated grant but gate the body on public.is_admin() so a
--     non-admin signed-in account gets zero rows (no policy-inventory enumeration).
--     Stays advisor-flagged BY DESIGN (grant kept; the advisor checks grants, not
--     function bodies). Advisor authenticated_security_definer count: 46 -> 44.

-- TIGHTEN-01: get_lead_paint_compliance_report()
REVOKE EXECUTE ON FUNCTION public.get_lead_paint_compliance_report() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_lead_paint_compliance_report() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_lead_paint_compliance_report() TO service_role;

-- TIGHTEN-02: assert_can_create_lease(uuid, uuid) -- arg list mandatory
REVOKE EXECUTE ON FUNCTION public.assert_can_create_lease(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assert_can_create_lease(uuid, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.assert_can_create_lease(uuid, uuid) TO service_role;

-- TIGHTEN-03: audit_for_all_policies(text) -- add is_admin() body gate, keep grant
CREATE OR REPLACE FUNCTION public.audit_for_all_policies(p_role text)
 RETURNS TABLE(schemaname text, tablename text, policyname text, roles text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    pp.schemaname::text,
    pp.tablename::text,
    pp.policyname::text,
    pp.roles::text[]
  FROM pg_catalog.pg_policies pp
  WHERE public.is_admin()
    AND pp.cmd = 'ALL'
    AND pp.schemaname IN ('public', 'storage')
    AND pp.roles::text[] @> ARRAY[p_role];
$function$;
-- CREATE OR REPLACE preserves the existing grant; this re-GRANT is a deliberate
-- idempotent intent-pin (audit_for_all_policies stays authenticated-executable by
-- design -- the is_admin() body gate, not a revoke, closes the leak).
GRANT EXECUTE ON FUNCTION public.audit_for_all_policies(text) TO authenticated;
