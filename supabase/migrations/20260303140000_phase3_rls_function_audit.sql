-- migration: phase 3 — RLS helper function audit and hot path fixes
-- purpose: audit all RLS helper functions for query plan efficiency. fix any
--          functions or policies that cause unnecessary table lookups or seq scans.
--
-- audit findings:
--
--   1. get_current_owner_user_id() — OPTIMAL
--      current: returns (select auth.uid()) directly
--      no DB lookup. trivial. fixed in 20260224191923.
--
--   2. get_current_tenant_id() — OPTIMAL
--      current: SELECT id FROM tenants WHERE user_id = (SELECT auth.uid())
--      uses idx_tenants_user_id (btree on user_id). single-row lookup.
--      expected plan: Index Scan using idx_tenants_user_id on tenants
--
--   3. get_tenant_lease_ids() — OPTIMAL
--      current: SELECT DISTINCT lt.lease_id FROM lease_tenants lt
--               WHERE lt.tenant_id = get_current_tenant_id()
--      uses idx_lease_tenants_tenant_id (btree on tenant_id). small result set.
--      expected plan: Index Scan using idx_lease_tenants_tenant_id
--
--   4. get_tenant_unit_ids() — OPTIMAL
--      chains: lease_tenants(tenant_id) → leases(id) via PK
--      all joins use indexed columns (tenant_id index + leases PK).
--
--   5. get_tenant_property_ids() — OPTIMAL
--      chains: lease_tenants(tenant_id) → leases(id) → units(id) via PKs
--      all joins use indexed columns.
--
--   6. is_admin() — OPTIMAL
--      reads JWT app_metadata only. no DB hit. SECURITY INVOKER.
--
--   7. get_owner_lease_tenant_ids() — ACCEPTABLE
--      current: SELECT lt.id FROM lease_tenants lt JOIN leases l ON l.id = lt.lease_id
--               WHERE l.owner_user_id = get_current_owner_user_id()
--      since get_current_owner_user_id() = auth.uid(), this resolves to:
--               WHERE l.owner_user_id = auth.uid()
--      uses idx_leases_owner_status (leading column owner_user_id) + lease_tenants FK.
--      expected plan: Index Scan on leases → Nested Loop → Index Scan on lease_tenants
--
--   8. get_current_property_owner_id() — SUBOPTIMAL (hot path fix below)
--      current: SELECT id FROM stripe_connected_accounts WHERE user_id = auth.uid()
--      this function still queries stripe_connected_accounts on every call.
--      used by the unfixed lease_tenants_insert_owner policy.
--      the 98K seq scans reported in the optimization plan were partially from this
--      function being called by the OLD get_current_owner_user_id() (now fixed),
--      but it's still called by lease_tenants_insert_owner.
--
-- fixes applied in this migration:
--   1. rewrite lease_tenants_insert_owner policy to use owner_user_id = auth.uid()
--      instead of the old property_owner_id = get_current_property_owner_id() path.
--      this eliminates the stripe_connected_accounts lookup on every INSERT.

-- ============================================================================
-- fix 1: rewrite lease_tenants_insert_owner to avoid stripe_connected_accounts lookup
-- ============================================================================
-- the original policy (from base_schema, never updated) was:
--   WITH CHECK (EXISTS (
--     SELECT 1 FROM leases l
--     WHERE l.id = lease_tenants.lease_id
--       AND l.property_owner_id = get_current_property_owner_id()
--   ))
--
-- property_owner_id was renamed to owner_user_id.
-- get_current_property_owner_id() returns stripe_connected_accounts.id (DB lookup).
-- get_current_owner_user_id() returns auth.uid() directly (no DB lookup).
-- since owner_user_id now stores the user's UUID (not the stripe account UUID),
-- we use (select auth.uid()) directly for maximum performance.
--
-- this is the SAME pattern used by all other owner-related policies
-- (properties_insert_owner, leases_insert_owner, etc.) since the
-- owner_user_id migration.

drop policy if exists "lease_tenants_insert_owner" on public.lease_tenants;

create policy "lease_tenants_insert_owner"
on public.lease_tenants
for insert
to authenticated
with check (
  exists (
    select 1 from public.leases l
    where l.id = lease_tenants.lease_id
      and l.owner_user_id = (select auth.uid())
  )
);

comment on policy "lease_tenants_insert_owner" on public.lease_tenants is
  'Owners can insert lease_tenants for their own leases. '
  'Uses owner_user_id = auth.uid() directly (no stripe_connected_accounts lookup). '
  'Fixed in phase 3 RLS audit (20260303140000).';

-- ============================================================================
-- fix 2: rewrite get_owner_lease_tenant_ids() to use auth.uid() directly
-- ============================================================================
-- the function currently calls get_current_owner_user_id() which is trivial
-- (returns auth.uid()), but the extra function call adds overhead on every
-- lease_tenants policy evaluation. inline the auth.uid() call directly.
-- also set search_path = 'public' for consistency with the policy fix above.

create or replace function public.get_owner_lease_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select distinct lt.id
  from public.lease_tenants lt
  join public.leases l on l.id = lt.lease_id
  where l.owner_user_id = (select auth.uid());
$$;

comment on function public.get_owner_lease_tenant_ids() is
  'Returns lease_tenant IDs for leases owned by the current user. '
  'Used by lease_tenants SELECT/UPDATE/DELETE RLS policies. '
  'Optimized: uses auth.uid() directly instead of get_current_owner_user_id() wrapper.';

-- preserve existing grants
revoke all on function public.get_owner_lease_tenant_ids() from public;
grant execute on function public.get_owner_lease_tenant_ids() to authenticated;
grant execute on function public.get_owner_lease_tenant_ids() to service_role;
