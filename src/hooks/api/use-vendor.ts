"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";
import type { Vendor, VendorFilters } from "#types/domain";
import { vendorMutations } from "./query-keys/maintenance-keys";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";
import { vendorQueries } from "./query-keys/vendor-keys";

export function useVendors(filters?: VendorFilters) {
	return useQuery(vendorQueries.list(filters));
}

export function useCreateVendorMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		...vendorMutations.create(),
		...createMutationCallbacks(queryClient, {
			invalidate: [vendorQueries.lists(), ownerDashboardKeys.all],
			successMessage: "Vendor added successfully",
			errorContext: "Add vendor",
		}),
	});
}

export function useUpdateVendorMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		...vendorMutations.update(),
		...createMutationCallbacks<Vendor>(queryClient, {
			invalidate: [vendorQueries.lists(), ownerDashboardKeys.all],
			updateDetail: (vendor) => ({
				queryKey: vendorQueries.detail(vendor.id).queryKey,
				data: vendor,
			}),
			successMessage: "Vendor updated successfully",
			errorContext: "Update vendor",
		}),
	});
}

export function useDeleteVendorMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		...vendorMutations.delete(),
		...createMutationCallbacks(queryClient, {
			invalidate: [vendorQueries.lists(), ownerDashboardKeys.all],
			successMessage: "Vendor removed",
			errorContext: "Remove vendor",
		}),
	});
}
