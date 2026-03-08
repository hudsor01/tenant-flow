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

import { inspectionQueries } from './query-keys/inspection-keys'
import { inspectionMutations } from './query-keys/inspection-mutation-options'
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
		...inspectionMutations.create(),
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
		...inspectionMutations.update(id),
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
		...inspectionMutations.complete(id),
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
 * Pure DB status update -- email notification handled by n8n/DB webhook in Phase 56.
 */
export function useSubmitForTenantReview(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		...inspectionMutations.submitForReview(id),
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
 * Pure DB operation -- stores tenant_notes and tenant_signature_data, sets status to 'finalized'.
 * DocuSeal is used for leases (Phase 55), not inspection reviews.
 */
export function useTenantReview(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		...inspectionMutations.tenantReview(id),
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
		...inspectionMutations.delete(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: inspectionQueries.lists() })
			handleMutationSuccess('Delete inspection', 'Inspection deleted')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete inspection')
		}
	})
}
