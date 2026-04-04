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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Lease } from '#types/core'
import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'
import { tenantQueries } from './query-keys/tenant-keys'
import { unitQueries } from './query-keys/unit-keys'

import { leaseQueries } from './query-keys/lease-keys'
import { leaseMutations } from './query-keys/lease-mutation-options'
import { ownerDashboardKeys } from './use-owner-dashboard'

/**
 * Terminate lease mutation
 */
export function useTerminateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.terminate(),
		...createMutationCallbacks(queryClient, {
			invalidate: [
				leaseQueries.lists(),
				tenantQueries.lists(),
				unitQueries.lists(),
				ownerDashboardKeys.all
			],
			successMessage: 'Lease terminated successfully',
			errorContext: 'Terminate lease'
		})
	})
}

/**
 * Renew lease mutation
 */
export function useRenewLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.renew(),
		...createMutationCallbacks<Lease>(queryClient, {
			invalidate: [leaseQueries.lists(), ownerDashboardKeys.all],
			updateDetail: lease => ({
				queryKey: leaseQueries.detail(lease.id).queryKey,
				data: lease
			}),
			successMessage: 'Lease renewed successfully',
			errorContext: 'Renew lease'
		})
	})
}
