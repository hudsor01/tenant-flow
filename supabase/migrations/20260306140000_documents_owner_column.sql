-- migration: 20260306140000_documents_owner_column.sql
-- purpose: Add owner_user_id column to documents table for direct ownership RLS checks (DB-02)
-- affected tables: documents
-- special considerations:
--   - Replaces slow JOIN-based RLS via get_current_property_owner_id() with direct column check
--   - Backfills from 4 parent entity types: lease, property, maintenance_request, inspection
--   - Drops get_current_property_owner_id() function (no longer needed after this migration)

-- ============================================================================
-- 1. add owner_user_id column
-- ============================================================================
alter table public.documents
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

-- ON DELETE SET NULL: documents survive owner deletion (GDPR anonymization handles cleanup separately)

-- ============================================================================
-- 2. backfill owner_user_id from parent entities
--    documents uses polymorphic entity_type/entity_id pattern
-- ============================================================================

-- from leases
update public.documents d
set owner_user_id = l.owner_user_id
from public.leases l
where d.entity_type = 'lease'
  and d.entity_id = l.id
  and d.owner_user_id is null;

-- from properties
update public.documents d
set owner_user_id = p.owner_user_id
from public.properties p
where d.entity_type = 'property'
  and d.entity_id = p.id
  and d.owner_user_id is null;

-- from maintenance_requests
update public.documents d
set owner_user_id = mr.owner_user_id
from public.maintenance_requests mr
where d.entity_type = 'maintenance_request'
  and d.entity_id = mr.id
  and d.owner_user_id is null;

-- from inspections
update public.documents d
set owner_user_id = i.owner_user_id
from public.inspections i
where d.entity_type = 'inspection'
  and d.entity_id = i.id
  and d.owner_user_id is null;

-- ============================================================================
-- 3. index for RLS performance
-- ============================================================================
create index if not exists idx_documents_owner_user_id
  on public.documents(owner_user_id);

-- ============================================================================
-- 4. rewrite RLS policies
--    existing policies (from pg_policies): documents_select, documents_insert_owner,
--    documents_update_owner, documents_delete_owner
--    all currently use get_current_property_owner_id() with slow JOINs through
--    properties/maintenance_requests tables
-- ============================================================================

-- drop all existing document policies
drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_insert_owner" on public.documents;
drop policy if exists "documents_update_owner" on public.documents;
drop policy if exists "documents_delete_owner" on public.documents;

-- SELECT: owner sees all their docs, tenant sees docs attached to their leases
-- NOTE: Tenant access is intentionally limited to lease-type documents only.
-- Documents with entity_type of inspection, maintenance_request, or property are
-- owner-managed. Tenants access those entities through their lease relationship
-- but do not need direct document access for them. The backfill populates
-- owner_user_id from all 4 entity types for owner RLS, but the tenant SELECT
-- path only joins through lease_tenants. This is by design, not an oversight.
create policy "documents_select" on public.documents
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or entity_id in (
      select lt.lease_id from public.lease_tenants lt
      join public.tenants t on t.id = lt.tenant_id
      where t.user_id = (select auth.uid())
    )
  );

-- INSERT: owner only
create policy "documents_insert_owner" on public.documents
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

-- UPDATE: owner only
create policy "documents_update_owner" on public.documents
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

-- DELETE: owner only
create policy "documents_delete_owner" on public.documents
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

-- ============================================================================
-- 5. drop get_current_property_owner_id() -- no longer referenced by any policy or function
--    this function performed a slow lookup through stripe_connected_accounts
--    all document RLS now uses direct owner_user_id = (select auth.uid()) check
-- ============================================================================
drop function if exists public.get_current_property_owner_id();

-- ============================================================================
-- verification: documents.owner_user_id column exists, index exists,
-- 4 RLS policies created with direct owner_user_id checks
-- ============================================================================
