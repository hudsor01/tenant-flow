/**
 * Lease Lifecycle Mutation Hooks
 * Terminate and renew lease operations.
 *
 * Split from use-lease-mutations.ts for the 300-line file size rule.
 * Core CRUD mutations remain in use-lease-mutations.ts.
 * Signature mutations are in use-lease-signature-mutations.ts.
 *
 * mutationFn logic lives in leaseMutations factories (query-keys/lease-mutation-options.ts).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";
import type { Lease } from "#types/core";
import { leaseQueries } from "./query-keys/lease-keys";
import { leaseMutations } from "./query-keys/lease-mutation-options";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";
import { tenantQueries } from "./query-keys/tenant-keys";
import { unitQueries } from "./query-keys/unit-keys";

/**
 * Terminate lease mutation
 */
export function useTerminateLeaseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.terminate(),
		...createMutationCallbacks(queryClient, {
			invalidate: [
				leaseQueries.lists(),
				tenantQueries.lists(),
				unitQueries.all(),
				ownerDashboardKeys.all,
			],
			successMessage: "Lease terminated successfully",
			errorContext: "Terminate lease",
		}),
	});
}

/**
 * Renew lease mutation
 */
export function useRenewLeaseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.renew(),
		...createMutationCallbacks<
			Lease,
			{ id: string; data: { end_date: string; rent_amount?: number } }
		>(queryClient, {
			// renew() returns a bare row (no units/tenants embeds), so it must NOT
			// be written into the detail cache (superset rule). Invalidate the detail
			// key so it refetches the embed-carrying shape. Renewing also flips
			// lease_status to 'active' (unit status via trigger) and changes
			// end_date/rent_amount embedded in tenant list rows — invalidate those too.
			invalidate: ({ id }) => [
				leaseQueries.lists(),
				leaseQueries.detail(id).queryKey,
				tenantQueries.lists(),
				unitQueries.all(),
				ownerDashboardKeys.all,
			],
			successMessage: "Lease renewed successfully",
			errorContext: "Renew lease",
		}),
	});
}
