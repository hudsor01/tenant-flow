-- Phase 4 cycle-2 fix: `audit_for_all_policies` returned 42501 "permission
-- denied for function" when called by `authenticated` via PostgREST RPC.
-- The function had only `postgres:EXECUTE` because a prior migration
-- explicitly REVOKEd the default Supabase auto-grants.
--
-- Canonical Supabase 2026 pattern (per supabase.com/docs/guides/database):
--   1. SECURITY DEFINER + `set search_path = ''` (empty) + fully-qualified
--      schema references (pg_catalog.pg_policies, not bare pg_policies).
--   2. GRANT EXECUTE TO authenticated explicitly -- the in-function logic
--      handles authorization (this function is read-only against system
--      catalogs that are already readable by authenticated, so no extra gate
--      is needed; the RPC just opens the PostgREST door).
--
-- Re-runnable: CREATE OR REPLACE updates the body; the GRANT is idempotent.
CREATE OR REPLACE FUNCTION public.audit_for_all_policies(p_role text)
RETURNS TABLE(
  schemaname text,
  tablename text,
  policyname text,
  roles text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    pp.schemaname::text,
    pp.tablename::text,
    pp.policyname::text,
    pp.roles::text[]
  FROM pg_catalog.pg_policies pp
  WHERE pp.cmd = 'ALL'
    AND pp.schemaname IN ('public', 'storage')
    AND pp.roles::text[] @> ARRAY[p_role];
$function$;

GRANT EXECUTE ON FUNCTION public.audit_for_all_policies(text) TO authenticated;
