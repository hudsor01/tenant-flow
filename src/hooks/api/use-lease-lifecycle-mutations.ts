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
import { handleMutationError } from '#lib/mutation-error-handler'
import { tenantQueries } from './query-keys/tenant-keys'
import { unitQueries } from './query-keys/unit-keys'
import { toast } from 'sonner'

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
		onSuccess: _terminatedLease => {
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease terminated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Terminate lease')
		}
	})
}

/**
 * Renew lease mutation
 */
export function useRenewLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.renew(),
		onSuccess: renewedLease => {
			queryClient.setQueryData(
				leaseQueries.detail(renewedLease.id).queryKey,
				renewedLease
			)
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease renewed successfully')
		},
		onError: error => {
			handleMutationError(error, 'Renew lease')
		}
	})
}
