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
import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'

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
		...createMutationCallbacks(queryClient, {
			invalidate: [inspectionQueries.lists()],
			successMessage: 'Inspection created successfully',
			errorContext: 'Create inspection',
			useSuccessHandler: true
		})
	})
}

/**
 * Update an existing inspection
 */
export function useUpdateInspection(id: string) {
	const queryClient = useQueryClient()

	return useMutation({
		...inspectionMutations.update(id),
		...createMutationCallbacks(queryClient, {
			invalidate: [inspectionQueries.lists()],
			updateDetail: updated => ({
				queryKey: inspectionQueries.detailQuery(id).queryKey,
				data: updated
			}),
			successMessage: 'Inspection updated',
			errorContext: 'Update inspection',
			useSuccessHandler: true
		})
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
		...createMutationCallbacks(queryClient, {
			invalidate: [
				inspectionQueries.detailQuery(id).queryKey,
				inspectionQueries.lists()
			],
			successMessage: 'Inspection marked as complete',
			errorContext: 'Complete inspection',
			useSuccessHandler: true
		})
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
		...createMutationCallbacks(queryClient, {
			invalidate: [
				inspectionQueries.detailQuery(id).queryKey,
				inspectionQueries.lists()
			],
			successMessage: 'Sent to tenant for review',
			errorContext: 'Submit for review',
			useSuccessHandler: true
		})
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
		...createMutationCallbacks(queryClient, {
			invalidate: [
				inspectionQueries.detailQuery(id).queryKey,
				inspectionQueries.lists()
			],
			successMessage: 'Inspection reviewed and signed',
			errorContext: 'Tenant review',
			useSuccessHandler: true
		})
	})
}

/**
 * Delete an inspection
 */
export function useDeleteInspection() {
	const queryClient = useQueryClient()

	return useMutation({
		...inspectionMutations.delete(),
		...createMutationCallbacks(queryClient, {
			invalidate: [inspectionQueries.lists()],
			successMessage: 'Inspection deleted',
			errorContext: 'Delete inspection',
			useSuccessHandler: true
		})
	})
}
