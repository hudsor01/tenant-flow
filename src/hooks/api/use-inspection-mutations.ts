/**
 * Inspection Mutation Hooks
 * TanStack Query mutation hooks for inspection CRUD and workflow operations.
 *
 * Split from use-inspections.ts to keep each file under 300 lines.
 * Query hooks remain in use-inspections.ts.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";
import { inspectionQueries } from "./query-keys/inspection-keys";
import { inspectionMutations } from "./query-keys/inspection-mutation-options";

/**
 * Create a new inspection
 */
export function useCreateInspection() {
	const queryClient = useQueryClient();

	return useMutation({
		...inspectionMutations.create(),
		...createMutationCallbacks(queryClient, {
			invalidate: [inspectionQueries.lists()],
			successMessage: "Inspection created successfully",
			errorContext: "Create inspection",
			broadcastSuccess: true,
		}),
	});
}

/**
 * Update an existing inspection
 */
export function useUpdateInspection(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...inspectionMutations.update(id),
		...createMutationCallbacks(queryClient, {
			invalidate: [inspectionQueries.lists()],
			updateDetail: (updated) => ({
				queryKey: inspectionQueries.detailQuery(id).queryKey,
				data: updated,
			}),
			successMessage: "Inspection updated",
			errorContext: "Update inspection",
			broadcastSuccess: true,
		}),
	});
}

/**
 * Mark an inspection as complete.
 * Validates all rooms have a condition_rating before updating status to 'completed'.
 */
export function useCompleteInspection(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...inspectionMutations.complete(id),
		...createMutationCallbacks(queryClient, {
			invalidate: [
				inspectionQueries.detailQuery(id).queryKey,
				inspectionQueries.lists(),
			],
			successMessage: "Inspection marked as complete",
			errorContext: "Complete inspection",
			broadcastSuccess: true,
		}),
	});
}

/**
 * Submit an inspection for tenant review.
 * Pure DB status update -- email notification handled by n8n/DB webhook in Phase 56.
 */
export function useSubmitForTenantReview(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...inspectionMutations.submitForReview(id),
		...createMutationCallbacks(queryClient, {
			invalidate: [
				inspectionQueries.detailQuery(id).queryKey,
				inspectionQueries.lists(),
			],
			successMessage: "Sent to tenant for review",
			errorContext: "Submit for review",
			broadcastSuccess: true,
		}),
	});
}
