/**
 * Leases Hooks
 * Phase 6.3: Lease Renewals
 *
 * TanStack Query hooks for lease management
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { leasesApi, type RenewLeaseRequest } from '@/lib/api/leases'
import { toast } from 'sonner'

/**
 * Query keys for leases
 */
export const leasesKeys = {
	all: ['leases'] as const,
	detail: (id: string) => ['lease', id] as const
}

/**
 * Renew a lease
 */
export function useRenewLease() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ leaseId, data }: { leaseId: string; data: RenewLeaseRequest }) =>
			leasesApi.renew(leaseId, data),
		onSuccess: (newLease, variables) => {
			// Update leases list cache (insert or replace)
			queryClient.setQueryData<import('@repo/shared/types/core').Lease[] | undefined>(leasesKeys.all, (old) => {
				if (!old) return old
				if (Array.isArray(old)) return old.map((l) => (l.id === newLease.id ? newLease : l))
				return old
			})
			// Update detail cache for the original lease id and new lease id if changed
			queryClient.setQueryData(leasesKeys.detail(variables.leaseId), newLease)
			if (newLease.id !== variables.leaseId) {
				queryClient.setQueryData(leasesKeys.detail(newLease.id), newLease)
			}

			const hasRentIncrease = variables.data.rentAmount !== undefined

			toast.success('Lease renewed successfully', {
				description: hasRentIncrease
					? `New lease created with updated rent amount`
					: `New lease created with same rent amount`
			})
		},
		onError: (error: Error) => {
			toast.error('Failed to renew lease', {
				description: error.message
			})
		}
	})
}
