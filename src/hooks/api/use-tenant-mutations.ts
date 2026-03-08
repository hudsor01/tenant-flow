/**
 * Tenant Mutation Hooks
 * TanStack Query mutation hooks for tenant management.
 * Split from use-tenant.ts for the 300-line file size rule.
 *
 * mutationFn logic lives in tenantMutations factories (query-keys/tenant-mutation-options.ts).
 * This file spreads factories and adds onSuccess/onError/onSettled callbacks.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'
import { toast } from 'sonner'
import { incrementVersion } from '#lib/utils/optimistic-locking.js'
import type { Tenant, TenantWithLeaseInfo, TenantWithLeaseInfoWithVersion } from '#types/core'

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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Tenant created successfully')
		},
		onError: error => handleMutationError(error, 'Create tenant')
	})
}

/** Update tenant mutation */
export function useUpdateTenantMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		...tenantMutations.update(),
		onSuccess: updatedTenant => {
			queryClient.setQueryData(tenantQueries.detail(updatedTenant.id).queryKey, updatedTenant)
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Tenant updated successfully')
		},
		onError: error => handleMutationError(error, 'Update tenant')
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
		onSuccess: (_result, deletedId) => {
			queryClient.removeQueries({ queryKey: tenantQueries.detail(deletedId).queryKey })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Tenant deleted successfully')
		},
		onError: error => handleMutationError(error, 'Delete tenant')
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
		onMutate: async ({ id }) => {
			await queryClient.cancelQueries({ queryKey: tenantQueries.detail(id).queryKey })
			await queryClient.cancelQueries({ queryKey: tenantQueries.withLease(id).queryKey })
			await queryClient.cancelQueries({ queryKey: tenantQueries.lists() })
			const previousDetail = queryClient.getQueryData<TenantWithLeaseInfo>(tenantQueries.detail(id).queryKey)
			const previousWithLease = queryClient.getQueryData<TenantWithLeaseInfo>(tenantQueries.withLease(id).queryKey)
			const previousList = queryClient.getQueryData<TenantWithLeaseInfo[]>(tenantQueries.lists())
			const updateFn = (old: TenantWithLeaseInfoWithVersion | undefined) => {
				if (!old) return old
				return incrementVersion(old, { updated_at: new Date().toISOString() } as Partial<TenantWithLeaseInfoWithVersion>) as TenantWithLeaseInfoWithVersion
			}
			queryClient.setQueryData<TenantWithLeaseInfoWithVersion>(tenantQueries.detail(id).queryKey, updateFn)
			queryClient.setQueryData<TenantWithLeaseInfoWithVersion>(tenantQueries.withLease(id).queryKey, updateFn)
			queryClient.setQueryData<TenantWithLeaseInfo[]>(tenantQueries.lists(), old => old ? old.filter(tenant => tenant.id !== id) : old)
			return { previousDetail, previousWithLease, previousList, id }
		},
		onError: (err, _variables, context) => {
			if (context) {
				if (context.previousDetail) queryClient.setQueryData(tenantQueries.detail(context.id).queryKey, context.previousDetail as unknown as Tenant)
				if (context.previousWithLease) queryClient.setQueryData(tenantQueries.withLease(context.id).queryKey, context.previousWithLease)
				if (context.previousList) queryClient.setQueryData(tenantQueries.lists(), context.previousList)
			}
			handleMutationError(err, 'Mark tenant as moved out')
		},
		onSuccess: data => {
			handleMutationSuccess('Mark tenant as moved out', `${data?.name ?? 'Tenant'} has been marked as moved out`)
		},
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: tenantQueries.detail(variables.id).queryKey })
			queryClient.invalidateQueries({ queryKey: tenantQueries.withLease(variables.id).queryKey })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
		}
	})
}
