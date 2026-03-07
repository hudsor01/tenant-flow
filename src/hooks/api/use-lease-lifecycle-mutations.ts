/**
 * Lease Lifecycle Mutation Hooks
 * Terminate and renew lease operations.
 *
 * Split from use-lease-mutations.ts for the 300-line file size rule.
 * Core CRUD mutations remain in use-lease-mutations.ts.
 * Signature mutations are in use-lease-signature-mutations.ts.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Lease } from '#shared/types/core'
import { handleMutationError } from '#lib/mutation-error-handler'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { createClient } from '#lib/supabase/client'
import { tenantQueries } from './query-keys/tenant-keys'
import { unitQueries } from './query-keys/unit-keys'
import { toast } from 'sonner'

import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

/**
 * Terminate lease mutation
 */
export function useTerminateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.leases.terminate,
		mutationFn: async (id: string): Promise<Lease> => {
			const supabase = createClient()
			const { data: updated, error } = await supabase
				.from('leases')
				.update({ lease_status: 'terminated', end_date: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'leases')

			return updated as unknown as Lease
		},
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
		mutationKey: mutationKeys.leases.renew,
		mutationFn: async ({ id, data }: { id: string; data: { end_date: string } }): Promise<Lease> => {
			const supabase = createClient()
			const { data: updated, error } = await supabase
				.from('leases')
				.update({ end_date: data.end_date, lease_status: 'active' })
				.eq('id', id)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'leases')

			return updated as unknown as Lease
		},
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
