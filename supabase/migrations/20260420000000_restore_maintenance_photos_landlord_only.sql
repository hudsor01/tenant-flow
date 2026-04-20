-- Phase 54b: restore maintenance_request_photos with landlord-only RLS.
--
-- Background:
--   The original table + RLS (migration 20260318120000) was created for the
--   tenant-portal era, when tenants authenticated and could attach photos.
--   The landlord-only pivot (PR #596) dropped the table along with the rest
--   of the tenant-portal surfaces. The app still renders PhotosCard on
--   maintenance detail, so queries have been failing silently in prod.
--
--   This migration re-creates the table with **owner-only** RLS — the same
--   storage bucket as before (maintenance-photos), now expanded to allow
--   webp/jpeg/png photos + short mp4/mov videos for the multi-file upload
--   work that RentRedi reviewers specifically complain about.

begin;

create table if not exists public.maintenance_request_photos (
  id uuid primary key default gen_random_uuid(),
  maintenance_request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text not null default 'image/jpeg'
    check (mime_type in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime'
    )),
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.maintenance_request_photos enable row level security;

-- Owner SELECT: can view attachments for their own maintenance requests.
drop policy if exists owner_select_maintenance_photos on public.maintenance_request_photos;
create policy owner_select_maintenance_photos on public.maintenance_request_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.maintenance_requests mr
      where mr.id = maintenance_request_photos.maintenance_request_id
        and mr.owner_user_id = (select auth.uid())
    )
  );

-- Owner INSERT: can attach files to their own maintenance requests.
drop policy if exists owner_insert_maintenance_photos on public.maintenance_request_photos;
create policy owner_insert_maintenance_photos on public.maintenance_request_photos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.maintenance_requests mr
      where mr.id = maintenance_request_photos.maintenance_request_id
        and mr.owner_user_id = (select auth.uid())
    )
  );

-- Owner DELETE: can remove their own attachments.
drop policy if exists owner_delete_maintenance_photos on public.maintenance_request_photos;
create policy owner_delete_maintenance_photos on public.maintenance_request_photos
  for delete to authenticated
  using (
    exists (
      select 1 from public.maintenance_requests mr
      where mr.id = maintenance_request_photos.maintenance_request_id
        and mr.owner_user_id = (select auth.uid())
    )
  );

create index if not exists idx_maintenance_request_photos_request_id
  on public.maintenance_request_photos(maintenance_request_id);

-- Storage bucket — public so Supabase can serve signed-ish URLs to owners.
insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', true)
on conflict (id) do nothing;

-- Storage policies: authenticated owners only (no tenant writes; landlord-only).
drop policy if exists "Authenticated users can upload maintenance photos" on storage.objects;
create policy "Owners upload maintenance photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'maintenance-photos');

drop policy if exists "Authenticated users can view maintenance photos" on storage.objects;
create policy "Owners view maintenance photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'maintenance-photos');

drop policy if exists "Owners delete maintenance photos" on storage.objects;
create policy "Owners delete maintenance photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'maintenance-photos');

commit;
