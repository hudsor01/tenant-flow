-- Fix RLS recursion for leases <-> lease_tenants (owner_user_id schema)
--
-- Current policies reference each other via subqueries:
--   leases_select -> reads lease_tenants
--   lease_tenants_select -> reads leases
--
-- Under some query plans (including INSERT ... RETURNING via PostgREST),
-- Postgres can detect this as infinite recursion and abort.
--
-- Fix: use SECURITY DEFINER helper functions inside policies so the subqueries
-- bypass RLS evaluation and do not re-enter policy checks.

BEGIN;

-- Drop recursive policies
DROP POLICY IF EXISTS leases_select ON public.leases;
DROP POLICY IF EXISTS lease_tenants_select ON public.lease_tenants;

-- ----------------------------------------------------------------------------
-- SECURITY DEFINER helpers (bypass RLS inside policy checks)
-- ----------------------------------------------------------------------------

-- Existing helper for tenants (kept, but ensure it exists and is executable):
--   public.get_tenant_lease_ids() -> SETOF uuid

-- Owner helper: return lease_tenants IDs for leases owned by current owner.
-- Replaces the older property_owner_id-based implementation.
CREATE OR REPLACE FUNCTION public.get_owner_lease_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT DISTINCT lt.id
  FROM public.lease_tenants lt
  JOIN public.leases l ON l.id = lt.lease_id
  WHERE l.owner_user_id = public.get_current_owner_user_id();
$function$;

REVOKE ALL ON FUNCTION public.get_owner_lease_tenant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_lease_tenant_ids() TO authenticated;

-- Ensure tenant helper is callable by authenticated (policies call it).
REVOKE ALL ON FUNCTION public.get_tenant_lease_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_lease_ids() TO authenticated;

-- ----------------------------------------------------------------------------
-- Non-recursive RLS policies
-- ----------------------------------------------------------------------------

CREATE POLICY leases_select
ON public.leases
FOR SELECT
TO authenticated
USING (
  (owner_user_id = public.get_current_owner_user_id())
  OR (id IN (SELECT public.get_tenant_lease_ids()))
);

CREATE POLICY lease_tenants_select
ON public.lease_tenants
FOR SELECT
TO authenticated
USING (
  (tenant_id = public.get_current_tenant_id())
  OR (id IN (SELECT public.get_owner_lease_tenant_ids()))
);

COMMIT;

