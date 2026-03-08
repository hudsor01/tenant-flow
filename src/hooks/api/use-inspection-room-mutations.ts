/**
 * Inspection Room Mutation Hooks
 * TanStack Query mutation hooks for inspection room CRUD.
 *
 * Split from use-inspection-mutations.ts for the 300-line file size rule.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateInspectionRoomInput } from '#lib/validation/inspections'

import { inspectionQueries } from './query-keys/inspection-keys'
import { inspectionMutations } from './query-keys/inspection-mutation-options'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

/**
 * Add a room to an inspection
 */
export function useCreateInspectionRoom() {
	const queryClient = useQueryClient()

	return useMutation({
		...inspectionMutations.createRoom(),
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
 * Update a room within an inspection.
 * Note: Uses inline mutationFn because the factory's updateRoom(roomId) requires
 * roomId at creation time, but this hook receives { roomId, dto } as variables.
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
		...inspectionMutations.deleteRoom(),
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
