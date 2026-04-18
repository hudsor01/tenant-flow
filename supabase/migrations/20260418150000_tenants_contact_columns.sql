-- =============================================================================
-- migration: tenants contact columns + owner ownership for landlord-only mode
-- purpose: make tenants a self-contained data record with contact info on the
--   row, owned by the landlord. Previously contact info lived on users (joined
--   via tenants.user_id). Post-demolish, tenants may have no user_id at all.
-- =============================================================================

alter table public.tenants
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists status text
    check (status in ('active','inactive','pending','moved_out'))
    default 'active' not null,
  add column if not exists owner_user_id uuid references public.users(id) on delete cascade;

-- Backfill contact fields from users for rows that already have user_id
update public.tenants t
set first_name = u.first_name,
    last_name = u.last_name,
    name = u.full_name,
    email = u.email,
    phone = u.phone
from public.users u
where t.user_id = u.id
  and t.first_name is null;

-- Backfill owner_user_id from lease_tenants -> leases.owner_user_id (first lease wins)
update public.tenants t
set owner_user_id = sub.owner_user_id
from (
  select distinct on (lt.tenant_id)
    lt.tenant_id,
    l.owner_user_id
  from public.lease_tenants lt
  join public.leases l on l.id = lt.lease_id
  order by lt.tenant_id, lt.created_at asc
) sub
where t.id = sub.tenant_id
  and t.owner_user_id is null;

create index if not exists tenants_email_idx on public.tenants(email);
create index if not exists tenants_status_idx on public.tenants(status);
create index if not exists tenants_owner_user_id_idx on public.tenants(owner_user_id);

-- =============================================================================
-- RLS: replace existing policies to support landlord-managed tenants
-- Old model: user_id = auth.uid() (required tenant to own their record)
-- New model: owner_user_id = auth.uid() (landlord owns the tenant record).
-- A tenant may also read their own row if they have a linked auth account.
-- =============================================================================

drop policy if exists tenants_select on public.tenants;
drop policy if exists tenants_insert on public.tenants;
drop policy if exists tenants_update on public.tenants;
drop policy if exists tenants_delete on public.tenants;

create policy tenants_select on public.tenants
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.lease_tenants lt
      join public.leases l on l.id = lt.lease_id
      where lt.tenant_id = tenants.id
        and l.owner_user_id = (select auth.uid())
    )
  );

create policy tenants_insert on public.tenants
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
  );

create policy tenants_update on public.tenants
  for update to authenticated
  using (
    owner_user_id = (select auth.uid())
    or user_id = (select auth.uid())
  )
  with check (
    owner_user_id = (select auth.uid())
    or user_id = (select auth.uid())
  );

create policy tenants_delete on public.tenants
  for delete to authenticated
  using (
    owner_user_id = (select auth.uid())
  );
