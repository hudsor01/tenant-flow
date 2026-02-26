/**
 * Inspection Hooks
 * TanStack Query hooks for inspection data fetching and mutations
 * React 19 + TanStack Query v5 patterns
 *
 * Query keys are in a separate file to avoid circular dependencies.
 * Mutations use Supabase PostgREST directly (no apiRequest calls).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	CreateInspectionInput,
	UpdateInspectionInput,
	CreateInspectionRoomInput,
	UpdateInspectionRoomInput,
	TenantReviewInput
} from '@repo/shared/validation/inspections'
import type { Inspection } from '@repo/shared/types/sections/inspections'

import { inspectionQueries } from './query-keys/inspection-keys'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all inspections for the current owner
 */
export function useInspections() {
	return useQuery(inspectionQueries.list())
}

/**
 * Hook to fetch inspections for a specific lease
 */
export function useInspectionsByLease(leaseId: string) {
	return useQuery(inspectionQueries.byLeaseQuery(leaseId))
}

/**
 * Hook to fetch a single inspection with rooms and photos
 */
export function useInspection(id: string) {
	return useQuery(inspectionQueries.detailQuery(id))
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new inspection
 */
export function useCreateInspection() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (dto: CreateInspectionInput): Promise<Inspection> => {
			const supabase = createClient()
			const { data: user } = await supabase.auth.getUser()
			const ownerId = requireOwnerUserId(user.user?.id)

			const { data: created, error } = await supabase
				.from('inspections')
				.insert({ ...dto, owner_user_id: ownerId })
				.select()
				.single()

			if (error) handlePostgrestError(error, 'inspections')

			return created as unknown as Inspection
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
			handleMutationSuccess('Create inspection', 'Inspection created successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Create inspection')
		}
	})
}

/**
 * Update an existing inspection
 */
export function useUpdateInspection(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
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
		},
		onSuccess: (updated) => {
			queryClient.setQueryData(inspectionQueries.detailQuery(id).queryKey, updated)
			queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
			handleMutationSuccess('Update inspection', 'Inspection updated')
		},
		onError: (error) => {
			handleMutationError(error, 'Update inspection')
		}
	})
}

/**
 * Mark an inspection as complete.
 * Validates all rooms have a condition_rating before updating status to 'completed'.
 */
export function useCompleteInspection(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (): Promise<Inspection> => {
			const supabase = createClient()

			// Validate all rooms have been assessed before marking complete
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
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(id).queryKey
			})
			queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
			handleMutationSuccess('Complete inspection', 'Inspection marked as complete')
		},
		onError: (error) => {
			handleMutationError(error, 'Complete inspection')
		}
	})
}

/**
 * Submit an inspection for tenant review.
 * Pure DB status update — email notification handled by n8n/DB webhook in Phase 56.
 */
export function useSubmitForTenantReview(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
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
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(id).queryKey
			})
			queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
			handleMutationSuccess('Submit for review', 'Sent to tenant for review')
		},
		onError: (error) => {
			handleMutationError(error, 'Submit for review')
		}
	})
}

/**
 * Tenant submits their review and signature.
 * Pure DB operation — stores tenant_notes and tenant_signature_data, sets status to 'finalized'.
 * DocuSeal is used for leases (Phase 55), not inspection reviews.
 */
export function useTenantReview(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
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
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(id).queryKey
			})
			queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
			handleMutationSuccess('Tenant review', 'Inspection reviewed and signed')
		},
		onError: (error) => {
			handleMutationError(error, 'Tenant review')
		}
	})
}

/**
 * Delete an inspection
 */
export function useDeleteInspection() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('inspections')
				.delete()
				.eq('id', id)

			if (error) handlePostgrestError(error, 'inspections')
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
			handleMutationSuccess('Delete inspection', 'Inspection deleted')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete inspection')
		}
	})
}

// ============================================================================
// ROOM MUTATION HOOKS
// ============================================================================

/**
 * Add a room to an inspection
 */
export function useCreateInspectionRoom() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (dto: CreateInspectionRoomInput) => {
			const supabase = createClient()
			const { data: created, error } = await supabase
				.from('inspection_rooms')
				.insert(dto)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'inspection_rooms')

			return created
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(variables.inspection_id).queryKey
			})
		},
		onError: (error) => {
			handleMutationError(error, 'Add inspection room')
		}
	})
}

/**
 * Update a room within an inspection
 */
export function useUpdateInspectionRoom(inspectionId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			roomId,
			dto
		}: {
			roomId: string
			dto: UpdateInspectionRoomInput
		}) => {
			const supabase = createClient()
			const { error } = await supabase
				.from('inspection_rooms')
				.update(dto)
				.eq('id', roomId)

			if (error) handlePostgrestError(error, 'inspection_rooms')
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(inspectionId).queryKey
			})
		},
		onError: (error) => {
			handleMutationError(error, 'Update inspection room')
		}
	})
}

/**
 * Delete a room from an inspection.
 * Deletes photos from inspection_photos table first (cascade handled by FK if configured).
 * Attempts storage cleanup for each photo (non-blocking).
 */
export function useDeleteInspectionRoom(inspectionId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (roomId: string): Promise<void> => {
			const supabase = createClient()

			// Fetch photos for the room to clean up storage
			const { data: photos } = await supabase
				.from('inspection_photos')
				.select('storage_path')
				.eq('inspection_room_id', roomId)

			// Delete the room (FK cascade deletes inspection_photos if configured)
			const { error } = await supabase
				.from('inspection_rooms')
				.delete()
				.eq('id', roomId)

			if (error) handlePostgrestError(error, 'inspection_rooms')

			// Attempt storage cleanup for each photo (non-blocking)
			if (photos && photos.length > 0) {
				const storagePaths = photos.map(p => p.storage_path)
				try {
					await supabase.storage.from('inspection-photos').remove(storagePaths)
				} catch {
					// Log warning but don't fail — DB cleanup is complete
				}
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(inspectionId).queryKey
			})
			handleMutationSuccess('Delete room', 'Room removed')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete inspection room')
		}
	})
}

// ============================================================================
// PHOTO MUTATION HOOKS
// ============================================================================

/**
 * Record a photo after direct Supabase Storage upload.
 * The client uploads to inspection-photos bucket directly, then calls this
 * mutation to persist the metadata in the inspection_photos table.
 * If DB insert fails after a successful Storage upload, attempts cleanup.
 */
export function useRecordInspectionPhoto(inspectionId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (dto: {
			inspection_room_id: string
			inspection_id: string
			storage_path: string
			file_name: string
			file_size?: number
			mime_type: string
			caption?: string
		}) => {
			const supabase = createClient()
			const { data: photo, error } = await supabase
				.from('inspection_photos')
				.insert(dto)
				.select()
				.single()

			if (error) {
				// DB insert failed after Storage upload succeeded — attempt cleanup
				try {
					await supabase.storage.from('inspection-photos').remove([dto.storage_path])
				} catch {
					// Non-blocking — log warning on failure
				}
				handlePostgrestError(error, 'inspection_photos')
			}

			return photo
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(inspectionId).queryKey
			})
		},
		onError: (error) => {
			handleMutationError(error, 'Record inspection photo')
		}
	})
}

/**
 * Delete a photo from an inspection room.
 * Deletes from DB first, then removes from inspection-photos storage bucket (non-blocking).
 * Pattern matches useDeletePropertyImageMutation in use-properties.ts.
 */
export function useDeleteInspectionPhoto(inspectionId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (photoId: string): Promise<void> => {
			const supabase = createClient()

			// Fetch the storage_path before deleting
			const { data: photo } = await supabase
				.from('inspection_photos')
				.select('storage_path')
				.eq('id', photoId)
				.single()

			// Delete from database (RLS verifies ownership via inspection)
			const { error: dbError } = await supabase
				.from('inspection_photos')
				.delete()
				.eq('id', photoId)

			if (dbError) handlePostgrestError(dbError, 'inspection_photos')

			// Delete from storage (non-blocking)
			if (photo?.storage_path) {
				try {
					await supabase.storage.from('inspection-photos').remove([photo.storage_path])
				} catch {
					// Log warning but don't fail — DB cleanup is complete
				}
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(inspectionId).queryKey
			})
			handleMutationSuccess('Delete photo', 'Photo deleted')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete inspection photo')
		}
	})
}
