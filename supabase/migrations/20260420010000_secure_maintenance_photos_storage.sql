-- Phase 54b follow-up: path-based ownership check for maintenance-photos
-- storage bucket.
--
-- Background:
--   The first 54b migration (20260420000000) created storage policies that
--   only gated writes on `bucket_id = 'maintenance-photos'`. Sentry Seer
--   correctly flagged this as HIGH severity — any authenticated user could
--   upload into or delete another owner's folder by calling the storage API
--   directly with a known maintenance_request_id.
--
-- Fix mirrors the inspection-photos pattern (20260220110001): extract the
-- first path segment (maintenance_request_id) via storage.foldername(name)[1]
-- and confirm it belongs to a maintenance_request the caller owns.
--
-- Also: bucket stays public=true so existing .getPublicUrl() calls keep
-- returning usable URLs for the owner's own photos. If we later need true
-- privacy, flip to public=false and migrate the frontend to signed URLs.

begin;

drop policy if exists "Owners upload maintenance photos" on storage.objects;
create policy "Owners upload maintenance photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'maintenance-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.maintenance_requests
      where owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners view maintenance photos" on storage.objects;
create policy "Owners view maintenance photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'maintenance-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.maintenance_requests
      where owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners delete maintenance photos" on storage.objects;
create policy "Owners delete maintenance photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'maintenance-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.maintenance_requests
      where owner_user_id = (select auth.uid())
    )
  );

commit;
