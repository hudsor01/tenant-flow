-- v2.3 audit follow-ups — document vault + bulk-import hardening.
--
-- This migration closes findings from the exhaustive v2.3 code review:
--
--   C1 — tenant-documents bucket creation is idempotent (fresh DB replays
--        of Phase 57 were a silent no-op because the bucket UPSERT was
--        missing).
--   H7 — adds an UPDATE policy on storage.objects so future upsert-style
--        replaces don't fail RLS silently.
--   H8 — tightens INSERT/SELECT/DELETE/UPDATE path checks to require exactly
--        two segments and a UUID-shaped entity_id, preventing off-convention
--        paths like `property/<id>/junk/<file>` from passing RLS.
--   H12 — composite index on (entity_type, entity_id, created_at desc) so
--        the list query stops sorting after filter at scale.
--   C5 — nightly orphan-document cleanup via pg_cron (hard-deleted parent
--        entities leave documents rows with dangling entity_id; blob-level
--        reconciliation is a separate concern).
--   C3 — SECURITY DEFINER RPC for atomic (leases + lease_tenants) insert
--        used by the bulk-import flow. Prevents orphan leases that don't
--        surface on the tenant view.

begin;

-- ============================================================================
-- C1: tenant-documents bucket — idempotent create + config
-- ============================================================================
-- Earlier Phase 57 migration only ran `update storage.buckets` assuming the
-- bucket pre-existed. Fresh envs had an empty storage.buckets row for
-- 'tenant-documents', so the update was a no-op and every upload failed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-documents',
  'tenant-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- H8: Tighten path validation on existing policies (INSERT/SELECT/DELETE)
-- H7: Add UPDATE policy so future upsert replaces don't fail RLS silently
-- ============================================================================
-- Path convention: {entity_type}/{entity_id}/{timestamp}-{safeName}.
-- The audit flagged that without array_length and UUID format checks, paths
-- like `property/<id>/junk/<file>` would pass RLS. Add both guards to every
-- policy on this bucket.

drop policy if exists "Owners upload tenant documents" on storage.objects;
create policy "Owners upload tenant documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'property'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] in (
      select id::text from public.properties
      where owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners view tenant documents" on storage.objects;
create policy "Owners view tenant documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'property'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] in (
      select id::text from public.properties
      where owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners delete tenant documents" on storage.objects;
create policy "Owners delete tenant documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'property'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] in (
      select id::text from public.properties
      where owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners update tenant documents" on storage.objects;
create policy "Owners update tenant documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'property'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] in (
      select id::text from public.properties
      where owner_user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'tenant-documents'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'property'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] in (
      select id::text from public.properties
      where owner_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- M5: Separate MIME type from document_type taxonomy
-- ============================================================================
-- Phase 57 crammed the browser-reported MIME (e.g. 'application/pdf') into
-- the categorical `document_type` column. That blocks future filtering UI
-- by category (`lease`, `inspection_photo`, `tax_return`). Add a dedicated
-- `mime_type` column and backfill existing rows from document_type where
-- it looks like a MIME string.

alter table public.documents
  add column if not exists mime_type text;

update public.documents
set mime_type = document_type
where mime_type is null
  and document_type is not null
  and document_type like '%/%';

comment on column public.documents.mime_type is
  'Browser-reported MIME type. Separate from document_type, which stores a categorical label (lease/receipt/other).';

-- ============================================================================
-- H12: Composite index for document vault list pagination
-- ============================================================================
-- Existing idx_documents_entity covers (entity_type, entity_id) but the list
-- query sorts by created_at desc. Without the created_at column in the index
-- Postgres filters then sorts — fine at 0 rows, tail latency at 1000+.

create index if not exists idx_documents_entity_created_at
  on public.documents (entity_type, entity_id, created_at desc);

-- ============================================================================
-- C5: Orphan-document cleanup cron
-- ============================================================================
-- Rows where entity_type='property' and entity_id no longer resolves to a
-- properties row (hard delete) become invisible to the UI. Storage blob GC
-- is a separate problem (needs bucket listing) — this handles the DB side.

create or replace function public.cleanup_orphan_documents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.documents
  where entity_type = 'property'
    and not exists (
      select 1 from public.properties p where p.id = documents.entity_id
    );
end;
$$;

comment on function public.cleanup_orphan_documents is
  'Removes document rows whose parent entity has been hard-deleted. Runs nightly via pg_cron.';

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'cleanup-orphan-documents') then
    perform cron.schedule(
      'cleanup-orphan-documents',
      '0 4 * * *',
      'select public.cleanup_orphan_documents();'
    );
  end if;
end
$$;

-- ============================================================================
-- C3: Atomic lease + lease_tenants RPC for bulk-import
-- ============================================================================
-- Bulk-import previously inserted into `leases` only. Downstream UI
-- (tenant list, tenant detail) joins through lease_tenants to surface the
-- lease on the tenant view — bulk-imported leases never showed up there.
-- This RPC wraps both inserts in a single transaction and runs as SECURITY
-- DEFINER with explicit ownership checks on the referenced unit and tenant.

create or replace function public.bulk_import_create_lease(
  p_unit_id uuid,
  p_primary_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_rent_amount numeric,
  p_security_deposit numeric,
  p_payment_day integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_lease_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Ownership checks on referenced unit + tenant. Surfaces as a clear per-row
  -- error in the bulk-import stepper instead of a foreign-key violation.
  if not exists (
    select 1 from public.units u
    join public.properties p on p.id = u.property_id
    where u.id = p_unit_id
      and p.owner_user_id = v_owner_id
  ) then
    raise exception 'Unit % is not yours or does not exist', p_unit_id;
  end if;

  if not exists (
    select 1 from public.tenants
    where id = p_primary_tenant_id
      and owner_user_id = v_owner_id
  ) then
    raise exception 'Tenant % is not yours or does not exist', p_primary_tenant_id;
  end if;

  insert into public.leases (
    unit_id,
    primary_tenant_id,
    start_date,
    end_date,
    rent_amount,
    rent_currency,
    security_deposit,
    payment_day,
    lease_status,
    owner_user_id
  ) values (
    p_unit_id,
    p_primary_tenant_id,
    p_start_date,
    p_end_date,
    p_rent_amount,
    'USD',
    p_security_deposit,
    p_payment_day,
    'draft',
    v_owner_id
  )
  returning id into v_lease_id;

  insert into public.lease_tenants (
    lease_id,
    tenant_id,
    is_primary,
    responsibility_percentage
  ) values (
    v_lease_id,
    p_primary_tenant_id,
    true,
    100
  );

  return v_lease_id;
end;
$$;

revoke all on function public.bulk_import_create_lease(
  uuid, uuid, date, date, numeric, numeric, integer
) from public;
grant execute on function public.bulk_import_create_lease(
  uuid, uuid, date, date, numeric, numeric, integer
) to authenticated;

comment on function public.bulk_import_create_lease is
  'Atomic lease + lease_tenants insert for bulk CSV import. Prevents orphan leases invisible to the tenant view.';

commit;
