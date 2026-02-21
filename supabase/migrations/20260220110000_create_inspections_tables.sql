-- Migration: Create move-in/move-out inspection system
-- Purpose: Add full database-backed inspection tracking (inspections, inspection_rooms, inspection_photos)
-- Affected tables: inspections, inspection_rooms, inspection_photos (new)
-- Special considerations: RLS required on all tables; photos stored in Supabase Storage bucket
-- Note: leases.primary_tenant_id references tenants.id; tenants.user_id is the auth user UUID

-- ============================================================
-- inspections table
-- ============================================================
-- Tracks a single inspection event (move-in or move-out) for a lease
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  inspection_type text not null default 'move_in',
  status text not null default 'pending',
  -- Timestamps
  scheduled_date date,
  completed_at timestamp with time zone,
  -- Tenant review
  tenant_reviewed_at timestamp with time zone,
  tenant_signature_data text,  -- base64 or signature confirmation token
  -- Overall notes
  overall_condition text,
  owner_notes text,
  tenant_notes text,
  -- Metadata
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint inspections_type_check
    check (inspection_type in ('move_in', 'move_out')),
  constraint inspections_status_check
    check (status in ('pending', 'in_progress', 'completed', 'tenant_reviewing', 'finalized'))
);

comment on table public.inspections is 'Move-in and move-out property inspection records';
comment on column public.inspections.inspection_type is 'Valid values: move_in, move_out';
comment on column public.inspections.status is 'Valid values: pending, in_progress, completed, tenant_reviewing, finalized';

-- ============================================================
-- inspection_rooms table
-- ============================================================
-- Each room in an inspection with condition rating and notes
create table public.inspection_rooms (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  room_name text not null,  -- e.g. 'Living Room', 'Bedroom 1', 'Kitchen', 'Bathroom'
  room_type text not null default 'other',
  condition_rating text not null default 'good',
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint inspection_rooms_type_check
    check (room_type in ('bedroom', 'bathroom', 'kitchen', 'living_room', 'dining_room', 'garage', 'outdoor', 'other')),
  constraint inspection_rooms_condition_check
    check (condition_rating in ('excellent', 'good', 'fair', 'poor', 'damaged'))
);

comment on table public.inspection_rooms is 'Individual room entries within an inspection';
comment on column public.inspection_rooms.condition_rating is 'Valid values: excellent, good, fair, poor, damaged';

-- ============================================================
-- inspection_photos table
-- ============================================================
-- Photos for each room, stored in Supabase Storage
create table public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_room_id uuid not null references public.inspection_rooms(id) on delete cascade,
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  storage_path text not null,  -- Path in Supabase Storage bucket 'inspection-photos'
  file_name text not null,
  file_size integer,
  mime_type text not null default 'image/jpeg',
  caption text,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now() not null
);

comment on table public.inspection_photos is 'Photos attached to inspection rooms, stored in Supabase Storage bucket inspection-photos';

-- ============================================================
-- Indexes for performance
-- ============================================================
create index inspections_lease_id_idx on public.inspections(lease_id);
create index inspections_owner_user_id_idx on public.inspections(owner_user_id);
create index inspections_property_id_idx on public.inspections(property_id);
create index inspection_rooms_inspection_id_idx on public.inspection_rooms(inspection_id);
create index inspection_photos_inspection_room_id_idx on public.inspection_photos(inspection_room_id);
create index inspection_photos_inspection_id_idx on public.inspection_photos(inspection_id);

-- ============================================================
-- Updated_at triggers
-- Uses public.set_updated_at() which is defined in the base schema
-- ============================================================
create trigger set_inspections_updated_at
  before update on public.inspections
  for each row execute function public.set_updated_at();

create trigger set_inspection_rooms_updated_at
  before update on public.inspection_rooms
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.inspections enable row level security;
alter table public.inspection_rooms enable row level security;
alter table public.inspection_photos enable row level security;

-- ============================================================
-- RLS Policies: inspections table
-- ============================================================

-- Owners can view their own inspections
create policy "Owners can view their inspections"
on public.inspections for select
to authenticated
using ((select auth.uid()) = owner_user_id);

-- Owners can create inspections
create policy "Owners can create inspections"
on public.inspections for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

-- Owners can update their own inspections
create policy "Owners can update their inspections"
on public.inspections for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

-- Owners can delete their own inspections
create policy "Owners can delete their inspections"
on public.inspections for delete
to authenticated
using ((select auth.uid()) = owner_user_id);

-- Tenants can view inspections for their leases
-- leases.primary_tenant_id -> tenants.id -> tenants.user_id == auth.uid()
create policy "Tenants can view inspections for their leases"
on public.inspections for select
to authenticated
using (
  lease_id in (
    select l.id from public.leases l
    join public.tenants t on t.id = l.primary_tenant_id
    where t.user_id = (select auth.uid())
  )
);

-- Tenants can update inspections when reviewing (to add tenant_notes and signature)
create policy "Tenants can update inspections for review"
on public.inspections for update
to authenticated
using (
  lease_id in (
    select l.id from public.leases l
    join public.tenants t on t.id = l.primary_tenant_id
    where t.user_id = (select auth.uid())
  )
)
with check (
  lease_id in (
    select l.id from public.leases l
    join public.tenants t on t.id = l.primary_tenant_id
    where t.user_id = (select auth.uid())
  )
);

-- ============================================================
-- RLS Policies: inspection_rooms table
-- ============================================================

-- Owners can view rooms for their inspections
create policy "Owners can view inspection rooms"
on public.inspection_rooms for select
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Owners can create rooms in their inspections
create policy "Owners can create inspection rooms"
on public.inspection_rooms for insert
to authenticated
with check (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Owners can update rooms in their inspections
create policy "Owners can update inspection rooms"
on public.inspection_rooms for update
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
)
with check (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Owners can delete rooms in their inspections
create policy "Owners can delete inspection rooms"
on public.inspection_rooms for delete
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Tenants can view rooms for their lease inspections
create policy "Tenants can view inspection rooms"
on public.inspection_rooms for select
to authenticated
using (
  inspection_id in (
    select i.id from public.inspections i
    join public.leases l on l.id = i.lease_id
    join public.tenants t on t.id = l.primary_tenant_id
    where t.user_id = (select auth.uid())
  )
);

-- ============================================================
-- RLS Policies: inspection_photos table
-- ============================================================

-- Owners can view photos for their inspections
create policy "Owners can view inspection photos"
on public.inspection_photos for select
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Owners can insert photos for their inspections
create policy "Owners can insert inspection photos"
on public.inspection_photos for insert
to authenticated
with check (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Owners can delete photos for their inspections
create policy "Owners can delete inspection photos"
on public.inspection_photos for delete
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

-- Tenants can view photos for their lease inspections
create policy "Tenants can view inspection photos"
on public.inspection_photos for select
to authenticated
using (
  inspection_id in (
    select i.id from public.inspections i
    join public.leases l on l.id = i.lease_id
    join public.tenants t on t.id = l.primary_tenant_id
    where t.user_id = (select auth.uid())
  )
);
