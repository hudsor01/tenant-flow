-- Migration: maintenance_request_photos table, RLS policies, and storage bucket
-- Purpose: Enable photo attachments on maintenance requests

-- 1. Create maintenance_request_photos table
create table public.maintenance_request_photos (
  id uuid primary key default gen_random_uuid(),
  maintenance_request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text not null default 'image/jpeg'
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now() not null
);

-- 2. Enable RLS
alter table public.maintenance_request_photos enable row level security;

-- 3. RLS policies (one per operation per role)

-- Owner can view photos for their own maintenance requests
create policy owner_select_maintenance_photos on public.maintenance_request_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.maintenance_requests mr
      where mr.id = maintenance_request_photos.maintenance_request_id
        and mr.owner_user_id = (select auth.uid())
    )
  );

-- Tenant can view photos for their own maintenance requests
create policy tenant_select_maintenance_photos on public.maintenance_request_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.maintenance_requests mr
      join public.tenants t on t.id = mr.tenant_id
      where mr.id = maintenance_request_photos.maintenance_request_id
        and t.user_id = (select auth.uid())
    )
  );

-- Tenant can insert photos for their own maintenance requests
create policy tenant_insert_maintenance_photos on public.maintenance_request_photos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.maintenance_requests mr
      join public.tenants t on t.id = mr.tenant_id
      where mr.id = maintenance_request_photos.maintenance_request_id
        and t.user_id = (select auth.uid())
    )
  );

-- 4. Index for lookups by request ID
create index idx_maintenance_request_photos_request_id
  on public.maintenance_request_photos(maintenance_request_id);

-- 5. Storage bucket (public for URL access)
insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', true)
on conflict (id) do nothing;

-- 6. Storage policies
create policy "Authenticated users can upload maintenance photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'maintenance-photos');

create policy "Authenticated users can view maintenance photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'maintenance-photos');
