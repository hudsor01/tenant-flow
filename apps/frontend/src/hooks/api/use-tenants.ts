// apiClient import removed as it's not used directly in this file
/**
 * React Query hooks for Tenants
 * Native TanStack Query implementation - no custom abstractions
 */
import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { tenantApi } from '@/lib/api/tenants'
import type { TenantStats } from '@repo/shared'
import type {
	Tenant,
	TenantQuery,
	CreateTenantInput,
	UpdateTenantInput
} from '@repo/shared'
import { queryKeys } from '@/lib/react-query/query-keys'

/**
 * Fetch list of tenants with optional filters
 */
export function useTenants(
	query?: TenantQuery,
	options?: { enabled?: boolean }
): UseQueryResult<Tenant[]> {
	return useQuery({
		queryKey: queryKeys.tenants.list(query),
		queryFn: async () => tenantApi.getAll(query),
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Fetch single tenant by ID
 */
export function useTenant(
	id: string,
	options?: { enabled?: boolean }
): UseQueryResult<Tenant> {
	return useQuery({
		queryKey: queryKeys.tenants.detail(id),
		queryFn: async () => tenantApi.getById(id),
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch tenant statistics
 */
export function useTenantStats(): UseQueryResult<TenantStats> {
	return useQuery({
		queryKey: queryKeys.tenants.stats(),
		queryFn: tenantApi.getStats,
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

/**
 * Fetch tenants by property ID
 */
export function useTenantsByProperty(
	propertyId: string,
	options?: { enabled?: boolean }
): UseQueryResult<Tenant[]> {
	return useQuery({
		queryKey: queryKeys.tenants.byProperty(propertyId),
		queryFn: async () => tenantApi.getByProperty(propertyId),
		enabled: Boolean(propertyId) && (options?.enabled ?? true),
		staleTime: 5 * 60 * 1000 // 5 minutes
	})
}

/**
 * Create new tenant with optimistic updates
 */
export function useCreateTenant(): UseMutationResult<
	Tenant,
	Error,
	CreateTenantInput
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: tenantApi.create,
		onMutate: async newTenant => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.tenants.lists() })

			// Snapshot the previous value
			const previousTenants = queryClient.getQueryData(queryKeys.tenants.lists())

			// Optimistically update all tenant lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tenants.lists() },
				(old: Tenant[] | undefined) => {
					if (!old) {return []}
					return [
						...old,
						{
							...newTenant,
							id: `temp-${Date.now()}`,
							createdAt: new Date(),
							updatedAt: new Date()
						} as Tenant
					]
				}
			)

			return { previousTenants }
		},
		onError: (err, newTenant, context) => {
			// Revert optimistic update on error
			if (context?.previousTenants) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.tenants.lists() },
					context.previousTenants
				)
			}
			toast.error('Failed to create tenant')
		},
		onSuccess: () => {
			toast.success('Tenant created successfully')
		},
		onSettled: () => {
			// Always refetch after error or success
			void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
			void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.stats() })
		}
	})
}

/**
 * Update tenant with optimistic updates
 */
export function useUpdateTenant(): UseMutationResult<
	Tenant,
	Error,
	{ id: string; data: UpdateTenantInput }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data }) => tenantApi.update(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this tenant
			await queryClient.cancelQueries({ queryKey: queryKeys.tenants.detail(id) })
			await queryClient.cancelQueries({ queryKey: queryKeys.tenants.lists() })

			// Snapshot the previous values
			const previousTenant = queryClient.getQueryData(
				queryKeys.tenants.detail(id)
			)
			const previousList = queryClient.getQueryData(queryKeys.tenants.lists())

			// Optimistically update tenant detail
			queryClient.setQueryData(
				queryKeys.tenants.detail(id),
				(old: Tenant | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update tenant in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tenants.lists() },
				(old: Tenant[] | undefined) =>
					old?.map(tenant =>
						tenant.id === id
							? { ...tenant, ...data, updatedAt: new Date() }
							: tenant
					)
			)

			return { previousTenant, previousList }
		},
		onError: (err, { id }, context) => {
			// Revert optimistic updates on error
			if (context?.previousTenant) {
				queryClient.setQueryData(
					queryKeys.tenants.detail(id),
					context.previousTenant
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.tenants.lists() },
					context.previousList
				)
			}
			toast.error('Failed to update tenant')
		},
		onSuccess: () => {
			toast.success('Tenant updated successfully')
		},
		onSettled: (data, err, { id }) => {
			// Refetch to ensure consistency
			void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.detail(id) })
			void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
			void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.stats() })
		}
	})
}

/**
 * Delete tenant with optimistic updates
 */
export function useDeleteTenant(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: tenantApi.delete,
		onMutate: async id => {
			// Cancel queries
			await queryClient.cancelQueries({ queryKey: queryKeys.tenants.lists() })

			// Snapshot previous list
			const previousList = queryClient.getQueryData(queryKeys.tenants.lists())

			// Optimistically remove tenant from lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tenants.lists() },
				(old: Tenant[] | undefined) =>
					old?.filter(tenant => tenant.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.tenants.lists() },
					context.previousList
				)
			}
			toast.error('Failed to delete tenant')
		},
		onSuccess: () => {
			toast.success('Tenant deleted successfully')
		},
		onSettled: () => {
			// Refetch to ensure consistency
			void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
			void queryClient.invalidateQueries({ queryKey: queryKeys.tenants.stats() })
		}
	})
}
