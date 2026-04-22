-- lease_tenants RLS gap — add SELECT/UPDATE/DELETE policies for owners.
--
-- Surfaced by the bulk-import RPC integration test: lease_tenants has
-- RLS force-enabled but only an INSERT policy. Authenticated owners
-- cannot SELECT from the table at all, even via parent-table joins
-- (PostgREST `leases(*, lease_tenants(...))` returns empty arrays for
-- the joined data).
--
-- Why this didn't bite production yet: the table was effectively unused
-- before v2.3 — no UI surface inserted into it from the frontend, and
-- the tenant detail view's `TENANT_WITH_LEASE_SELECT` join was silently
-- returning empty `lease_tenants` arrays without anyone noticing.
--
-- All three new policies use the same scoping: owner of the parent lease
-- has access. Mirrors the existing INSERT policy (lease_tenants_insert_owner).

begin;

drop policy if exists "lease_tenants_select_owner" on public.lease_tenants;
create policy "lease_tenants_select_owner"
  on public.lease_tenants for select to authenticated
  using (
    exists (
      select 1 from public.leases l
      where l.id = lease_tenants.lease_id
        and l.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "lease_tenants_update_owner" on public.lease_tenants;
create policy "lease_tenants_update_owner"
  on public.lease_tenants for update to authenticated
  using (
    exists (
      select 1 from public.leases l
      where l.id = lease_tenants.lease_id
        and l.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.leases l
      where l.id = lease_tenants.lease_id
        and l.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "lease_tenants_delete_owner" on public.lease_tenants;
create policy "lease_tenants_delete_owner"
  on public.lease_tenants for delete to authenticated
  using (
    exists (
      select 1 from public.leases l
      where l.id = lease_tenants.lease_id
        and l.owner_user_id = (select auth.uid())
    )
  );

commit;
