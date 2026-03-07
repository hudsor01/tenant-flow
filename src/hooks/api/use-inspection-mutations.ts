/**
 * Inspection Mutation Hooks
 * TanStack Query mutation hooks for inspection CRUD and workflow operations.
 *
 * Split from use-inspections.ts to keep each file under 300 lines.
 * Query hooks remain in use-inspections.ts.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
	CreateInspectionInput,
	UpdateInspectionInput,
	TenantReviewInput
} from '#shared/validation/inspections'
import type { Inspection } from '#shared/types/sections/inspections'

import { inspectionQueries } from './query-keys/inspection-keys'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

// ============================================================================
// INSPECTION MUTATION HOOKS
// ============================================================================

/**
 * Create a new inspection
 */
export function useCreateInspection() {
	const queryClient = useQueryClient()

	return useMutation({
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

