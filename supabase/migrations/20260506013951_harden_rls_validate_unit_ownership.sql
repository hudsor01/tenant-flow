-- Tighten INSERT RLS on maintenance_requests and leases to validate that
-- the referenced unit_id (and therefore property_id transitively) is owned
-- by the inserter — not just that owner_user_id matches.
--
-- Pre-fix: WITH CHECK (owner_user_id = caller). An attacker could insert
-- a maintenance_request or lease with their own owner_user_id but a
-- unit_id belonging to a different owner. The row would be invisible to
-- the unit's real owner (RLS SELECT keys on owner_user_id), but it
-- pollutes the inserter's audit trail with orphan unit references and
-- creates an avenue to enumerate other owners' unit IDs (see if INSERT
-- succeeds vs FK error).
--
-- Surfaced by the integration suite:
--   - tests/integration/rls/maintenance.rls.test.ts
--     `owner B cannot insert a maintenance request for owner A unit`
--   - tests/integration/rls/leases.rls.test.ts
--     `owner B cannot insert a lease under owner A unit`
--
-- Post-fix: WITH CHECK additionally requires unit_id IN (units owned by
-- caller). Same pattern as the existing tenant_invitations.unit_id guard.

-- =============================================================================
-- maintenance_requests INSERT: validate unit_id ownership
-- =============================================================================
DROP POLICY IF EXISTS maintenance_requests_insert_owner ON public.maintenance_requests;

CREATE POLICY maintenance_requests_insert_owner
  ON public.maintenance_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT public.get_current_owner_user_id())
    AND unit_id IN (
      SELECT u.id
      FROM public.units u
      WHERE u.owner_user_id = (SELECT public.get_current_owner_user_id())
    )
  );

-- =============================================================================
-- leases INSERT: validate unit_id ownership
-- =============================================================================
DROP POLICY IF EXISTS leases_insert_owner ON public.leases;

CREATE POLICY leases_insert_owner
  ON public.leases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT public.get_current_owner_user_id())
    AND unit_id IN (
      SELECT u.id
      FROM public.units u
      WHERE u.owner_user_id = (SELECT public.get_current_owner_user_id())
    )
  );
