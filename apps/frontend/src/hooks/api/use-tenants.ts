<<<<<<< HEAD
// apiClient import removed as it's not used directly in this file
=======
import { apiClient } from '@/lib/api-client'
>>>>>>> origin/main
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
<<<<<<< HEAD
import { tenantApi } from '@/lib/api/tenants'
import type { TenantStats } from '@repo/shared'
=======
import { tenantApi, tenantKeys, type TenantStats } from '@/lib/api/tenants'
>>>>>>> origin/main
import type {
	Tenant,
	TenantQuery,
	CreateTenantInput,
	UpdateTenantInput
} from '@repo/shared'
<<<<<<< HEAD
import { queryKeys } from '@/lib/react-query/query-keys'
=======
>>>>>>> origin/main

/**
 * Fetch list of tenants with optional filters
 */
export function useTenants(
	query?: TenantQuery,
	options?: { enabled?: boolean }
<<<<<<< HEAD
): UseQueryResult<Tenant[]> {
	return useQuery({
		queryKey: queryKeys.tenants.list(query),
		queryFn: async () => tenantApi.getAll(query),
=======
): UseQueryResult<Tenant[], Error> {
	return useQuery({
		queryKey: tenantKeys.list(query),
		queryFn: () => tenantApi.getAll(query),
>>>>>>> origin/main
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
<<<<<<< HEAD
): UseQueryResult<Tenant> {
	return useQuery({
		queryKey: queryKeys.tenants.detail(id),
		queryFn: async () => tenantApi.getById(id),
=======
): UseQueryResult<Tenant, Error> {
	return useQuery({
		queryKey: tenantKeys.detail(id),
		queryFn: () => tenantApi.getById(id),
>>>>>>> origin/main
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch tenant statistics
 */
<<<<<<< HEAD
export function useTenantStats(): UseQueryResult<TenantStats> {
	return useQuery({
		queryKey: queryKeys.tenants.stats(),
=======
export function useTenantStats(): UseQueryResult<TenantStats, Error> {
	return useQuery({
		queryKey: tenantKeys.stats(),
>>>>>>> origin/main
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
<<<<<<< HEAD
): UseQueryResult<Tenant[]> {
	return useQuery({
		queryKey: queryKeys.tenants.byProperty(propertyId),
		queryFn: async () => tenantApi.getByProperty(propertyId),
=======
): UseQueryResult<Tenant[], Error> {
	return useQuery({
		queryKey: tenantKeys.byProperty(propertyId),
		queryFn: () => tenantApi.getByProperty(propertyId),
>>>>>>> origin/main
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
<<<<<<< HEAD
			await queryClient.cancelQueries({
				queryKey: queryKeys.tenants.lists()
			})

			// Snapshot the previous value
			const previousTenants = queryClient.getQueryData(
				queryKeys.tenants.lists()
			)

			// Optimistically update all tenant lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tenants.lists() },
				(old: Tenant[] | undefined) => {
					if (!old) {
						return []
					}
=======
			await queryClient.cancelQueries({ queryKey: tenantKeys.lists() })

			// Snapshot the previous value
			const previousTenants = queryClient.getQueryData(tenantKeys.lists())

			// Optimistically update all tenant lists
			queryClient.setQueriesData(
				{ queryKey: tenantKeys.lists() },
				(old: Tenant[] | undefined) => {
					if (!old) return []
>>>>>>> origin/main
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
<<<<<<< HEAD
					{ queryKey: queryKeys.tenants.lists() },
=======
					{ queryKey: tenantKeys.lists() },
>>>>>>> origin/main
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
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: tenantKeys.lists() })
			queryClient.invalidateQueries({ queryKey: tenantKeys.stats() })
>>>>>>> origin/main
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
<<<<<<< HEAD
		mutationFn: async ({ id, data }) => tenantApi.update(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this tenant
			await queryClient.cancelQueries({
				queryKey: queryKeys.tenants.detail(id)
			})
			await queryClient.cancelQueries({
				queryKey: queryKeys.tenants.lists()
			})

			// Snapshot the previous values
			const previousTenant = queryClient.getQueryData(
				queryKeys.tenants.detail(id)
			)
			const previousList = queryClient.getQueryData(
				queryKeys.tenants.lists()
			)

			// Optimistically update tenant detail
			queryClient.setQueryData(
				queryKeys.tenants.detail(id),
=======
		mutationFn: ({ id, data }) => tenantApi.update(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this tenant
			await queryClient.cancelQueries({ queryKey: tenantKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: tenantKeys.lists() })

			// Snapshot the previous values
			const previousTenant = queryClient.getQueryData(
				tenantKeys.detail(id)
			)
			const previousList = queryClient.getQueryData(tenantKeys.lists())

			// Optimistically update tenant detail
			queryClient.setQueryData(
				tenantKeys.detail(id),
>>>>>>> origin/main
				(old: Tenant | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update tenant in lists
			queryClient.setQueriesData(
<<<<<<< HEAD
				{ queryKey: queryKeys.tenants.lists() },
=======
				{ queryKey: tenantKeys.lists() },
>>>>>>> origin/main
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
<<<<<<< HEAD
					queryKeys.tenants.detail(id),
=======
					tenantKeys.detail(id),
>>>>>>> origin/main
					context.previousTenant
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
<<<<<<< HEAD
					{ queryKey: queryKeys.tenants.lists() },
=======
					{ queryKey: tenantKeys.lists() },
>>>>>>> origin/main
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
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) })
			queryClient.invalidateQueries({ queryKey: tenantKeys.lists() })
			queryClient.invalidateQueries({ queryKey: tenantKeys.stats() })
>>>>>>> origin/main
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
<<<<<<< HEAD
			await queryClient.cancelQueries({
				queryKey: queryKeys.tenants.lists()
			})

			// Snapshot previous list
			const previousList = queryClient.getQueryData(
				queryKeys.tenants.lists()
			)

			// Optimistically remove tenant from lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tenants.lists() },
=======
			await queryClient.cancelQueries({ queryKey: tenantKeys.lists() })

			// Snapshot previous list
			const previousList = queryClient.getQueryData(tenantKeys.lists())

			// Optimistically remove tenant from lists
			queryClient.setQueriesData(
				{ queryKey: tenantKeys.lists() },
>>>>>>> origin/main
				(old: Tenant[] | undefined) =>
					old?.filter(tenant => tenant.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
<<<<<<< HEAD
					{ queryKey: queryKeys.tenants.lists() },
=======
					{ queryKey: tenantKeys.lists() },
>>>>>>> origin/main
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
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.stats()
			})
=======
			queryClient.invalidateQueries({ queryKey: tenantKeys.lists() })
			queryClient.invalidateQueries({ queryKey: tenantKeys.stats() })
>>>>>>> origin/main
		}
	})
}
