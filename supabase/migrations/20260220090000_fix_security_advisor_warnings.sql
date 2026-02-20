-- =============================================================================
-- Migration: Fix Supabase Security Advisor Warnings
-- Created: 2026-02-20
-- Purpose: Address remaining Security Advisor warnings after RLS enablement:
--   1. Function search_path mutable: public.require_stripe_schema
--      Fix: Add SET search_path = '' to prevent search path injection
--   2. Duplicate index on public.leases
--      Fix: Drop idx_leases_lease_status (duplicate of idx_leases_status)
--   3. Multiple permissive policies on public.tenants
--      Root cause: 20251226163520 added new-style policies without removing
--      the base schema's old-style policies, creating 3 SELECT + 2 UPDATE +
--      2 service_role duplicates.
--      Fix: Drop all, recreate one clean set.
--   4. Multiple permissive policies on public.property_images
--      Root cause: Base schema has a FOR ALL service_role policy which the
--      Security Advisor counts as multiple permissive policies per operation.
--      Fix: Replace FOR ALL with explicit per-operation policies.
--   5. Multiple permissive policies on public.properties
--      Root cause: Same FOR ALL service_role policy pattern.
--      Fix: Replace FOR ALL with explicit per-operation policies.
-- Not fixed here (cannot fix via migration):
--   - stripe.refunds and stripe.setup_intents duplicate indexes: Stripe-managed
--   - Leaked Password Protection: Supabase Auth dashboard setting
-- =============================================================================

-- =============================================================================
-- 1. Fix function search_path mutable: public.require_stripe_schema
--    Adds SET search_path = '' to prevent malicious search path injection.
-- =============================================================================

create or replace function public.require_stripe_schema()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from pg_namespace where nspname = 'stripe'
  );
end;
$$;

comment on function public.require_stripe_schema() is
  'Returns true if stripe schema exists. Use in migrations: IF public.require_stripe_schema() THEN ... END IF;';

-- =============================================================================
-- 2. Drop duplicate index on public.leases
--    idx_leases_lease_status and idx_leases_status are both btree indexes on
--    the lease_status column. Dropping the older one (idx_leases_lease_status).
--    This reduces storage overhead and write amplification.
-- =============================================================================

drop index if exists public.idx_leases_lease_status;

-- =============================================================================
-- 3. Fix multiple permissive policies on public.tenants
--    Drop ALL existing policies from both the base schema and the avatar
--    migration, then recreate one clean non-overlapping set.
-- =============================================================================

-- Drop old-style policies from base schema (20251101000000)
drop policy if exists "tenants_select_own" on public.tenants;
drop policy if exists "tenants_insert_own" on public.tenants;
drop policy if exists "tenants_update_own" on public.tenants;
drop policy if exists "tenants_delete_own" on public.tenants;
drop policy if exists "tenants_service_role" on public.tenants;

-- Drop new-style policies added by avatar migration (20251226163520)
-- These were created without removing the old-style ones above.
drop policy if exists "Tenants can view their own tenant profile" on public.tenants;
drop policy if exists "Tenants can update their own tenant profile" on public.tenants;
drop policy if exists "Owners can view their tenants" on public.tenants;
drop policy if exists "Service role can manage all tenants" on public.tenants;

-- SELECT: tenants see their own profile; property owners see tenants on their
-- properties (via lease_tenants -> leases chain using owner_user_id).
create policy "tenants_select"
on public.tenants
for select
to authenticated
using (
  -- Tenant sees their own record
  user_id = (select auth.uid())
  or
  -- Owner sees tenants linked to their leases
  exists (
    select 1
    from public.lease_tenants lt
    join public.leases l on l.id = lt.lease_id
    where lt.tenant_id = tenants.id
      and l.owner_user_id = (select auth.uid())
  )
);

-- INSERT: tenant creates their own profile on registration
create policy "tenants_insert"
on public.tenants
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- UPDATE: tenant updates their own profile only
create policy "tenants_update"
on public.tenants
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- DELETE: tenant can delete their own record
create policy "tenants_delete"
on public.tenants
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Service role: explicit per-operation policies (no FOR ALL)
create policy "tenants_service_role_select"
on public.tenants
for select
to service_role
using (true);

create policy "tenants_service_role_insert"
on public.tenants
for insert
to service_role
with check (true);

create policy "tenants_service_role_update"
on public.tenants
for update
to service_role
using (true)
with check (true);

create policy "tenants_service_role_delete"
on public.tenants
for delete
to service_role
using (true);

-- =============================================================================
-- 4. Fix multiple permissive policies on public.property_images
--    Drop all existing policies and replace with explicit per-operation
--    policies. Notably, replaces the FOR ALL service_role policy and
--    consolidates the update policy to use auth.uid() consistently
--    (previous update policy used get_current_owner_user_id() while others
--    used auth.uid() directly).
-- =============================================================================

drop policy if exists "property_images_select_owner" on public.property_images;
drop policy if exists "property_images_insert_owner" on public.property_images;
drop policy if exists "property_images_update_owner" on public.property_images;
drop policy if exists "property_images_delete_owner" on public.property_images;
drop policy if exists "property_images_service_role" on public.property_images;

-- SELECT: owners can view images for their own properties
create policy "property_images_select_owner"
on public.property_images
for select
to authenticated
using (
  property_id in (
    select id
    from public.properties
    where owner_user_id = (select auth.uid())
      and status != 'inactive'
  )
);

-- INSERT: owners can add images to their own properties
create policy "property_images_insert_owner"
on public.property_images
for insert
to authenticated
with check (
  property_id in (
    select id
    from public.properties
    where owner_user_id = (select auth.uid())
      and status != 'inactive'
  )
);

-- UPDATE: owners can update image metadata for their properties
create policy "property_images_update_owner"
on public.property_images
for update
to authenticated
using (
  property_id in (
    select id
    from public.properties
    where owner_user_id = (select auth.uid())
      and status != 'inactive'
  )
)
with check (
  property_id in (
    select id
    from public.properties
    where owner_user_id = (select auth.uid())
      and status != 'inactive'
  )
);

-- DELETE: owners can delete images from their properties
create policy "property_images_delete_owner"
on public.property_images
for delete
to authenticated
using (
  property_id in (
    select id
    from public.properties
    where owner_user_id = (select auth.uid())
      and status != 'inactive'
  )
);

-- Service role: explicit per-operation (no FOR ALL)
create policy "property_images_service_role_select"
on public.property_images
for select
to service_role
using (true);

create policy "property_images_service_role_insert"
on public.property_images
for insert
to service_role
with check (true);

create policy "property_images_service_role_update"
on public.property_images
for update
to service_role
using (true)
with check (true);

create policy "property_images_service_role_delete"
on public.property_images
for delete
to service_role
using (true);

-- =============================================================================
-- 5. Fix multiple permissive policies on public.properties
--    Replace the FOR ALL service_role policy with explicit per-operation
--    policies. The four authenticated policies from the comprehensive fix
--    (20260103120000) are already clean and are left unchanged.
-- =============================================================================

-- Drop the FOR ALL service_role policy
drop policy if exists "properties_service_role" on public.properties;

-- Replace with explicit per-operation service_role policies
create policy "properties_service_role_select"
on public.properties
for select
to service_role
using (true);

create policy "properties_service_role_insert"
on public.properties
for insert
to service_role
with check (true);

create policy "properties_service_role_update"
on public.properties
for update
to service_role
using (true)
with check (true);

create policy "properties_service_role_delete"
on public.properties
for delete
to service_role
using (true);
