-- Migration: Create inspection-photos storage bucket
-- Purpose: Provide Supabase Storage bucket for move-in/move-out inspection photos
-- Affected: storage.buckets, storage.objects (RLS policies)
-- Special considerations: Private bucket - requires auth for all access
-- Note: leases.primary_tenant_id references tenants.id; tenants.user_id is the auth user UUID

-- Create inspection-photos storage bucket for move-in/move-out inspection photos
-- Restricted access: only authenticated users who own the inspection can upload/view
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-photos',
  'inspection-photos',
  false,           -- private bucket: requires auth to access
  10485760,        -- 10MB max per file
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Storage RLS: owners can upload photos for their inspections
-- Path format: {inspection_id}/{room_id}/{timestamp}-{filename}
create policy "Owners can upload inspection photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Storage RLS: owners can view photos for their inspections
create policy "Owners can view inspection photo objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Storage RLS: owners can delete photos for their inspections
create policy "Owners can delete inspection photo objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Storage RLS: tenants can view photos for inspections linked to their leases
-- leases.primary_tenant_id -> tenants.id -> tenants.user_id == auth.uid()
create policy "Tenants can view inspection photo objects for their leases"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] in (
    select i.id::text from public.inspections i
    join public.leases l on l.id = i.lease_id
    join public.tenants t on t.id = l.primary_tenant_id
    where t.user_id = (select auth.uid())
  )
);
