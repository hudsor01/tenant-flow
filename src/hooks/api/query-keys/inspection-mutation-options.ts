import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import type {
	CreateInspectionInput,
	UpdateInspectionInput,
	TenantReviewInput,
	CreateInspectionRoomInput,
	UpdateInspectionRoomInput
} from '#lib/validation/inspections'
import type { Inspection } from '#types/sections/inspections'

export interface RecordPhotoInput {
	inspection_room_id: string
	inspection_id: string
	storage_path: string
	file_name: string
	file_size?: number
	mime_type: string
	caption?: string
}

export const inspectionMutations = {
	create: () =>
		mutationOptions({
			mutationFn: async (dto: CreateInspectionInput): Promise<Inspection> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				const { data: created, error } = await supabase
					.from('inspections')
					.insert({ ...dto, owner_user_id: ownerId })
					.select()
					.single()

				if (error) handlePostgrestError(error, 'inspections')
				return created as unknown as Inspection
			}
		}),

	update: (id: string) =>
		mutationOptions({
			mutationFn: async (dto: UpdateInspectionInput): Promise<Inspection> => {
				const supabase = createClient()
				const { data: updated, error } = await supabase
					.from('inspections')
					.update(dto)
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'inspections')
				return updated as unknown as Inspection
			}
		}),

	complete: (id: string) =>
		mutationOptions({
			mutationFn: async (): Promise<Inspection> => {
				const supabase = createClient()

				const { data: rooms, error: roomsError } = await supabase
					.from('inspection_rooms')
					.select('id, condition_rating')
					.eq('inspection_id', id)

				if (roomsError) handlePostgrestError(roomsError, 'inspection_rooms')

				const unassessed = (rooms ?? []).filter(r => !r.condition_rating)
				if (unassessed.length > 0) {
					throw new Error(
						`All rooms must be assessed before completing. ${unassessed.length} room(s) have no condition rating.`
					)
				}

				const { data: updated, error } = await supabase
					.from('inspections')
					.update({ status: 'completed', completed_at: new Date().toISOString() })
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'inspections')
				return updated as unknown as Inspection
			}
		}),

	submitForReview: (id: string) =>
		mutationOptions({
			mutationFn: async (): Promise<Inspection> => {
				const supabase = createClient()
				const { data: updated, error } = await supabase
					.from('inspections')
					.update({ status: 'tenant_reviewing' })
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'inspections')
				return updated as unknown as Inspection
			}
		}),

	tenantReview: (id: string) =>
		mutationOptions({
			mutationFn: async (dto: TenantReviewInput): Promise<Inspection> => {
				const supabase = createClient()
				const { data: updated, error } = await supabase
					.from('inspections')
					.update({
						...dto,
						status: 'finalized',
						tenant_reviewed_at: new Date().toISOString()
					})
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'inspections')
				return updated as unknown as Inspection
			}
		}),

	delete: () =>
		mutationOptions({
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('inspections')
					.delete()
					.eq('id', id)

				if (error) handlePostgrestError(error, 'inspections')
			}
		}),

	createRoom: () =>
		mutationOptions({
			mutationFn: async (dto: CreateInspectionRoomInput) => {
				const supabase = createClient()
				const { data: created, error } = await supabase
					.from('inspection_rooms')
					.insert(dto)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'inspection_rooms')
				return created
			}
		}),

	updateRoom: (roomId: string) =>
		mutationOptions({
			mutationFn: async (dto: UpdateInspectionRoomInput): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('inspection_rooms')
					.update(dto)
					.eq('id', roomId)

				if (error) handlePostgrestError(error, 'inspection_rooms')
			}
		}),

	deleteRoom: () =>
		mutationOptions({
			mutationFn: async (roomId: string): Promise<void> => {
				const supabase = createClient()

				const { data: photos } = await supabase
					.from('inspection_photos')
					.select('storage_path')
					.eq('inspection_room_id', roomId)

				const { error } = await supabase
					.from('inspection_rooms')
					.delete()
					.eq('id', roomId)

				if (error) handlePostgrestError(error, 'inspection_rooms')

				if (photos && photos.length > 0) {
					const storagePaths = photos.map(p => p.storage_path)
					try {
						await supabase.storage.from('inspection-photos').remove(storagePaths)
					} catch {
						// Non-blocking storage cleanup
					}
				}
			}
		}),

	recordPhoto: () =>
		mutationOptions({
			mutationFn: async (dto: RecordPhotoInput) => {
				const supabase = createClient()
				const { data: photo, error } = await supabase
					.from('inspection_photos')
					.insert(dto)
					.select()
					.single()

				if (error) {
					try {
						await supabase.storage.from('inspection-photos').remove([dto.storage_path])
					} catch {
						// Non-blocking storage cleanup
					}
					handlePostgrestError(error, 'inspection_photos')
				}

				return photo
			}
		}),

	deletePhoto: () =>
		mutationOptions({
			mutationFn: async (photoId: string): Promise<void> => {
				const supabase = createClient()

				const { data: photo } = await supabase
					.from('inspection_photos')
					.select('storage_path')
					.eq('id', photoId)
					.single()

				const { error: dbError } = await supabase
					.from('inspection_photos')
					.delete()
					.eq('id', photoId)

				if (dbError) handlePostgrestError(dbError, 'inspection_photos')

				if (photo?.storage_path) {
					try {
						await supabase.storage.from('inspection-photos').remove([photo.storage_path])
					} catch {
						// Non-blocking storage cleanup
					}
				}
			}
		})
}
