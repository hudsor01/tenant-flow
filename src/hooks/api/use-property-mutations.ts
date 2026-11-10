/**
 * Property Mutation Hooks -- CRUD and image deletion.
 * Query hooks remain in use-properties.ts.
 *
 * mutationFn logic lives in propertyMutations factories (query-keys/property-mutation-options.ts).
 * This file spreads factories and adds onSuccess/onError/onSettled callbacks.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";

import type { Property } from "#types/core";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";
import { propertyMutations, propertyQueries } from "./query-keys/property-keys";
import { unitQueries } from "./query-keys/unit-keys";

/** Create property mutation */
export function useCreatePropertyMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...propertyMutations.create(),
		...createMutationCallbacks(queryClient, {
			invalidate: [propertyQueries.lists(), ownerDashboardKeys.all],
			successMessage: "Property created successfully",
			errorContext: "Create property",
		}),
	});
}

/** Update property mutation */
export function useUpdatePropertyMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...propertyMutations.update(),
		...createMutationCallbacks<Property>(queryClient, {
			invalidate: [
				propertyQueries.lists(),
				unitQueries.lists(),
				// PROP-02: the dashboard queries ownerDashboardKeys.analytics
				// .pageData(); analytics.stats() is never queried, so a rename
				// never refreshed it. Use the broad prefix like create/delete.
				ownerDashboardKeys.all,
			],
			updateDetail: (property) => ({
				queryKey: propertyQueries.detail(property.id).queryKey,
				data: property,
			}),
			successMessage: "Property updated successfully",
			errorContext: "Update property",
		}),
	});
}

/**
 * Delete property mutation
 * Soft-delete: sets status to 'inactive' (7-year data retention policy)
 */
export function useDeletePropertyMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...propertyMutations.delete(),
		...createMutationCallbacks<void, string>(queryClient, {
			invalidate: [
				propertyQueries.lists(),
				unitQueries.lists(),
				ownerDashboardKeys.all,
			],
			removeDetail: (_data, deletedId) => [
				propertyQueries.detail(deletedId).queryKey,
			],
			successMessage: "Property deleted successfully",
			errorContext: "Delete property",
		}),
	});
}

/** Delete property image mutation */
export function useDeletePropertyImageMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...propertyMutations.deleteImage(),
		...createMutationCallbacks<
			{ success: boolean },
			{ imageId: string; property_id: string; imagePath?: string }
		>(queryClient, {
			invalidate: (vars) => [
				[...propertyQueries.detail(vars.property_id).queryKey, "images"],
				propertyQueries.lists(),
			],
			successMessage: "Image deleted successfully",
			errorContext: "Delete image",
		}),
	});
}
