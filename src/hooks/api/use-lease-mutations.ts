/**
 * Lease Mutation Hooks
 * TanStack Query mutation hooks for lease management
 *
 * Split from use-lease.ts for the 300-line file size rule.
 * Query hooks remain in use-lease.ts.
 *
 * mutationFn logic lives in leaseMutations factories (query-keys/lease-mutation-options.ts).
 * Signature mutations are in use-lease-signature-mutations.ts.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";
import type { LeaseUpdateInput } from "#lib/validation/leases";
import type { Lease } from "#types/core";
import { leaseQueries } from "./query-keys/lease-keys";
import { leaseMutations } from "./query-keys/lease-mutation-options";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";
import { tenantQueries } from "./query-keys/tenant-keys";
import { unitQueries } from "./query-keys/unit-keys";

/**
 * Create lease mutation
 */
export function useCreateLeaseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.create(),
		...createMutationCallbacks(queryClient, {
			invalidate: [
				leaseQueries.lists(),
				tenantQueries.lists(),
				unitQueries.all(),
				ownerDashboardKeys.all,
			],
			successMessage: "Lease created successfully",
			errorContext: "Create lease",
		}),
	});
}

/**
 * Update lease mutation
 */
export function useUpdateLeaseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.update(),
		...createMutationCallbacks<Lease, { id: string; data: LeaseUpdateInput }>(
			queryClient,
			{
				// update() returns a bare row (no units/tenants embeds), so it must
				// NOT be written into the detail cache (superset rule). Invalidate the
				// detail key so it refetches the embed-carrying shape.
				invalidate: ({ id }) => [
					leaseQueries.lists(),
					leaseQueries.detail(id).queryKey,
					tenantQueries.lists(),
					unitQueries.all(),
					ownerDashboardKeys.all,
				],
				successMessage: "Lease updated successfully",
				errorContext: "Update lease",
			},
		),
	});
}
