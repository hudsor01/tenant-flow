/**
 * Tenant Mutation Hooks
 * TanStack Query mutation hooks for tenant management.
 * Split from use-tenant.ts for the 300-line file size rule.
 *
 * mutationFn logic lives in tenantMutations factories (query-keys/tenant-mutation-options.ts).
 * This file spreads factories and adds onSuccess/onError/onSettled callbacks.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { handleMutationSuccess } from '#lib/mutation-error-handler'
import { incrementVersion } from '#lib/utils/optimistic-locking'
import type { Tenant, TenantWithLeaseInfo, TenantWithLeaseInfoWithVersion } from '#types/core'
import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'

import { tenantQueries } from './query-keys/tenant-keys'
import { tenantMutations } from './query-keys/tenant-mutation-options'
import { leaseQueries } from './query-keys/lease-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

/**
 * Create tenant mutation
 * Note: tenants table requires user_id FK to auth.users.
 */
export function useCreateTenantMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		...tenantMutations.create(),
		...createMutationCallbacks(queryClient, {
			invalidate: [tenantQueries.lists(), ownerDashboardKeys.all],
			successMessage: 'Tenant created successfully',
			errorContext: 'Create tenant'
		})
	})
}

/** Update tenant mutation */
export function useUpdateTenantMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		...tenantMutations.update(),
		...createMutationCallbacks<TenantWithLeaseInfo>(queryClient, {
			invalidate: [tenantQueries.lists(), ownerDashboardKeys.all],
			updateDetail: tenant => ({
				queryKey: tenantQueries.detail(tenant.id).queryKey,
				data: tenant
			}),
			successMessage: 'Tenant updated successfully',
			errorContext: 'Update tenant'
		})
	})
}

/**
 * Delete tenant mutation
 * Soft-delete: sets tenant status to 'inactive' after checking for active leases.
 */
export function useDeleteTenantMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		...tenantMutations.delete(),
		...createMutationCallbacks<unknown, string>(queryClient, {
			invalidate: [
				tenantQueries.lists(),
				leaseQueries.lists(),
				ownerDashboardKeys.all
			],
			removeDetail: (_data, deletedId) =>
				tenantQueries.detail(deletedId).queryKey,
			successMessage: 'Tenant deleted successfully',
			errorContext: 'Delete tenant'
		})
	})
}

/**
 * Mark tenant as moved out (soft delete)
 * Follows industry-standard 7-year retention pattern.
 */
export function useMarkTenantAsMovedOutMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...tenantMutations.markMovedOut(),
		...createMutationCallbacks<
			TenantWithLeaseInfo | null,
			{ id: string },
			{
				previousDetail: Tenant | undefined
				previousWithLease: TenantWithLeaseInfo | undefined
				previousList: TenantWithLeaseInfo[] | undefined
				id: string
			}
		>(queryClient, {
			invalidate: ({ id }) => [
				tenantQueries.detail(id).queryKey,
				tenantQueries.withLease(id).queryKey,
				tenantQueries.lists(),
				ownerDashboardKeys.all
			],
			errorContext: 'Mark tenant as moved out',
			onSuccessExtra: data => {
				handleMutationSuccess(
					'Mark tenant as moved out',
					`${data?.name ?? 'Tenant'} has been marked as moved out`
				)
			},
			optimistic: {
				cancel: ({ id }) => [
					tenantQueries.detail(id).queryKey,
					tenantQueries.withLease(id).queryKey,
					tenantQueries.lists()
				],
				snapshot: (qc, { id }) => ({
					previousDetail: qc.getQueryData<Tenant>(
						tenantQueries.detail(id).queryKey
					),
					previousWithLease: qc.getQueryData<TenantWithLeaseInfo>(
						tenantQueries.withLease(id).queryKey
					),
					previousList: qc.getQueryData<TenantWithLeaseInfo[]>(
						tenantQueries.lists()
					),
					id
				}),
				apply: (qc, { id }) => {
					const updateFn = (
						old: TenantWithLeaseInfoWithVersion | undefined
					) => {
						if (!old) return old
						return incrementVersion(old, {
							updated_at: new Date().toISOString()
						} satisfies Partial<TenantWithLeaseInfoWithVersion>)
					}
					qc.setQueryData<TenantWithLeaseInfoWithVersion>(
						tenantQueries.detail(id).queryKey,
						updateFn
					)
					qc.setQueryData<TenantWithLeaseInfoWithVersion>(
						tenantQueries.withLease(id).queryKey,
						updateFn
					)
					qc.setQueryData<TenantWithLeaseInfo[]>(
						tenantQueries.lists(),
						old => (old ? old.filter(tenant => tenant.id !== id) : old)
					)
				},
				rollback: (qc, context) => {
					if (context.previousDetail)
						qc.setQueryData(
							tenantQueries.detail(context.id).queryKey,
							context.previousDetail
						)
					if (context.previousWithLease)
						qc.setQueryData(
							tenantQueries.withLease(context.id).queryKey,
							context.previousWithLease
						)
					if (context.previousList)
						qc.setQueryData(tenantQueries.lists(), context.previousList)
				}
			}
		})
	})
}
