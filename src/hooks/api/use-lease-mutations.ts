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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '#lib/frontend-logger.js'
import type { Lease } from '#types/core'
import { handleMutationError } from '#lib/mutation-error-handler'
import { tenantQueries } from './query-keys/tenant-keys'
import { unitQueries } from './query-keys/unit-keys'
import { toast } from 'sonner'

import { leaseQueries } from './query-keys/lease-keys'
import { leaseMutations } from './query-keys/lease-mutation-options'
import { ownerDashboardKeys } from './use-owner-dashboard'

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook to delete a lease with optimistic removal
 */
export function useDeleteLeaseOptimisticMutation(options?: {
	onSuccess?: () => void
	onError?: (error: Error) => void
}) {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.deleteOptimistic(),
		onMutate: async (id: string) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: leaseQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: leaseQueries.lists() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Lease>(
				leaseQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<{
				data: Lease[]
				total?: number
				limit?: number
				offset?: number
			}>({ queryKey: leaseQueries.lists() })

			// Optimistically remove from all caches
			queryClient.removeQueries({ queryKey: leaseQueries.detail(id).queryKey })
			queryClient.setQueriesData<{
				data: Lease[]
				total?: number
				limit?: number
				offset?: number
			}>({ queryKey: leaseQueries.lists() }, old =>
				old
					? {
							...old,
							data: old.data.filter(lease => lease.id !== id),
							total: (old.total ?? old.data.length) - 1
						}
					: old
			)

			return { previousDetail, previousLists }
		},
		onError: (err, id, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					leaseQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to delete lease', {
				lease_id: id,
				error: err instanceof Error ? err.message : String(err)
			})

			options?.onError?.(err instanceof Error ? err : new Error(String(err)))
		},
		onSuccess: id => {
			logger.info('Lease deleted successfully', { lease_id: id })
			options?.onSuccess?.()
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.stats().queryKey })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
		}
	})
}

/**
 * Create lease mutation
 */
export function useCreateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.create(),
		onSuccess: _newLease => {
			// Invalidate lease, tenant, and unit lists
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease created successfully')
		},
		onError: error => {
			handleMutationError(error, 'Create lease')
		}
	})
}

/**
 * Update lease mutation
 */
export function useUpdateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.update(),
		onSuccess: updatedLease => {
			// Update the specific lease in cache
			queryClient.setQueryData(
				leaseQueries.detail(updatedLease.id).queryKey,
				updatedLease
			)
			// Invalidate lists
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update lease')
		}
	})
}

/**
 * Delete lease mutation (simplified version)
 * Use useDeleteLeaseOptimisticMutation for optimistic updates
 */
export function useDeleteLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.delete(),
		onSuccess: (_result, deletedId) => {
			// Remove from cache
			queryClient.removeQueries({
				queryKey: leaseQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Lease deleted successfully')
		},
		onError: error => {
			handleMutationError(error, 'Delete lease')
		}
	})
}
