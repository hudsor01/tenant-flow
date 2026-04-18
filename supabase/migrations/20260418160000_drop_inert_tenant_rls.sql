-- =============================================================================
-- migration: drop inert tenant-role RLS policies + orphaned rent infrastructure
-- purpose: the prior landlord-only refactor removed tenant authentication, so
--   any RLS branch checking `tenants.user_id = auth.uid()` or calling
--   `get_current_tenant_id()` / `get_tenant_unit_ids()` can never match a real
--   user. These branches are inert but confusing — remove them, rewrite
--   policies to owner-only, drop the helper functions.
--
--   Also drops payment_schedules: a rent-scheduling table missed in the
--   demolish migration (no code references, but an inert RLS policy still
--   existed on it).
--
-- preserves:
--   - tenants.user_id column (nullable; legacy rows keep their link)
--   - lease_tenants relationships (tenant-as-data-record join table)
--   - Owner RLS branches on every table
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop payment_schedules table (rent-related, no code references)
-- -----------------------------------------------------------------------------
drop table if exists public.payment_schedules cascade;

-- -----------------------------------------------------------------------------
-- 2. Rewrite RLS policies to remove inert tenant-user branches
-- -----------------------------------------------------------------------------

-- documents_select: drop the tenant-linkage branch
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- inspection_photos_select: drop tenant-linkage branch
drop policy if exists inspection_photos_select on public.inspection_photos;
create policy inspection_photos_select on public.inspection_photos
  for select
  to authenticated
  using (
    inspection_id in (
      select id from public.inspections
      where owner_user_id = (select auth.uid())
    )
  );

-- inspection_rooms_select: drop tenant-linkage branch
drop policy if exists inspection_rooms_select on public.inspection_rooms;
create policy inspection_rooms_select on public.inspection_rooms
  for select
  to authenticated
  using (
    inspection_id in (
      select id from public.inspections
      where owner_user_id = (select auth.uid())
    )
  );

-- inspections_select: drop tenant-linkage branch
drop policy if exists inspections_select on public.inspections;
create policy inspections_select on public.inspections
  for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- inspections_update: drop tenant-linkage branch
drop policy if exists inspections_update on public.inspections;
create policy inspections_update on public.inspections
  for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

-- properties_select: drop tenant-linkage branch
drop policy if exists properties_select on public.properties;
create policy properties_select on public.properties
  for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- property_images_select: drop tenant-linkage branch
drop policy if exists property_images_select on public.property_images;
create policy property_images_select on public.property_images
  for select
  to authenticated
  using (
    property_id in (
      select id from public.properties
      where owner_user_id = (select auth.uid())
    )
  );

-- units_select: drop tenant-linkage branch (no more get_tenant_unit_ids helper)
drop policy if exists units_select on public.units;
create policy units_select on public.units
  for select
  to authenticated
  using (owner_user_id = (select get_current_owner_user_id()));

-- tenants_select: drop the tenants.user_id and lease_tenants-linkage branches
-- (landlord is always the owner in landlord-only mode)
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- tenants_update: drop the tenants.user_id branch
drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants
  for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 3. Drop tenant-role helper functions (no longer referenced by any policy)
-- -----------------------------------------------------------------------------
drop function if exists public.get_current_tenant_id() cascade;
drop function if exists public.get_tenant_unit_ids() cascade;
