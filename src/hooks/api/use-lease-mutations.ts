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
import { logger } from '#lib/frontend-logger'
import type { Lease } from '#types/core'
import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'
import { tenantQueries } from './query-keys/tenant-keys'
import { unitQueries } from './query-keys/unit-keys'

import { leaseQueries } from './query-keys/lease-keys'
import { leaseMutations } from './query-keys/lease-mutation-options'
import { ownerDashboardKeys } from './use-owner-dashboard'

/**
 * Mutation hook to delete a lease with optimistic removal
 */
export function useDeleteLeaseOptimisticMutation(options?: {
	onSuccess?: () => void
	onError?: (error: Error) => void
}) {
	const queryClient = useQueryClient()

	const callbacks = createMutationCallbacks<
		string,
		string,
		{
			previousDetail: Lease | undefined
			previousLists: [
				readonly unknown[],
				(
					| {
							data: Lease[]
							total?: number
							limit?: number
							offset?: number
					  }
					| undefined
				)
			][]
		}
	>(queryClient, {
		invalidate: [
			leaseQueries.lists(),
			leaseQueries.stats().queryKey,
			ownerDashboardKeys.all
		],
		errorContext: 'Delete lease',
		onSuccessExtra: () => {
			logger.info('Lease deleted successfully')
			options?.onSuccess?.()
		},
		optimistic: {
			cancel: id => [leaseQueries.detail(id).queryKey, leaseQueries.lists()],
			snapshot: (qc, id) => ({
				previousDetail: qc.getQueryData<Lease>(
					leaseQueries.detail(id).queryKey
				),
				previousLists: qc.getQueriesData<{
					data: Lease[]
					total?: number
					limit?: number
					offset?: number
				}>({ queryKey: leaseQueries.lists() })
			}),
			apply: (qc, id) => {
				qc.removeQueries({
					queryKey: leaseQueries.detail(id).queryKey
				})
				qc.setQueriesData<{
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
			},
			rollback: (qc, context, id) => {
				if (context.previousDetail) {
					qc.setQueryData(
						leaseQueries.detail(id).queryKey,
						context.previousDetail
					)
				}
				if (context.previousLists) {
					context.previousLists.forEach(([queryKey, data]) => {
						qc.setQueryData(queryKey, data)
					})
				}
			}
		}
	})

	return useMutation({
		...leaseMutations.deleteOptimistic(),
		...callbacks,
		// Dual error handling: factory shows standard toast via handleMutationError;
		// options.onError is for caller-specific side effects (e.g., navigation, dialog close).
		onError: (err, vars, ctx) => {
			callbacks.onError(err, vars, ctx)
			options?.onError?.(
				err instanceof Error ? err : new Error(String(err))
			)
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
		...createMutationCallbacks(queryClient, {
			invalidate: [
				leaseQueries.lists(),
				tenantQueries.lists(),
				unitQueries.lists(),
				ownerDashboardKeys.all
			],
			successMessage: 'Lease created successfully',
			errorContext: 'Create lease'
		})
	})
}

/**
 * Update lease mutation
 */
export function useUpdateLeaseMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...leaseMutations.update(),
		...createMutationCallbacks<Lease>(queryClient, {
			invalidate: [
				leaseQueries.lists(),
				tenantQueries.lists(),
				unitQueries.lists(),
				ownerDashboardKeys.all
			],
			updateDetail: lease => ({
				queryKey: leaseQueries.detail(lease.id).queryKey,
				data: lease
			}),
			successMessage: 'Lease updated successfully',
			errorContext: 'Update lease'
		})
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
		...createMutationCallbacks<unknown, string>(queryClient, {
			invalidate: [
				leaseQueries.lists(),
				tenantQueries.lists(),
				unitQueries.lists(),
				ownerDashboardKeys.all
			],
			removeDetail: (_data, deletedId) =>
				leaseQueries.detail(deletedId).queryKey,
			successMessage: 'Lease deleted successfully',
			errorContext: 'Delete lease'
		})
	})
}
