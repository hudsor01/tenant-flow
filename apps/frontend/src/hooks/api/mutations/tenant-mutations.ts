/**
 * Tenant Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import type { CreateTenantInput, UpdateTenantInput } from '@repo/shared/types/api-contracts'
import type { Tenant } from '@repo/shared/types/core'
import { tenantQueries } from '../queries/tenant-queries'
import { leaseQueries } from '../queries/lease-queries'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

/**
 * Create tenant mutation
 */
export function useCreateTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateTenantInput) =>
			clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: (_newTenant) => {
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			toast.success('Tenant created successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Create tenant')
		}
	})
}

/**
 * Update tenant mutation
 */
export function useUpdateTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data, version }: { id: string; data: UpdateTenantInput; version?: number }) =>
			clientFetch<Tenant>(`/api/v1/tenants/${id}`, {
				method: 'PUT',
				body: JSON.stringify(version ? { ...data, version } : data)
			}),
		onSuccess: (updatedTenant) => {
			queryClient.setQueryData(
				tenantQueries.detail(updatedTenant.id).queryKey,
				updatedTenant
			)
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			toast.success('Tenant updated successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Update tenant')
		}
	})
}

/**
 * Delete tenant mutation
 */
export function useDeleteTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			clientFetch(`/api/v1/tenants/${id}`, {
				method: 'DELETE'
			}),
		onSuccess: (_result, deletedId) => {
			queryClient.removeQueries({ queryKey: tenantQueries.detail(deletedId).queryKey })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			toast.success('Tenant deleted successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete tenant')
		}
	})
}