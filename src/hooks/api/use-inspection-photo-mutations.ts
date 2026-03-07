/**
 * Inspection Photo Mutation Hooks
 * TanStack Query mutation hooks for inspection photo management.
 *
 * Split from use-inspection-mutations.ts for the 300-line file size rule.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { inspectionQueries } from './query-keys/inspection-keys'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
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
 * Pattern matches useDeletePropertyImageMutation in use-property-mutations.ts.
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
