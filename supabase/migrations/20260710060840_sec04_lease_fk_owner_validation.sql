-- SEC-04: prevent an owner from re-pointing a lease (or lease_tenants row) to
-- another owner's unit / tenant. RLS is row-level; leases_update_owner already
-- pins owner_user_id via USING/WITH CHECK, so validating the NEW FK against
-- new.owner_user_id cannot be spoofed. get_current_owner_user_id() = auth.uid().
--
-- Non-destructive by design: the UPDATE guards fire ONLY on an actual FK change
-- (IS DISTINCT FROM old), so any pre-existing cross-owner lease + its lease_tenants
-- rows stay updatable for non-FK edits. A plain WITH CHECK on the UPDATE policy
-- would reject every future update to those rows — not viable.

-- 1a. leases INSERT: also validate primary_tenant_id ownership. unit_id was
--     already validated by 20260506013951_harden_rls_validate_unit_ownership.
drop policy if exists leases_insert_owner on public.leases;
create policy leases_insert_owner
  on public.leases
  for insert
  to authenticated
  with check (
    owner_user_id = (select public.get_current_owner_user_id())
    and unit_id in (
      select u.id from public.units u
      where u.owner_user_id = (select public.get_current_owner_user_id())
    )
    and primary_tenant_id in (
      select t.id from public.tenants t
      where t.owner_user_id = (select public.get_current_owner_user_id())
    )
  );

-- 1b. lease_tenants INSERT: also validate tenant_id ownership (previously only
--     the parent lease was checked).
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
    and exists (
      select 1 from public.tenants t
      where t.id = lease_tenants.tenant_id
        and t.owner_user_id = (select auth.uid())
    )
  );

-- 2a. leases UPDATE guard: reject re-pointing unit_id / primary_tenant_id to a
--     unit/tenant not owned by the lease's owner. Fires only on an FK change.
create or replace function public.reject_cross_owner_lease_fk()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.unit_id is distinct from old.unit_id
     and new.unit_id is not null
     and not exists (
       select 1 from public.units u
       where u.id = new.unit_id
         and u.owner_user_id = new.owner_user_id
     )
  then
    raise exception 'Cannot assign a unit owned by a different account to this lease'
      using errcode = '42501',
        detail = 'The new unit_id must reference a unit owned by the lease owner (owner_user_id).';
  end if;

  if new.primary_tenant_id is distinct from old.primary_tenant_id
     and new.primary_tenant_id is not null
     and not exists (
       select 1 from public.tenants t
       where t.id = new.primary_tenant_id
         and t.owner_user_id = new.owner_user_id
     )
  then
    raise exception 'Cannot assign a tenant owned by a different account to this lease'
      using errcode = '42501',
        detail = 'The new primary_tenant_id must reference a tenant owned by the lease owner (owner_user_id).';
  end if;

  return new;
end;
$$;

drop trigger if exists reject_cross_owner_lease_fk_before_update on public.leases;
create trigger reject_cross_owner_lease_fk_before_update
  before update on public.leases
  for each row
  execute function public.reject_cross_owner_lease_fk();

comment on function public.reject_cross_owner_lease_fk() is
  'SEC-04: BEFORE UPDATE guard on leases — rejects re-pointing unit_id or primary_tenant_id to a unit/tenant not owned by the lease owner. Fires only on an actual FK change (IS DISTINCT FROM old), so pre-existing cross-owner rows stay updatable for non-FK edits.';

-- 2b. lease_tenants UPDATE guard: reject re-pointing tenant_id to a tenant not
--     owned by the parent lease's owner.
create or replace function public.reject_cross_owner_lease_tenant_fk()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.tenant_id is distinct from old.tenant_id
     and not exists (
       select 1
       from public.tenants t
       join public.leases l on l.id = new.lease_id
       where t.id = new.tenant_id
         and t.owner_user_id = l.owner_user_id
     )
  then
    raise exception 'Cannot assign a tenant owned by a different account to this lease'
      using errcode = '42501',
        detail = 'The new tenant_id must reference a tenant owned by the parent lease owner.';
  end if;

  return new;
end;
$$;

drop trigger if exists reject_cross_owner_lease_tenant_fk_before_update on public.lease_tenants;
create trigger reject_cross_owner_lease_tenant_fk_before_update
  before update on public.lease_tenants
  for each row
  execute function public.reject_cross_owner_lease_tenant_fk();

comment on function public.reject_cross_owner_lease_tenant_fk() is
  'SEC-04: BEFORE UPDATE guard on lease_tenants — rejects re-pointing tenant_id to a tenant not owned by the parent lease owner. Fires only on an actual FK change (IS DISTINCT FROM old).';

-- These are trigger-only SECURITY DEFINER functions — never called directly as
-- RPCs. Revoke the default PUBLIC EXECUTE so anon/authenticated cannot invoke
-- them via /rest/v1/rpc (matches reject_signed_lease_term_edits; clears the
-- anon_security_definer_function_executable advisor). The trigger still fires.
revoke execute on function public.reject_cross_owner_lease_fk() from public;
revoke execute on function public.reject_cross_owner_lease_tenant_fk() from public;
