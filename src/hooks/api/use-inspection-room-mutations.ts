/**
 * Inspection Room Mutation Hooks
 * TanStack Query mutation hooks for inspection room CRUD.
 *
 * Split from use-inspection-mutations.ts for the 300-line file size rule.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
	CreateInspectionRoomInput,
	UpdateInspectionRoomInput
} from '#lib/validation/inspections'

import { inspectionQueries } from './query-keys/inspection-keys'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

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
