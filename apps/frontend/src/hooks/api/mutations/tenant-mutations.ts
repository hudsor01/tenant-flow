/**
 * Tenant Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and cache invalidation.
 * Uses apiRequest for NestJS calls.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'
import type { TenantCreate, TenantUpdate } from '@repo/shared/validation/tenants'
import type { Tenant } from '@repo/shared/types/core'
import { tenantQueries } from '../queries/tenant-queries'
import { leaseQueries } from '../queries/lease-queries'
import { createCrudMutations } from '../crud-mutations'

const {
	useCreateMutation: useCreateTenantMutationBase,
	useUpdateMutation: useUpdateTenantMutationBase
} = createCrudMutations<TenantCreate, TenantUpdate, Tenant>({
	entityName: 'Tenant',
	createEndpoint: '/api/v1/tenants',
	updateEndpoint: (id) => `/api/v1/tenants/${id}`,
	deleteEndpoint: (id) => `/api/v1/tenants/${id}`,
	listQueryKey: tenantQueries.lists,
	detailQueryKey: (id) => tenantQueries.detail(id).queryKey
})

/**
 * Create tenant mutation
 */
export const useCreateTenantMutation = useCreateTenantMutationBase

/**
 * Update tenant mutation
 */
export function useUpdateTenantMutation() {
	const mutation = useUpdateTenantMutationBase()

	return {
		...mutation,
		mutate: ({ id, data }: { id: string; data: TenantUpdate }) =>
			mutation.mutate({
				id,
				data
			})
	}
}

/**
 * Delete tenant mutation
 */
export function useDeleteTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) =>
			apiRequest<void>(`/api/v1/tenants/${id}`, { method: 'DELETE' }),
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
