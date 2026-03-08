/**
 * Inspection Photo Mutation Hooks
 * TanStack Query mutation hooks for inspection photo management.
 *
 * Split from use-inspection-mutations.ts for the 300-line file size rule.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { inspectionQueries } from './query-keys/inspection-keys'
import { inspectionMutations } from './query-keys/inspection-mutation-options'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

/**
 * Record a photo after direct Supabase Storage upload.
 * The client uploads to inspection-photos bucket directly, then calls this
 * mutation to persist the metadata in the inspection_photos table.
 * If DB insert fails after a successful Storage upload, attempts cleanup.
 */
export function useRecordInspectionPhoto(inspectionId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		...inspectionMutations.recordPhoto(),
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
 * Pattern matches useDeletePropertyImageMutation in use-property-mutations.ts.
 */
export function useDeleteInspectionPhoto(inspectionId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		...inspectionMutations.deletePhoto(),
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
