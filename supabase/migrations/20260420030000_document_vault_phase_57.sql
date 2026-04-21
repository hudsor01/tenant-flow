-- v2.3 Phase 57: document vault MVP — schema, bucket config, storage RLS.
--
-- Three concerns bundled in one migration because they need to land
-- together for the feature to work end-to-end:
--
--   1. public.documents — add user-editable title/tags/description columns
--      so the vault UI can show something more useful than `file_path`.
--   2. tenant-documents storage bucket — expand allowed_mime_types to cover
--      PDF + common image formats (currently null = anything goes; we'd
--      rather an explicit allowlist).
--   3. Path-based storage RLS — mirror the maintenance-photos pattern from
--      PR #614 (path = ${entity_type}/${entity_id}/${timestamp}-${filename})
--      so signed URLs only succeed for owners of the parent entity.
--
-- Phase 57 only wires this up for property-scoped uploads. Lease/tenant/
-- maintenance entity types defer to v2.4 (additive — same schema, new
-- entry points + matching RLS branches).

begin;

-- ============================================================================
-- 1. public.documents — user-editable metadata columns
-- ============================================================================
alter table public.documents
  add column if not exists title text,
  add column if not exists tags text[],
  add column if not exists description text;

comment on column public.documents.title is
  'Owner-editable display name. Falls back to file_path basename in the UI when null.';
comment on column public.documents.tags is
  'Owner-set categorization labels. UI surface deferred to v2.4 (search + filter).';
comment on column public.documents.description is
  'Optional free-text notes from the owner.';

-- Backfill title from file_path basename for existing rows.
-- Currently 0 rows in prod (table dormant pre-Phase 57), but cheap insurance
-- for `supabase db reset` replay or future seeds.
update public.documents
set title = regexp_replace(file_path, '^.*/', '')
where title is null;

-- ============================================================================
-- 2. tenant-documents bucket — explicit MIME allowlist
-- ============================================================================
-- Bucket itself was created earlier (private, 10 MB). Just tighten what's
-- accepted: PDF + common raster images. Word docs, video, etc. defer until
-- there's a documented user request — we'd rather reject than silently store
-- unexpected file types.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]::text[]
where id = 'tenant-documents';

-- ============================================================================
-- 3. Path-based storage RLS on tenant-documents
-- ============================================================================
-- Path convention: {entity_type}/{entity_id}/{timestamp}-{safeName}
--   - storage.foldername(name)[1] = entity_type (e.g. 'property')
--   - storage.foldername(name)[2] = entity_id (uuid as text)
--
-- Owner is whoever owns the parent entity. Phase 57 only ships the property
-- branch; future phases append branches for lease/tenant/maintenance with
-- matching `or` clauses. Mirrors the pattern locked in by PR #614 for
-- maintenance-photos (path-based check, not just bucket_id).

drop policy if exists "Owners upload tenant documents" on storage.objects;
create policy "Owners upload tenant documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tenant-documents'
    and (
      -- property-scoped uploads
      (
        (storage.foldername(name))[1] = 'property'
        and (storage.foldername(name))[2] in (
          select id::text from public.properties
          where owner_user_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Owners view tenant documents" on storage.objects;
create policy "Owners view tenant documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tenant-documents'
    and (
      (
        (storage.foldername(name))[1] = 'property'
        and (storage.foldername(name))[2] in (
          select id::text from public.properties
          where owner_user_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Owners delete tenant documents" on storage.objects;
create policy "Owners delete tenant documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tenant-documents'
    and (
      (
        (storage.foldername(name))[1] = 'property'
        and (storage.foldername(name))[2] in (
          select id::text from public.properties
          where owner_user_id = (select auth.uid())
        )
      )
    )
  );

commit;
