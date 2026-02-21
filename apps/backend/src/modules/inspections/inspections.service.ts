import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type {
  CreateInspectionInput,
  UpdateInspectionInput,
  CreateInspectionRoomInput,
  UpdateInspectionRoomInput,
  TenantReviewInput
} from '@repo/shared/validation/inspections'
import type { RecordPhotoDto } from './dto/record-photo.dto'
import type { Database } from '@repo/shared/types/supabase'

type InspectionInsert = Database['public']['Tables']['inspections']['Insert']
type InspectionUpdate = Database['public']['Tables']['inspections']['Update']
type InspectionRoomInsert = Database['public']['Tables']['inspection_rooms']['Insert']
type InspectionRoomUpdate = Database['public']['Tables']['inspection_rooms']['Update']
type InspectionPhotoInsert = Database['public']['Tables']['inspection_photos']['Insert']
type InspectionRow = Database['public']['Tables']['inspections']['Row']
type InspectionRoomRow = Database['public']['Tables']['inspection_rooms']['Row']
type InspectionPhotoRow = Database['public']['Tables']['inspection_photos']['Row']

export interface InspectionWithRelations extends InspectionRow {
  property: { name: string; address_line1: string } | null
  unit: { name: string } | null
  rooms?: Array<InspectionRoomRow & { photos: InspectionPhotoRow[] }>
}

export interface InspectionListItem extends InspectionRow {
  property_name: string
  unit_name: string | null
  room_count: number
}

@Injectable()
export class InspectionsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(userId: string): Promise<InspectionListItem[]> {
    const client = this.supabase.getAdminClient()
    const { data, error } = await client
      .from('inspections')
      .select(`
        id, lease_id, property_id, unit_id, inspection_type, status,
        scheduled_date, completed_at, created_at, updated_at,
        owner_user_id, tenant_reviewed_at, tenant_signature_data,
        overall_condition, owner_notes, tenant_notes,
        property:properties(name, address_line1),
        unit:units(name),
        rooms:inspection_rooms(id)
      `)
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new NotFoundException('Failed to fetch inspections')

    return (data ?? []).map(i => ({
      id: i.id,
      lease_id: i.lease_id,
      property_id: i.property_id,
      unit_id: i.unit_id,
      owner_user_id: i.owner_user_id,
      inspection_type: i.inspection_type,
      status: i.status,
      scheduled_date: i.scheduled_date,
      completed_at: i.completed_at,
      tenant_reviewed_at: i.tenant_reviewed_at,
      tenant_signature_data: i.tenant_signature_data,
      overall_condition: i.overall_condition,
      owner_notes: i.owner_notes,
      tenant_notes: i.tenant_notes,
      created_at: i.created_at,
      updated_at: i.updated_at,
      property_name: (i.property as { name: string } | null)?.name ?? 'Unknown',
      unit_name: (i.unit as { name: string } | null)?.name ?? null,
      room_count: Array.isArray(i.rooms) ? i.rooms.length : 0
    }))
  }

  async findOne(id: string, userId: string): Promise<InspectionRow> {
    const client = this.supabase.getAdminClient()
    const { data, error } = await client
      .from('inspections')
      .select(`
        id, lease_id, property_id, unit_id, inspection_type, status,
        scheduled_date, completed_at, created_at, updated_at,
        owner_user_id, tenant_reviewed_at, tenant_signature_data,
        overall_condition, owner_notes, tenant_notes
      `)
      .eq('id', id)
      .eq('owner_user_id', userId)
      .single()

    if (error || !data) throw new NotFoundException('Inspection not found')
    return data
  }

  async findOneWithRooms(id: string, userId: string): Promise<InspectionWithRelations> {
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
    return data as unknown as InspectionWithRelations
  }

  async findByLease(leaseId: string, userId: string): Promise<InspectionRow[]> {
    const client = this.supabase.getAdminClient()
    const { data, error } = await client
      .from('inspections')
      .select(`
        id, lease_id, property_id, unit_id, inspection_type, status,
        scheduled_date, completed_at, created_at, updated_at,
        owner_user_id, tenant_reviewed_at, tenant_signature_data,
        overall_condition, owner_notes, tenant_notes
      `)
      .eq('lease_id', leaseId)
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw new NotFoundException('Failed to fetch inspections for lease')
    return data ?? []
  }

  async create(dto: CreateInspectionInput, userId: string): Promise<InspectionRow> {
    const client = this.supabase.getAdminClient()

    const insert: InspectionInsert = {
      lease_id: dto.lease_id,
      property_id: dto.property_id,
      owner_user_id: userId,
      inspection_type: dto.inspection_type,
      ...(dto.unit_id !== null && dto.unit_id !== undefined ? { unit_id: dto.unit_id } : {}),
      ...(dto.scheduled_date !== null && dto.scheduled_date !== undefined ? { scheduled_date: dto.scheduled_date } : {})
    }

    const { data, error } = await client
      .from('inspections')
      .insert(insert)
      .select()
      .single()

    if (error || !data) throw new InternalServerErrorException('Failed to create inspection')
    return data
  }

  async update(id: string, dto: UpdateInspectionInput, userId: string): Promise<InspectionRow> {
    const client = this.supabase.getAdminClient()

    const { data: existing } = await client
      .from('inspections')
      .select('id, owner_user_id')
      .eq('id', id)
      .single()

    if (!existing) throw new NotFoundException('Inspection not found')
    if (existing.owner_user_id !== userId) throw new ForbiddenException('Access denied')

    const update: InspectionUpdate = {
      updated_at: new Date().toISOString(),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.scheduled_date !== null && dto.scheduled_date !== undefined ? { scheduled_date: dto.scheduled_date } : {}),
      ...(dto.completed_at !== null && dto.completed_at !== undefined ? { completed_at: dto.completed_at } : {}),
      ...(dto.overall_condition !== null && dto.overall_condition !== undefined ? { overall_condition: dto.overall_condition } : {}),
      ...(dto.owner_notes !== null && dto.owner_notes !== undefined ? { owner_notes: dto.owner_notes } : {}),
      ...(dto.tenant_notes !== null && dto.tenant_notes !== undefined ? { tenant_notes: dto.tenant_notes } : {}),
      ...(dto.tenant_reviewed_at !== null && dto.tenant_reviewed_at !== undefined ? { tenant_reviewed_at: dto.tenant_reviewed_at } : {}),
      ...(dto.tenant_signature_data !== null && dto.tenant_signature_data !== undefined ? { tenant_signature_data: dto.tenant_signature_data } : {})
    }

    const { data, error } = await client
      .from('inspections')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to update inspection')
    return data
  }

  async complete(id: string, userId: string): Promise<InspectionRow> {
    const client = this.supabase.getAdminClient()

    const { data: existing } = await client
      .from('inspections')
      .select('id, owner_user_id')
      .eq('id', id)
      .single()

    if (!existing) throw new NotFoundException('Inspection not found')
    if (existing.owner_user_id !== userId) throw new ForbiddenException('Access denied')

    const update: InspectionUpdate = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await client
      .from('inspections')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to complete inspection')
    return data
  }

  async submitForTenantReview(id: string, userId: string): Promise<InspectionRow> {
    const client = this.supabase.getAdminClient()

    const { data: existing } = await client
      .from('inspections')
      .select('id, owner_user_id')
      .eq('id', id)
      .single()

    if (!existing) throw new NotFoundException('Inspection not found')
    if (existing.owner_user_id !== userId) throw new ForbiddenException('Access denied')

    const update: InspectionUpdate = {
      status: 'tenant_reviewing',
      updated_at: new Date().toISOString()
    }

    const { data, error } = await client
      .from('inspections')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to submit for review')
    return data
  }

  async tenantReview(id: string, dto: TenantReviewInput, tenantUserId: string): Promise<InspectionRow> {
    const client = this.supabase.getAdminClient()

    const { data: inspection } = await client
      .from('inspections')
      .select('id, status, lease_id')
      .eq('id', id)
      .single()

    if (!inspection) throw new NotFoundException('Inspection not found')

    // Verify tenant access: leases.primary_tenant_id -> tenants.user_id
    const { data: lease } = await client
      .from('leases')
      .select('primary_tenant_id')
      .eq('id', inspection.lease_id)
      .single()

    if (!lease) throw new ForbiddenException('Access denied')

    const { data: tenant } = await client
      .from('tenants')
      .select('user_id')
      .eq('id', lease.primary_tenant_id)
      .single()

    if (!tenant || tenant.user_id !== tenantUserId) {
      throw new ForbiddenException('Access denied')
    }

    const update: InspectionUpdate = {
      tenant_signature_data: dto.tenant_signature_data,
      tenant_reviewed_at: new Date().toISOString(),
      status: 'finalized',
      updated_at: new Date().toISOString(),
      ...(dto.tenant_notes !== null && dto.tenant_notes !== undefined ? { tenant_notes: dto.tenant_notes } : {})
    }

    const { data, error } = await client
      .from('inspections')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to submit tenant review')
    return data
  }

  async remove(id: string, userId: string): Promise<void> {
    const client = this.supabase.getAdminClient()
    const { error } = await client
      .from('inspections')
      .delete()
      .eq('id', id)
      .eq('owner_user_id', userId)

    if (error) throw new InternalServerErrorException('Failed to delete inspection')
  }

  // Room management
  async createRoom(dto: CreateInspectionRoomInput, userId: string): Promise<InspectionRoomRow> {
    const client = this.supabase.getAdminClient()

    const { data: inspection } = await client
      .from('inspections')
      .select('id')
      .eq('id', dto.inspection_id)
      .eq('owner_user_id', userId)
      .single()

    if (!inspection) throw new ForbiddenException('Inspection not found or access denied')

    const insert: InspectionRoomInsert = {
      inspection_id: dto.inspection_id,
      room_name: dto.room_name,
      room_type: dto.room_type,
      condition_rating: dto.condition_rating,
      ...(dto.notes !== null && dto.notes !== undefined ? { notes: dto.notes } : {})
    }

    const { data, error } = await client
      .from('inspection_rooms')
      .insert(insert)
      .select()
      .single()

    if (error || !data) throw new InternalServerErrorException('Failed to create room')
    return data
  }

  async updateRoom(roomId: string, dto: UpdateInspectionRoomInput, userId: string): Promise<InspectionRoomRow> {
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

    const update: InspectionRoomUpdate = {
      updated_at: new Date().toISOString(),
      ...(dto.room_name !== undefined ? { room_name: dto.room_name } : {}),
      ...(dto.room_type !== undefined ? { room_type: dto.room_type } : {}),
      ...(dto.condition_rating !== undefined ? { condition_rating: dto.condition_rating } : {}),
      ...(dto.notes !== null && dto.notes !== undefined ? { notes: dto.notes } : {})
    }

    const { data, error } = await client
      .from('inspection_rooms')
      .update(update)
      .eq('id', roomId)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to update room')
    return data
  }

  async removeRoom(roomId: string, userId: string): Promise<void> {
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

    if (error) throw new InternalServerErrorException('Failed to delete room')
  }

  // Photo record management (actual file upload is done client-side to Supabase Storage)
  async recordPhoto(
    dto: RecordPhotoDto,
    userId: string
  ): Promise<InspectionPhotoRow> {
    const client = this.supabase.getAdminClient()

    // Verify the inspection belongs to this user
    const { data: inspection } = await client
      .from('inspections')
      .select('id')
      .eq('id', dto.inspection_id)
      .eq('owner_user_id', userId)
      .single()

    if (!inspection) throw new ForbiddenException('Access denied')

    const insert: InspectionPhotoInsert = {
      inspection_room_id: dto.inspection_room_id,
      inspection_id: dto.inspection_id,
      storage_path: dto.storage_path,
      file_name: dto.file_name,
      mime_type: dto.mime_type,
      uploaded_by: userId,
      ...(dto.file_size !== undefined ? { file_size: dto.file_size } : {}),
      ...(dto.caption !== undefined ? { caption: dto.caption } : {})
    }

    const { data, error } = await client
      .from('inspection_photos')
      .insert(insert)
      .select()
      .single()

    if (error || !data) throw new NotFoundException('Failed to record photo')
    return data
  }

  async removePhoto(photoId: string, userId: string): Promise<void> {
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

    // Remove file from storage (best-effort: file may already be gone)
    const { error: storageError } = await client.storage.from('inspection-photos').remove([photo.storage_path])
    if (storageError) {
      // Log but don't throw — storage removal is non-critical if the DB record is deleted
      console.error('Storage removal failed for photo', photoId, storageError.message)
    }

    // Remove DB record
    const { error: dbError } = await client.from('inspection_photos').delete().eq('id', photoId)
    if (dbError) throw new InternalServerErrorException('Failed to delete photo record')
  }
}
