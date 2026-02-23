/**
 * Inspection Hooks
 * TanStack Query hooks for inspection data fetching and mutations
 * React 19 + TanStack Query v5 patterns
 *
 * Query keys are in a separate file to avoid circular dependencies.
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
import { apiRequest } from '#lib/api-request'
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
		mutationFn: (dto: CreateInspectionInput) =>
			apiRequest<Inspection>('/api/v1/inspections', {
				method: 'POST',
				body: JSON.stringify(dto)
			}),
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
		mutationFn: (dto: UpdateInspectionInput) =>
			apiRequest<Inspection>(`/api/v1/inspections/${id}`, {
				method: 'PUT',
				body: JSON.stringify(dto)
			}),
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
 * Mark an inspection as complete
 */
export function useCompleteInspection(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			apiRequest<Inspection>(`/api/v1/inspections/${id}/complete`, {
				method: 'POST'
			}),
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
 * Submit an inspection for tenant review
 */
export function useSubmitForTenantReview(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			apiRequest<Inspection>(`/api/v1/inspections/${id}/submit-for-review`, {
				method: 'POST'
			}),
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
 * Tenant submits their review and signature
 */
export function useTenantReview(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (dto: TenantReviewInput) =>
			apiRequest<Inspection>(`/api/v1/inspections/${id}/tenant-review`, {
				method: 'POST',
				body: JSON.stringify(dto)
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: inspectionQueries.detailQuery(id).queryKey
			})
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
		mutationFn: (id: string) =>
			apiRequest<void>(`/api/v1/inspections/${id}`, { method: 'DELETE' }),
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
		mutationFn: (dto: CreateInspectionRoomInput) =>
			apiRequest('/api/v1/inspections/rooms', {
				method: 'POST',
				body: JSON.stringify(dto)
			}),
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
		mutationFn: ({
			roomId,
			dto
		}: {
			roomId: string
			dto: UpdateInspectionRoomInput
		}) =>
			apiRequest(`/api/v1/inspections/rooms/${roomId}`, {
				method: 'PUT',
				body: JSON.stringify(dto)
			}),
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
 * Delete a room from an inspection
 */
export function useDeleteInspectionRoom(inspectionId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (roomId: string) =>
			apiRequest(`/api/v1/inspections/rooms/${roomId}`, { method: 'DELETE' }),
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
 * Record a photo after direct Supabase Storage upload
 */
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
			apiRequest('/api/v1/inspections/photos', {
				method: 'POST',
				body: JSON.stringify(dto)
			}),
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
 * Delete a photo from an inspection room
 */
export function useDeleteInspectionPhoto(inspectionId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (photoId: string) =>
			apiRequest(`/api/v1/inspections/photos/${photoId}`, { method: 'DELETE' }),
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
