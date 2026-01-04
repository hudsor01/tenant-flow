-- Created: 2026-01-04
-- Purpose: Restore RLS for properties/units after enum migration dropped policies.
-- Scope: Properties + Units only (matches integration test coverage).

-- Re-enable RLS (idempotent)
alter table public.properties enable row level security;
alter table public.units enable row level security;

-- Drop existing policies (if any)
drop policy if exists "properties_delete_owner" on public.properties;
drop policy if exists "properties_insert_owner" on public.properties;
drop policy if exists "properties_select_owner" on public.properties;
drop policy if exists "properties_update_owner" on public.properties;
drop policy if exists "tenants_view_properties" on public.properties;

drop policy if exists "units_delete_owner" on public.units;
drop policy if exists "units_insert_owner" on public.units;
drop policy if exists "units_select" on public.units;
drop policy if exists "units_update_owner" on public.units;

-- Properties: owners can manage their own rows
create policy "properties_select_owner" on public.properties
for select to authenticated
using (owner_user_id = (select public.get_current_owner_user_id()));

create policy "properties_insert_owner" on public.properties
for insert to authenticated
with check (owner_user_id = (select public.get_current_owner_user_id()));

create policy "properties_update_owner" on public.properties
for update to authenticated
using (owner_user_id = (select public.get_current_owner_user_id()))
with check (owner_user_id = (select public.get_current_owner_user_id()));

create policy "properties_delete_owner" on public.properties
for delete to authenticated
using (owner_user_id = (select public.get_current_owner_user_id()));

-- Properties: tenants can view properties tied to their leases
create policy "tenants_view_properties" on public.properties
for select to authenticated
using (id in (select public.get_tenant_property_ids()));

-- Units: owners can manage their own units; tenants can view their unit(s)
create policy "units_select" on public.units
for select to authenticated
using (
  owner_user_id = (select public.get_current_owner_user_id())
  or id in (select public.get_tenant_unit_ids())
);

create policy "units_insert_owner" on public.units
for insert to authenticated
with check (
  owner_user_id = (select public.get_current_owner_user_id())
  and property_id in (
    select id from public.properties
    where owner_user_id = (select public.get_current_owner_user_id())
  )
);

create policy "units_update_owner" on public.units
for update to authenticated
using (
  owner_user_id = (select public.get_current_owner_user_id())
  and property_id in (
    select id from public.properties
    where owner_user_id = (select public.get_current_owner_user_id())
  )
)
with check (
  owner_user_id = (select public.get_current_owner_user_id())
  and property_id in (
    select id from public.properties
    where owner_user_id = (select public.get_current_owner_user_id())
  )
);

create policy "units_delete_owner" on public.units
for delete to authenticated
using (
  owner_user_id = (select public.get_current_owner_user_id())
  and property_id in (
    select id from public.properties
    where owner_user_id = (select public.get_current_owner_user_id())
  )
);
