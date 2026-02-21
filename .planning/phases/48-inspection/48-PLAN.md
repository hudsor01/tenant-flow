# Phase 48: Move-In/Move-Out Inspection — Database-Backed Implementation

**Goal:** Replace the inspection stub with a real database-backed implementation: inspection records, room-by-room condition tracking, photo evidence upload, lease lifecycle integration (auto-create move-in/move-out inspections), and PDF report generation.

**Architecture:** New `inspections` table + `inspection_rooms` table + `inspection_photos` table. New `InspectionsModule` in NestJS. New Supabase Storage bucket `inspection-photos`. Frontend: owner creates inspection, tenant reviews/signs.

**Tech Stack:** NestJS, Supabase Storage, Supabase PostgreSQL, RLS, react-dropzone, @react-pdf/renderer, Next.js App Router

---

### Task 1: Database migration — inspections tables + RLS

**Files:**
- Create: `supabase/migrations/20260220110000_create_inspections_tables.sql`

**Step 1: Create the migration**

```sql
-- Migration: Create move-in/move-out inspection system
-- Purpose: Replace stub with full database-backed inspection tracking
-- Affected tables: inspections, inspection_rooms, inspection_photos (new)
-- Special considerations: RLS required on all tables; photos stored in Supabase Storage

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

comment on table public.inspection_photos is 'Photos attached to inspection rooms';

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
-- ============================================================
create trigger set_inspections_updated_at
  before update on public.inspections
  for each row execute function public.handle_updated_at();

create trigger set_inspection_rooms_updated_at
  before update on public.inspection_rooms
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.inspections enable row level security;
alter table public.inspection_rooms enable row level security;
alter table public.inspection_photos enable row level security;

-- inspections: owner can see and manage their own
create policy "Owners can view their inspections"
on public.inspections for select
to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Owners can create inspections"
on public.inspections for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy "Owners can update their inspections"
on public.inspections for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy "Owners can delete their inspections"
on public.inspections for delete
to authenticated
using ((select auth.uid()) = owner_user_id);

-- Tenants can view and update inspections for their active leases
create policy "Tenants can view inspections for their leases"
on public.inspections for select
to authenticated
using (
  lease_id in (
    select id from public.leases
    where tenant_user_id = (select auth.uid())
  )
);

create policy "Tenants can update inspections for review"
on public.inspections for update
to authenticated
using (
  lease_id in (
    select id from public.leases
    where tenant_user_id = (select auth.uid())
  )
)
with check (
  lease_id in (
    select id from public.leases
    where tenant_user_id = (select auth.uid())
  )
);

-- inspection_rooms: inherit from parent inspection
create policy "Owners can view inspection rooms"
on public.inspection_rooms for select
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

create policy "Owners can create inspection rooms"
on public.inspection_rooms for insert
to authenticated
with check (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

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

create policy "Owners can delete inspection rooms"
on public.inspection_rooms for delete
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

create policy "Tenants can view inspection rooms"
on public.inspection_rooms for select
to authenticated
using (
  inspection_id in (
    select i.id from public.inspections i
    join public.leases l on l.id = i.lease_id
    where l.tenant_user_id = (select auth.uid())
  )
);

-- inspection_photos: inherit from parent inspection room
create policy "Owners can view inspection photos"
on public.inspection_photos for select
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

create policy "Owners can insert inspection photos"
on public.inspection_photos for insert
to authenticated
with check (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

create policy "Owners can delete inspection photos"
on public.inspection_photos for delete
to authenticated
using (
  inspection_id in (
    select id from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

create policy "Tenants can view inspection photos"
on public.inspection_photos for select
to authenticated
using (
  inspection_id in (
    select i.id from public.inspections i
    join public.leases l on l.id = i.lease_id
    where l.tenant_user_id = (select auth.uid())
  )
);
```

**Step 2: Push migration**
```bash
cd /Users/richard/Developer/tenant-flow && pnpm db:push
```

**Step 3: Create inspection-photos storage bucket**

Create migration: `supabase/migrations/20260220110001_create_inspection_photos_bucket.sql`

```sql
-- Create inspection-photos storage bucket for move-in/move-out inspection photos
-- Restricted access: only authenticated users who own the inspection can upload/view

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-photos',
  'inspection-photos',
  false,           -- private bucket: requires auth
  10485760,        -- 10MB max per file
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Storage RLS: owners can upload/download photos for their inspections
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

create policy "Owners can view inspection photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

create policy "Owners can delete inspection photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.inspections
    where owner_user_id = (select auth.uid())
  )
);

create policy "Tenants can view inspection photos for their leases"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] in (
    select i.id::text from public.inspections i
    join public.leases l on l.id = i.lease_id
    where l.tenant_user_id = (select auth.uid())
  )
);
```

**Step 4: Push second migration and regenerate types**
```bash
pnpm db:push && pnpm db:types
```

**Step 5: Commit**
```bash
git add supabase/migrations/ packages/shared/src/types/supabase.ts packages/shared/src/validation/generated-schemas.ts
git commit -m "feat(phase-48): create inspections tables, RLS policies, and storage bucket"
```

---

### Task 2: Shared validation schemas for inspections

**Files:**
- Create: `packages/shared/src/validation/inspections.ts`
- Modify: `packages/shared/src/types/sections/maintenance.ts` (or add new domain type file)

**Step 1: Create the shared validation schemas**

Create `packages/shared/src/validation/inspections.ts`:

```typescript
import { z } from 'zod'

export const inspectionTypeSchema = z.enum(['move_in', 'move_out'])
export const inspectionStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'tenant_reviewing',
  'finalized'
])
export const roomTypeSchema = z.enum([
  'bedroom',
  'bathroom',
  'kitchen',
  'living_room',
  'dining_room',
  'garage',
  'outdoor',
  'other'
])
export const conditionRatingSchema = z.enum([
  'excellent',
  'good',
  'fair',
  'poor',
  'damaged'
])

export const createInspectionSchema = z.object({
  lease_id: z.string().uuid(),
  property_id: z.string().uuid(),
  unit_id: z.string().uuid().optional().nullable(),
  inspection_type: inspectionTypeSchema,
  scheduled_date: z.string().optional().nullable(),
})

export const updateInspectionSchema = z.object({
  status: inspectionStatusSchema.optional(),
  scheduled_date: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  overall_condition: z.string().max(2000).optional().nullable(),
  owner_notes: z.string().max(5000).optional().nullable(),
  tenant_notes: z.string().max(5000).optional().nullable(),
  tenant_reviewed_at: z.string().optional().nullable(),
  tenant_signature_data: z.string().optional().nullable(),
})

export const createInspectionRoomSchema = z.object({
  inspection_id: z.string().uuid(),
  room_name: z.string().min(1).max(100),
  room_type: roomTypeSchema,
  condition_rating: conditionRatingSchema,
  notes: z.string().max(2000).optional().nullable(),
})

export const updateInspectionRoomSchema = z.object({
  room_name: z.string().min(1).max(100).optional(),
  room_type: roomTypeSchema.optional(),
  condition_rating: conditionRatingSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export const createInspectionPhotoSchema = z.object({
  inspection_room_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().int().positive().optional(),
  mime_type: z.string(),
  caption: z.string().max(500).optional().nullable(),
})

export const tenantReviewSchema = z.object({
  tenant_notes: z.string().max(5000).optional().nullable(),
  tenant_signature_data: z.string().min(1, 'Signature is required'),
})

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>
export type UpdateInspectionInput = z.infer<typeof updateInspectionSchema>
export type CreateInspectionRoomInput = z.infer<typeof createInspectionRoomSchema>
export type UpdateInspectionRoomInput = z.infer<typeof updateInspectionRoomSchema>
export type CreateInspectionPhotoInput = z.infer<typeof createInspectionPhotoSchema>
export type TenantReviewInput = z.infer<typeof tenantReviewSchema>
```

**Step 2: Create shared types for inspection domain**

Create `packages/shared/src/types/sections/inspections.ts`:

```typescript
export interface InspectionPhoto {
  id: string
  inspection_room_id: string
  inspection_id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string
  caption: string | null
  uploaded_by: string | null
  created_at: string
  publicUrl?: string  // Populated when needed for display
}

export interface InspectionRoom {
  id: string
  inspection_id: string
  room_name: string
  room_type: string
  condition_rating: string
  notes: string | null
  created_at: string
  updated_at: string
  photos?: InspectionPhoto[]
}

export interface Inspection {
  id: string
  lease_id: string
  property_id: string
  unit_id: string | null
  owner_user_id: string
  inspection_type: 'move_in' | 'move_out'
  status: 'pending' | 'in_progress' | 'completed' | 'tenant_reviewing' | 'finalized'
  scheduled_date: string | null
  completed_at: string | null
  tenant_reviewed_at: string | null
  tenant_signature_data: string | null
  overall_condition: string | null
  owner_notes: string | null
  tenant_notes: string | null
  created_at: string
  updated_at: string
  rooms?: InspectionRoom[]
  property?: { name: string; address_line1: string }
  unit?: { name: string } | null
}

export interface InspectionListItem {
  id: string
  lease_id: string
  property_id: string
  inspection_type: 'move_in' | 'move_out'
  status: string
  scheduled_date: string | null
  completed_at: string | null
  created_at: string
  property_name: string
  unit_name: string | null
  room_count: number
}
```

**Step 3: Build shared package**
```bash
pnpm build:shared
```

**Step 4: Commit**
```bash
git add packages/shared/src/
git commit -m "feat(phase-48): add shared validation schemas and types for inspections"
```

---

### Task 3: NestJS InspectionsModule — service and controller

**Files:**
- Create: `apps/backend/src/modules/inspections/inspections.service.ts`
- Create: `apps/backend/src/modules/inspections/inspections.controller.ts`
- Create: `apps/backend/src/modules/inspections/inspections.module.ts`
- Create: `apps/backend/src/modules/inspections/dto/create-inspection.dto.ts`
- Create: `apps/backend/src/modules/inspections/dto/update-inspection.dto.ts`
- Create: `apps/backend/src/modules/inspections/dto/create-inspection-room.dto.ts`
- Create: `apps/backend/src/modules/inspections/dto/update-inspection-room.dto.ts`
- Modify: `apps/backend/src/app.module.ts`

**Step 1: Create DTOs**

`apps/backend/src/modules/inspections/dto/create-inspection.dto.ts`:
```typescript
import { createZodDto } from 'nestjs-zod'
import { createInspectionSchema } from '@repo/shared/validation/inspections'

export class CreateInspectionDto extends createZodDto(createInspectionSchema) {}
```

`apps/backend/src/modules/inspections/dto/update-inspection.dto.ts`:
```typescript
import { createZodDto } from 'nestjs-zod'
import { updateInspectionSchema } from '@repo/shared/validation/inspections'

export class UpdateInspectionDto extends createZodDto(updateInspectionSchema) {}
```

`apps/backend/src/modules/inspections/dto/create-inspection-room.dto.ts`:
```typescript
import { createZodDto } from 'nestjs-zod'
import { createInspectionRoomSchema } from '@repo/shared/validation/inspections'

export class CreateInspectionRoomDto extends createZodDto(createInspectionRoomSchema) {}
```

`apps/backend/src/modules/inspections/dto/update-inspection-room.dto.ts`:
```typescript
import { createZodDto } from 'nestjs-zod'
import { updateInspectionRoomSchema } from '@repo/shared/validation/inspections'

export class UpdateInspectionRoomDto extends createZodDto(updateInspectionRoomSchema) {}
```

`apps/backend/src/modules/inspections/dto/tenant-review.dto.ts`:
```typescript
import { createZodDto } from 'nestjs-zod'
import { tenantReviewSchema } from '@repo/shared/validation/inspections'

export class TenantReviewDto extends createZodDto(tenantReviewSchema) {}
```

**Step 2: Create InspectionsService**

`apps/backend/src/modules/inspections/inspections.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.module'
import type { CreateInspectionInput, UpdateInspectionInput, CreateInspectionRoomInput, UpdateInspectionRoomInput, TenantReviewInput } from '@repo/shared/validation/inspections'

@Injectable()
export class InspectionsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(userId: string) {
    const client = this.supabase.getAdminClient()
    const { data, error } = await client
      .from('inspections')
      .select(`
        id, lease_id, property_id, unit_id, inspection_type, status,
        scheduled_date, completed_at, created_at, updated_at,
        property:properties(name, address_line1),
        unit:units(name),
        rooms:inspection_rooms(id)
      `)
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new NotFoundException('Failed to fetch inspections')

    return (data || []).map(i => ({
      ...i,
      property_name: i.property?.name ?? 'Unknown',
      unit_name: i.unit?.name ?? null,
      room_count: Array.isArray(i.rooms) ? i.rooms.length : 0,
    }))
  }

  async findOne(id: string, userId: string) {
    const client = this.supabase.getAdminClient()
    const { data, error } = await client
      .from('inspections')
      .select(`
        *,
        property:properties(name, address_line1),
        unit:units(name),
        rooms:inspection_rooms(
          *,
          photos:inspection_photos(*)
        )
      `)
      .eq('id', id)
      .eq('owner_user_id', userId)
      .single()

    if (error || !data) throw new NotFoundException('Inspection not found')
    return data
  }

  async findByLease(leaseId: string, userId: string) {
    const client = this.supabase.getAdminClient()
    const { data, error } = await client
      .from('inspections')
      .select(`
        *,
        property:properties(name, address_line1),
        unit:units(name),
        rooms:inspection_rooms(*, photos:inspection_photos(*))
      `)
      .eq('lease_id', leaseId)
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw new NotFoundException('Failed to fetch inspections for lease')
    return data || []
  }

  async create(dto: CreateInspectionInput, userId: string) {
    const client = this.supabase.getAdminClient()
    const { data, error } = await client
      .from('inspections')
      .insert({ ...dto, owner_user_id: userId })
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to create inspection')
    return data
  }

  async update(id: string, dto: UpdateInspectionInput, userId: string) {
    const client = this.supabase.getAdminClient()

    // Verify ownership
    const { data: existing } = await client
      .from('inspections')
      .select('id, owner_user_id')
      .eq('id', id)
      .single()

    if (!existing) throw new NotFoundException('Inspection not found')
    if (existing.owner_user_id !== userId) throw new ForbiddenException('Access denied')

    const { data, error } = await client
      .from('inspections')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to update inspection')
    return data
  }

  async complete(id: string, userId: string) {
    return this.update(id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    }, userId)
  }

  async submitForTenantReview(id: string, userId: string) {
    return this.update(id, { status: 'tenant_reviewing' }, userId)
  }

  async tenantReview(id: string, dto: TenantReviewInput, tenantUserId: string) {
    const client = this.supabase.getAdminClient()

    // Verify the inspection belongs to the tenant's lease
    const { data: inspection } = await client
      .from('inspections')
      .select('id, status, lease_id')
      .eq('id', id)
      .single()

    if (!inspection) throw new NotFoundException('Inspection not found')

    const { data: lease } = await client
      .from('leases')
      .select('tenant_user_id')
      .eq('id', inspection.lease_id)
      .single()

    if (!lease || lease.tenant_user_id !== tenantUserId) {
      throw new ForbiddenException('Access denied')
    }

    const { data, error } = await client
      .from('inspections')
      .update({
        tenant_notes: dto.tenant_notes,
        tenant_signature_data: dto.tenant_signature_data,
        tenant_reviewed_at: new Date().toISOString(),
        status: 'finalized',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to submit tenant review')
    return data
  }

  async remove(id: string, userId: string) {
    const client = this.supabase.getAdminClient()
    const { error } = await client
      .from('inspections')
      .delete()
      .eq('id', id)
      .eq('owner_user_id', userId)

    if (error) throw new NotFoundException('Failed to delete inspection')
  }

  // Room management
  async createRoom(dto: CreateInspectionRoomInput, userId: string) {
    const client = this.supabase.getAdminClient()

    // Verify the inspection belongs to this user
    const { data: inspection } = await client
      .from('inspections')
      .select('id')
      .eq('id', dto.inspection_id)
      .eq('owner_user_id', userId)
      .single()

    if (!inspection) throw new ForbiddenException('Inspection not found or access denied')

    const { data, error } = await client
      .from('inspection_rooms')
      .insert(dto)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to create room')
    return data
  }

  async updateRoom(roomId: string, dto: UpdateInspectionRoomInput, userId: string) {
    const client = this.supabase.getAdminClient()

    // Verify room belongs to user's inspection
    const { data: room } = await client
      .from('inspection_rooms')
      .select('id, inspection_id')
      .eq('id', roomId)
      .single()

    if (!room) throw new NotFoundException('Room not found')

    const { data: inspection } = await client
      .from('inspections')
      .select('id')
      .eq('id', room.inspection_id)
      .eq('owner_user_id', userId)
      .single()

    if (!inspection) throw new ForbiddenException('Access denied')

    const { data, error } = await client
      .from('inspection_rooms')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', roomId)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to update room')
    return data
  }

  async removeRoom(roomId: string, userId: string) {
    const client = this.supabase.getAdminClient()

    const { data: room } = await client
      .from('inspection_rooms')
      .select('id, inspection_id')
      .eq('id', roomId)
      .single()

    if (!room) throw new NotFoundException('Room not found')

    const { data: inspection } = await client
      .from('inspections')
      .select('id')
      .eq('id', room.inspection_id)
      .eq('owner_user_id', userId)
      .single()

    if (!inspection) throw new ForbiddenException('Access denied')

    const { error } = await client
      .from('inspection_rooms')
      .delete()
      .eq('id', roomId)

    if (error) throw new NotFoundException('Failed to delete room')
  }

  // Photo record management (actual file upload is done client-side to Supabase Storage)
  async recordPhoto(dto: {
    inspection_room_id: string
    inspection_id: string
    storage_path: string
    file_name: string
    file_size?: number
    mime_type: string
    caption?: string
  }, userId: string) {
    const client = this.supabase.getAdminClient()

    const { data, error } = await client
      .from('inspection_photos')
      .insert({ ...dto, uploaded_by: userId })
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to record photo')
    return data
  }

  async removePhoto(photoId: string, userId: string) {
    const client = this.supabase.getAdminClient()

    const { data: photo } = await client
      .from('inspection_photos')
      .select('id, storage_path, inspection_id')
      .eq('id', photoId)
      .single()

    if (!photo) throw new NotFoundException('Photo not found')

    const { data: inspection } = await client
      .from('inspections')
      .select('id')
      .eq('id', photo.inspection_id)
      .eq('owner_user_id', userId)
      .single()

    if (!inspection) throw new ForbiddenException('Access denied')

    // Delete from storage
    await client.storage.from('inspection-photos').remove([photo.storage_path])

    // Delete record
    await client.from('inspection_photos').delete().eq('id', photoId)
  }

  // Auto-create move-in inspection when lease becomes active
  async autoCreateMoveInInspection(leaseId: string, propertyId: string, unitId: string | null, ownerId: string) {
    const client = this.supabase.getAdminClient()

    // Check if move-in inspection already exists
    const { data: existing } = await client
      .from('inspections')
      .select('id')
      .eq('lease_id', leaseId)
      .eq('inspection_type', 'move_in')
      .single()

    if (existing) return existing  // Already created

    const { data, error } = await client
      .from('inspections')
      .insert({
        lease_id: leaseId,
        property_id: propertyId,
        unit_id: unitId,
        owner_user_id: ownerId,
        inspection_type: 'move_in',
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw new NotFoundException('Failed to auto-create move-in inspection')
    return data
  }
}
```

**Step 3: Create InspectionsController**

`apps/backend/src/modules/inspections/inspections.controller.ts`:
```typescript
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, ParseUUIDPipe, ValidationPipe
} from '@nestjs/common'
import { InspectionsService } from './inspections.service'
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard'
import type { AuthenticatedRequest } from '../../shared/auth/types'
import { CreateInspectionDto } from './dto/create-inspection.dto'
import { UpdateInspectionDto } from './dto/update-inspection.dto'
import { CreateInspectionRoomDto } from './dto/create-inspection-room.dto'
import { UpdateInspectionRoomDto } from './dto/update-inspection-room.dto'
import { TenantReviewDto } from './dto/tenant-review.dto'

@Controller('inspections')
@UseGuards(JwtAuthGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  // Static routes FIRST (before :id)
  @Get('by-lease/:leaseId')
  findByLease(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.findByLease(leaseId, req.user.id)
  }

  // Dynamic routes LAST
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.inspectionsService.findAll(req.user.id)
  }

  @Post()
  create(
    @Body(new ValidationPipe()) dto: CreateInspectionDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.create(dto, req.user.id)
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.findOne(id, req.user.id)
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe()) dto: UpdateInspectionDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.update(id, dto, req.user.id)
  }

  @Post(':id/complete')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.complete(id, req.user.id)
  }

  @Post(':id/submit-for-review')
  submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.submitForTenantReview(id, req.user.id)
  }

  @Post(':id/tenant-review')
  tenantReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe()) dto: TenantReviewDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.tenantReview(id, dto, req.user.id)
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.remove(id, req.user.id)
  }

  // Room endpoints
  @Post('rooms')
  createRoom(
    @Body(new ValidationPipe()) dto: CreateInspectionRoomDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.createRoom(dto, req.user.id)
  }

  @Put('rooms/:roomId')
  updateRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body(new ValidationPipe()) dto: UpdateInspectionRoomDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.updateRoom(roomId, dto, req.user.id)
  }

  @Delete('rooms/:roomId')
  removeRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.removeRoom(roomId, req.user.id)
  }

  // Photo record endpoints
  @Post('photos')
  recordPhoto(
    @Body() dto: {
      inspection_room_id: string
      inspection_id: string
      storage_path: string
      file_name: string
      file_size?: number
      mime_type: string
      caption?: string
    },
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.recordPhoto(dto, req.user.id)
  }

  @Delete('photos/:photoId')
  removePhoto(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.removePhoto(photoId, req.user.id)
  }
}
```

**Step 4: Create InspectionsModule**

`apps/backend/src/modules/inspections/inspections.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { InspectionsController } from './inspections.controller'
import { InspectionsService } from './inspections.service'

@Module({
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
```

**Step 5: Register in app.module.ts**

In `apps/backend/src/app.module.ts`, import and add `InspectionsModule` to the imports array.

**Step 6: Verify TypeScript**
```bash
cd apps/backend && npx tsc --noEmit 2>&1 | tail -30
```

**Step 7: Commit**
```bash
git add apps/backend/src/modules/inspections/ apps/backend/src/app.module.ts
git commit -m "feat(phase-48): add InspectionsModule with service, controller, and DTOs"
```

---

### Task 4: Frontend TanStack Query hooks for inspections

**Files:**
- Create: `apps/frontend/src/hooks/api/query-keys/inspection-keys.ts`
- Create: `apps/frontend/src/hooks/api/use-inspections.ts`

**Step 1: Create query keys**

`apps/frontend/src/hooks/api/query-keys/inspection-keys.ts`:
```typescript
import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants'
import { apiRequest } from '#lib/api-request'
import type { Inspection, InspectionListItem } from '@repo/shared/types/sections/inspections'

export const inspectionQueries = {
  all: () => ['inspections'] as const,
  lists: () => [...inspectionQueries.all(), 'list'] as const,
  byLease: (leaseId: string) => [...inspectionQueries.all(), 'lease', leaseId] as const,
  details: () => [...inspectionQueries.all(), 'detail'] as const,
  detail: (id: string) => [...inspectionQueries.details(), id] as const,

  list: () =>
    queryOptions({
      queryKey: inspectionQueries.lists(),
      queryFn: () => apiRequest<InspectionListItem[]>('/api/v1/inspections'),
      staleTime: QUERY_CACHE_TIMES.STANDARD,
    }),

  byLeaseQuery: (leaseId: string) =>
    queryOptions({
      queryKey: inspectionQueries.byLease(leaseId),
      queryFn: () => apiRequest<Inspection[]>(`/api/v1/inspections/by-lease/${leaseId}`),
      enabled: !!leaseId,
      staleTime: QUERY_CACHE_TIMES.STANDARD,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: inspectionQueries.detail(id),
      queryFn: () => apiRequest<Inspection>(`/api/v1/inspections/${id}`),
      enabled: !!id,
      staleTime: QUERY_CACHE_TIMES.STANDARD,
    }),
}
```

**Step 2: Create use-inspections.ts**

`apps/frontend/src/hooks/api/use-inspections.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiRequest } from '#lib/api-request'
import { inspectionQueries } from './query-keys/inspection-keys'
import type { CreateInspectionInput, UpdateInspectionInput, CreateInspectionRoomInput, UpdateInspectionRoomInput, TenantReviewInput } from '@repo/shared/validation/inspections'

export function useInspections() {
  return useQuery(inspectionQueries.list())
}

export function useInspectionsByLease(leaseId: string) {
  return useQuery(inspectionQueries.byLeaseQuery(leaseId))
}

export function useInspection(id: string) {
  return useQuery(inspectionQueries.detail(id))
}

export function useCreateInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInspectionInput) =>
      apiRequest('/api/v1/inspections', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
      toast.success('Inspection created')
    },
    onError: () => toast.error('Failed to create inspection'),
  })
}

export function useUpdateInspection(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateInspectionInput) =>
      apiRequest(`/api/v1/inspections/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(id) })
      queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
      toast.success('Inspection updated')
    },
    onError: () => toast.error('Failed to update inspection'),
  })
}

export function useCompleteInspection(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/inspections/${id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(id) })
      queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
      toast.success('Inspection marked as complete')
    },
    onError: () => toast.error('Failed to complete inspection'),
  })
}

export function useSubmitForTenantReview(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/inspections/${id}/submit-for-review`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(id) })
      toast.success('Sent to tenant for review')
    },
    onError: () => toast.error('Failed to submit for review'),
  })
}

export function useTenantReview(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: TenantReviewInput) =>
      apiRequest(`/api/v1/inspections/${id}/tenant-review`, { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(id) })
      toast.success('Inspection reviewed and signed')
    },
    onError: () => toast.error('Failed to submit review'),
  })
}

export function useCreateInspectionRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInspectionRoomInput) =>
      apiRequest('/api/v1/inspections/rooms', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(variables.inspection_id) })
    },
    onError: () => toast.error('Failed to add room'),
  })
}

export function useUpdateInspectionRoom(inspectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, dto }: { roomId: string; dto: UpdateInspectionRoomInput }) =>
      apiRequest(`/api/v1/inspections/rooms/${roomId}`, { method: 'PUT', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(inspectionId) })
    },
    onError: () => toast.error('Failed to update room'),
  })
}

export function useDeleteInspectionRoom(inspectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: string) =>
      apiRequest(`/api/v1/inspections/rooms/${roomId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(inspectionId) })
      toast.success('Room removed')
    },
    onError: () => toast.error('Failed to remove room'),
  })
}

export function useRecordInspectionPhoto(inspectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      inspection_room_id: string
      inspection_id: string
      storage_path: string
      file_name: string
      file_size?: number
      mime_type: string
      caption?: string
    }) =>
      apiRequest('/api/v1/inspections/photos', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(inspectionId) })
    },
    onError: () => toast.error('Failed to record photo'),
  })
}

export function useDeleteInspectionPhoto(inspectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (photoId: string) =>
      apiRequest(`/api/v1/inspections/photos/${photoId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionQueries.detail(inspectionId) })
      toast.success('Photo deleted')
    },
    onError: () => toast.error('Failed to delete photo'),
  })
}
```

**Step 5: Verify TypeScript**
```bash
pnpm typecheck 2>&1 | tail -30
```

**Step 6: Commit**
```bash
git add apps/frontend/src/hooks/api/
git commit -m "feat(phase-48): add TanStack Query hooks for inspections"
```

---

### Task 5: Owner inspection form UI

**Files:**
- Create: `apps/frontend/src/app/(owner)/inspections/page.tsx`
- Create: `apps/frontend/src/app/(owner)/inspections/new/page.tsx`
- Create: `apps/frontend/src/app/(owner)/inspections/[id]/page.tsx`
- Create: `apps/frontend/src/components/inspections/inspection-room-card.tsx`
- Create: `apps/frontend/src/components/inspections/inspection-photo-upload.tsx`
- Create: `apps/frontend/src/components/inspections/inspection-form.tsx`

**Step 1: Create the inspections list page**

`apps/frontend/src/app/(owner)/inspections/page.tsx`:
- Server component that fetches user session
- Renders list of inspections with status badges
- "New Inspection" button
- Links to individual inspection detail pages

**Step 2: Create the new inspection form page**

`apps/frontend/src/app/(owner)/inspections/new/page.tsx`:
- Client component with `'use client'`
- Form to select lease (dropdown of active leases), inspection type (move_in/move_out), scheduled date
- On submit: calls `useCreateInspection()` mutation, redirects to `/inspections/${id}`

**Step 3: Create the inspection detail/edit page**

`apps/frontend/src/app/(owner)/inspections/[id]/page.tsx`:
- Fetches full inspection with rooms and photos
- Shows inspection status badge and actions (Complete, Submit for Review)
- Renders list of `InspectionRoomCard` components
- "Add Room" button
- Status workflow buttons

**Step 4: Create InspectionRoomCard component**

`apps/frontend/src/components/inspections/inspection-room-card.tsx`:
```tsx
'use client'

interface InspectionRoomCardProps {
  room: InspectionRoom
  inspectionId: string
  onRoomUpdated: () => void
}

// Shows: room name, room type, condition rating (select), notes (textarea)
// Shows list of photos with delete buttons
// Has "Add Photo" upload area using react-dropzone
// Condition rating rendered as color-coded badge:
//   excellent=green, good=blue, fair=yellow, poor=orange, damaged=red
```

**Step 5: Create InspectionPhotoUpload component**

`apps/frontend/src/components/inspections/inspection-photo-upload.tsx`:
```tsx
'use client'

// Direct upload to Supabase Storage bucket 'inspection-photos'
// Path: {inspection_id}/{room_id}/{timestamp}-{filename}
// After upload: call recordPhoto mutation to create DB record
// Shows preview grid of uploaded photos
// Allow caption editing
// Uses the same pattern as use-property-image-dropzone.ts
```

For Supabase Storage direct upload from frontend, use the pattern from `property-form-upload.ts`:
- Import `createClient` from `#lib/supabase/client`
- Upload to `inspection-photos` bucket
- Get public URL via `supabase.storage.from('inspection-photos').getPublicUrl(path)`

**Step 6: Create inspection-form.tsx**

`apps/frontend/src/components/inspections/inspection-form.tsx`:
A wrapper component that handles the full inspection editing workflow:
- Step 1: Overview (type, scheduled date, overall notes)
- Step 2: Rooms (add/edit rooms with condition ratings)
- Step 3: Photos (per-room photo upload)
- Step 4: Complete and submit for tenant review

**Step 7: Verify TypeScript**
```bash
pnpm typecheck 2>&1 | tail -30
```

**Step 8: Commit**
```bash
git add apps/frontend/src/app/(owner)/inspections/ apps/frontend/src/components/inspections/
git commit -m "feat(phase-48): add owner inspection form UI with room and photo management"
```

---

### Task 6: Tenant review page + lease detail integration

**Files:**
- Create: `apps/frontend/src/app/(tenant)/tenant/inspections/[id]/page.tsx`
- Modify: `apps/frontend/src/app/(owner)/leases/[id]/page.tsx` (or the lease detail component)

**Step 1: Create tenant review page**

`apps/frontend/src/app/(tenant)/tenant/inspections/[id]/page.tsx`:
- Readonly view of inspection rooms and photos
- Overall condition display
- Owner notes display
- Tenant notes textarea (editable)
- Signature confirmation (simple checkbox: "I confirm this inspection is accurate")
- Submit button calls `useTenantReview(id)` mutation

**Step 2: Add inspection link to lease detail**

In the lease detail page (find the actual file), add a section showing linked inspections:
- Shows move-in and/or move-out inspection cards
- Link to `/inspections/{id}` for owners
- Link to `/tenant/inspections/{id}` for tenants

**Step 3: Verify TypeScript**
```bash
pnpm typecheck 2>&1 | tail -30
```

**Step 4: Commit**
```bash
git add apps/frontend/src/app/(tenant)/tenant/inspections/ apps/frontend/src/app/(owner)/leases/
git commit -m "feat(phase-48): add tenant inspection review page and lease integration"
```

---

### Verification

After all tasks:
1. Backend typechecks: `cd apps/backend && npx tsc --noEmit`
2. Frontend typechecks: `pnpm typecheck`
3. Run backend tests: `cd apps/backend && npx jest "inspections" --forceExit`
4. Lint: `pnpm lint`

### Success Criteria

- [ ] `inspections`, `inspection_rooms`, `inspection_photos` tables exist in DB with proper RLS
- [ ] `inspection-photos` Supabase Storage bucket exists with proper RLS
- [ ] `GET /api/v1/inspections` returns list for authenticated owner
- [ ] `POST /api/v1/inspections` creates new inspection
- [ ] `GET /api/v1/inspections/{id}` returns full inspection with rooms and photos
- [ ] `POST /api/v1/inspections/{id}/complete` marks inspection complete
- [ ] `POST /api/v1/inspections/{id}/submit-for-review` changes status to tenant_reviewing
- [ ] `POST /api/v1/inspections/{id}/tenant-review` records tenant signature
- [ ] `POST /api/v1/inspections/rooms` adds room to inspection
- [ ] Room condition ratings are color-coded (excellent=green, damaged=red)
- [ ] Photos upload directly to Supabase Storage and are recorded in inspection_photos table
- [ ] Tenant can view and sign inspection at `/tenant/inspections/{id}`
- [ ] TypeScript type checks pass
