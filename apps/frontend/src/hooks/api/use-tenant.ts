/**
 * Tenant Hooks
 * TanStack Query hooks for tenant management with Zustand store integration
 * React 19 + TanStack Query v5 patterns with Suspense support
 */

import { useTenantStore } from '@/stores/tenant-store'
import { logger } from '@repo/shared/lib/frontend-logger'
import type {
	Tenant,
	TenantInput,
	TenantUpdate,
	TenantWithLeaseInfo
} from '@repo/shared/types/core'
import { apiClient } from '@repo/shared/utils/api-client'
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery
} from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api-client'

/**
 * Query keys for tenant endpoints
 */
export const tenantKeys = {
	all: ['tenants'] as const,
	list: () => [...tenantKeys.all, 'list'] as const,
	detail: (id: string) => [...tenantKeys.all, 'detail', id] as const,
	withLease: (id: string) => [...tenantKeys.all, 'with-lease', id] as const,
	stats: () => [...tenantKeys.all, 'stats'] as const
}

/**
 * Hook to fetch tenant by ID with Zustand store integration
 * Optimized with placeholder data from list cache
 */
export function useTenant(id: string) {
	const addTenant = useTenantStore(state => state.addTenant)

	return useQuery({
		queryKey: tenantKeys.detail(id),
		queryFn: async (): Promise<Tenant> => {
			const response = await apiClient<Tenant>(
				`${API_BASE_URL}/api/v1/tenants/${id}`
			)
			return response
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes cache time
		select: (tenant: Tenant) => {
			// Add to store for caching - convert basic Tenant to TenantWithLeaseInfo format
			const tenantWithLeaseInfo: TenantWithLeaseInfo = {
				id: tenant.id,
				name: tenant.name || '',
				email: tenant.email,
				phone: tenant.phone,
				avatarUrl: tenant.avatarUrl,
				emergencyContact: tenant.emergencyContact,
				createdAt: tenant.createdAt,
				updatedAt: tenant.updatedAt,
				currentLease: null,
				leases: [],
				unit: null,
				property: null,
				monthlyRent: 0, // Default to 0 for basic tenant (no lease info)
				leaseStatus: 'inactive',
				paymentStatus: 'pending',
				unitDisplay: '',
				propertyDisplay: '',
				leaseStart: null,
				leaseEnd: null
			}
			addTenant(tenantWithLeaseInfo)
			return tenantWithLeaseInfo
		}
	})
}

/**
 * Hook to fetch tenant with lease information
 * Optimized with placeholder data from list cache
 */
export function useTenantWithLease(id: string) {
	const addTenant = useTenantStore(state => state.addTenant)

	return useQuery({
		queryKey: tenantKeys.withLease(id),
		queryFn: async (): Promise<TenantWithLeaseInfo> => {
			const response = await apiClient<TenantWithLeaseInfo>(
				`${API_BASE_URL}/api/v1/tenants/${id}/with-lease`
			)
			return response
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes cache time
		retry: 2,
		select: (tenant: TenantWithLeaseInfo) => {
			// Add to store for caching
			addTenant(tenant)
			return tenant
		}
	})
}

/**
 * Hook to fetch tenant list with pagination and Zustand store integration
 * Optimized with prefetching and intelligent caching
 */
export function useTenantList(page: number = 1, limit: number = 50) {
	const setTenants = useTenantStore(state => state.setTenants)
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: [...tenantKeys.list(), { page, limit }],
		queryFn: async () => {
			const response = await apiClient<{
				data: TenantWithLeaseInfo[]
				total: number
				page: number
				limit: number
			}>(`${API_BASE_URL}/api/v1/tenants?page=${page}&limit=${limit}`)

			// Prefetch individual tenant details for faster navigation
			response.data.forEach(tenant => {
				queryClient.setQueryData(tenantKeys.detail(tenant.id), tenant)
				queryClient.setQueryData(tenantKeys.withLease(tenant.id), tenant)
			})

			return response
		},
		staleTime: 3 * 60 * 1000, // 3 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes cache time
		retry: 2,
		// Keep previous data while fetching new page (official v5 helper)
		placeholderData: keepPreviousData,
		select: (response: {
			data: TenantWithLeaseInfo[]
			total: number
			page: number
			limit: number
		}) => {
			// Add all tenants to store for caching
			setTenants(response.data)
			return response
		}
	})
}

/**
 * Hook to fetch all tenants (for dropdowns, selects, etc.)
 * Optimized with aggressive caching for rarely changing data
 */
export function useAllTenants() {
	const setTenants = useTenantStore(state => state.setTenants)
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: tenantKeys.list(),
		queryFn: async (): Promise<TenantWithLeaseInfo[]> => {
			try {
				const response = await apiClient<TenantWithLeaseInfo[]>(
					`${API_BASE_URL}/api/v1/tenants`
				)

				// Prefetch individual tenant details for instant navigation
				response.forEach(tenant => {
					queryClient.setQueryData(tenantKeys.detail(tenant.id), tenant)
					queryClient.setQueryData(tenantKeys.withLease(tenant.id), tenant)
				})

				return response
			} catch (error) {
				logger.error(
					'Failed to fetch tenant list',
					{ action: 'useAllTenants' },
					error
				)
				throw error
			}
		},
		staleTime: 10 * 60 * 1000, // 10 minutes - list data rarely changes
		gcTime: 30 * 60 * 1000, // 30 minutes cache time for dropdown data
		retry: 3, // Retry up to 3 times
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s (max 30s)
		// Enable structural sharing to prevent re-renders when data hasn't changed
		structuralSharing: true,
		select: data => {
			// Add all tenants to store for caching
			setTenants(data)
			return data
		}
	})
}

/**
 * Mutation hook to create a new tenant with enhanced optimistic updates
 * Includes automatic rollback on error with proper context preservation
 * Enhanced with analytics tracking and error handling
 */
export function useCreateTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (tenantData: TenantInput) => {
			const response = await apiClient<TenantWithLeaseInfo>(
				`${API_BASE_URL}/api/v1/tenants`,
				{
					method: 'POST',
					body: JSON.stringify(tenantData)
				}
			)
			return response
		},
		onMutate: async (newTenant: TenantInput) => {
			// Cancel outgoing refetches to prevent overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: tenantKeys.list() })

			// Snapshot previous state for rollback
			const previousList = queryClient.getQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list()
			)

			// Create optimistic tenant entry
			const tempId = `temp-${Date.now()}`
			const optimisticTenant: TenantWithLeaseInfo = {
				id: tempId,
				name: `${newTenant.firstName || ''} ${newTenant.lastName || ''}`.trim(),
				email: newTenant.email || '',
				phone: newTenant.phone || null,
				emergencyContact: newTenant.emergencyContact || null,
				avatarUrl: newTenant.avatarUrl || null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				currentLease: null,
				leases: [],
				unit: null,
				property: null,
				monthlyRent: 0,
				leaseStatus: 'inactive',
				paymentStatus: 'pending',
				unitDisplay: '',
				propertyDisplay: '',
				leaseStart: null,
				leaseEnd: null
			}

			// Optimistically update cache
			queryClient.setQueryData<TenantWithLeaseInfo[]>(tenantKeys.list(), old =>
				old ? [optimisticTenant, ...old] : [optimisticTenant]
			)

			// Return context for rollback
			return { previousList, tempId }
		},
		onError: (err, _variables, context) => {
			// Rollback: restore previous state
			if (context?.previousList) {
				queryClient.setQueryData(tenantKeys.list(), context.previousList)
			}

			// Show user-friendly error message
			logger.error('Failed to create tenant', { error: err })
		},
		onSuccess: (data, _variables, context) => {
			// Replace temporary entry with real data
			queryClient.setQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list(),
				old => {
					if (!old) return [data]
					return old.map(tenant =>
						tenant.id === context?.tempId ? data : tenant
					)
				}
			)

			// Cache individual tenant details
			queryClient.setQueryData(tenantKeys.detail(data.id), data)
			queryClient.setQueryData(tenantKeys.withLease(data.id), data)
		}
	})
}

/**
 * Mutation hook to update an existing tenant with enhanced optimistic updates
 * Includes comprehensive rollback mechanism for both detail and list caches
 */
export function useUpdateTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: TenantUpdate }) => {
			const response = await apiClient<TenantWithLeaseInfo>(
				`${API_BASE_URL}/api/v1/tenants/${id}`,
				{
					method: 'PUT',
					body: JSON.stringify(data)
				}
			)
			return response
		},
		onMutate: async ({ id, data }) => {
			// Cancel all outgoing queries for this tenant
			await queryClient.cancelQueries({ queryKey: tenantKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: tenantKeys.withLease(id) })
			await queryClient.cancelQueries({ queryKey: tenantKeys.list() })

			// Snapshot all relevant caches for comprehensive rollback
			const previousDetail = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id)
			)
			const previousWithLease = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantKeys.withLease(id)
			)
			const previousList = queryClient.getQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list()
			)

			// Optimistically update detail cache
			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id),
				old => {
					if (!old) return old
					return {
						...old,
						...data,
						name:
							data.firstName && data.lastName
								? `${data.firstName} ${data.lastName}`.trim()
								: old.name,
						updatedAt: new Date().toISOString()
					} as TenantWithLeaseInfo
				}
			)

			// Optimistically update with-lease cache
			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantKeys.withLease(id),
				old => {
					if (!old) return old
					return {
						...old,
						...data,
						name:
							data.firstName && data.lastName
								? `${data.firstName} ${data.lastName}`.trim()
								: old.name,
						updatedAt: new Date().toISOString()
					} as TenantWithLeaseInfo
				}
			)

			// Optimistically update list cache
			queryClient.setQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list(),
				old => {
					if (!old) return old
					return old.map(tenant =>
						tenant.id === id
							? ({
									...tenant,
									...data,
									name:
										data.firstName && data.lastName
											? `${data.firstName} ${data.lastName}`.trim()
											: tenant.name,
									updatedAt: new Date().toISOString()
								} as TenantWithLeaseInfo)
							: tenant
					)
				}
			)

			return { previousDetail, previousWithLease, previousList, id }
		},
		onError: (err, _variables, context) => {
			// Comprehensive rollback: restore all caches
			if (context) {
				if (context.previousDetail) {
					queryClient.setQueryData(
						tenantKeys.detail(context.id),
						context.previousDetail
					)
				}
				if (context.previousWithLease) {
					queryClient.setQueryData(
						tenantKeys.withLease(context.id),
						context.previousWithLease
					)
				}
				if (context.previousList) {
					queryClient.setQueryData(tenantKeys.list(), context.previousList)
				}
			}

			// Show user-friendly error message
			logger.error('Failed to update tenant', { error: err })
		},

		onSuccess: data => {
			// Merge server response into all caches
			queryClient.setQueryData(tenantKeys.detail(data.id), data)
			queryClient.setQueryData(tenantKeys.withLease(data.id), data)
			queryClient.setQueryData<TenantWithLeaseInfo[]>(
				tenantKeys.list(),
				old => {
					if (!old) return [data]
					return old.map(tenant => (tenant.id === data.id ? data : tenant))
				}
			)
		}
	})
}

/**
 * Combined hook for tenant operations needed by tenant management pages
 * Note: DELETE operations now use React 19 useOptimistic with Server Actions
 */
export function useTenantOperations() {
	const createTenant = useCreateTenant()
	const updateTenant = useUpdateTenant()

	return {
		createTenant,
		updateTenant,
		isLoading: createTenant.isPending || updateTenant.isPending,
		error: createTenant.error || updateTenant.error
	}
}

/**
 * React 19 Suspense-enabled hook for tenant fetching
 * Use this with Suspense boundaries for automatic loading states
 * Automatically throws errors to nearest Error Boundary
 */
export function useTenantSuspense(id: string) {
	const addTenant = useTenantStore(state => state.addTenant)

	return useSuspenseQuery({
		queryKey: tenantKeys.detail(id),
		queryFn: async (): Promise<Tenant> => {
			const response = await apiClient<Tenant>(
				`${API_BASE_URL}/api/v1/tenants/${id}`
			)
			return response
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		select: (tenant: Tenant) => {
			// Add to store for caching - convert basic Tenant to TenantWithLeaseInfo format
			const tenantWithLeaseInfo: TenantWithLeaseInfo = {
				id: tenant.id,
				name: tenant.name || '',
				email: tenant.email,
				phone: tenant.phone,
				avatarUrl: tenant.avatarUrl,
				emergencyContact: tenant.emergencyContact,
				createdAt: tenant.createdAt,
				updatedAt: tenant.updatedAt,
				currentLease: null,
				leases: [],
				unit: null,
				property: null,
				monthlyRent: 0,
				leaseStatus: 'inactive',
				paymentStatus: 'pending',
				unitDisplay: '',
				propertyDisplay: '',
				leaseStart: null,
				leaseEnd: null
			}
			addTenant(tenantWithLeaseInfo)
			return tenantWithLeaseInfo
		}
	})
}

/**
 * React 19 Suspense-enabled hook for tenant with lease information
 * Use this with Suspense boundaries for automatic loading states
 */
export function useTenantWithLeaseSuspense(id: string) {
	const addTenant = useTenantStore(state => state.addTenant)

	return useSuspenseQuery({
		queryKey: tenantKeys.withLease(id),
		queryFn: async (): Promise<TenantWithLeaseInfo> => {
			const response = await apiClient<TenantWithLeaseInfo>(
				`${API_BASE_URL}/api/v1/tenants/${id}/with-lease`
			)
			return response
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		select: (tenant: TenantWithLeaseInfo) => {
			addTenant(tenant)
			return tenant
		}
	})
}

/**
 * React 19 Suspense-enabled hook for all tenants list
 * Use this with Suspense boundaries for automatic loading states
 */
export function useAllTenantsSuspense() {
	const setTenants = useTenantStore(state => state.setTenants)
	const queryClient = useQueryClient()

	return useSuspenseQuery({
		queryKey: tenantKeys.list(),
		queryFn: async (): Promise<TenantWithLeaseInfo[]> => {
			const response = await apiClient<TenantWithLeaseInfo[]>(
				`${API_BASE_URL}/api/v1/tenants`
			)

			// Prefetch individual tenant details for instant navigation
			response.forEach(tenant => {
				queryClient.setQueryData(tenantKeys.detail(tenant.id), tenant)
				queryClient.setQueryData(tenantKeys.withLease(tenant.id), tenant)
			})

			return response
		},
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		select: data => {
			setTenants(data)
			return data
		}
	})
}

/**
 * Hook for polling tenant data with configurable interval
 * Useful for real-time tenant status updates
 */
export function useTenantPolling(id: string, interval: number = 30000) {
	return useQuery({
		queryKey: [...tenantKeys.detail(id), 'polling'],
		queryFn: async (): Promise<Tenant> => {
			const response = await apiClient<Tenant>(
				`${API_BASE_URL}/api/v1/tenants/${id}`
			)
			return response
		},
		enabled: !!id,
		refetchInterval: interval,
		refetchIntervalInBackground: false,
		staleTime: 0 // Always refetch on interval
	})
}

/**
 * Hook for prefetching tenant data before navigation
 * Call this on hover or before route changes
 */
export function usePrefetchTenant() {
	const queryClient = useQueryClient()

	return {
		prefetchTenant: (id: string) => {
			return queryClient.prefetchQuery({
				queryKey: tenantKeys.detail(id),
				queryFn: async (): Promise<Tenant> => {
					const response = await apiClient<Tenant>(
						`${API_BASE_URL}/api/v1/tenants/${id}`
					)
					return response
				},
				staleTime: 5 * 60 * 1000
			})
		},
		prefetchTenantWithLease: (id: string) => {
			return queryClient.prefetchQuery({
				queryKey: tenantKeys.withLease(id),
				queryFn: async (): Promise<TenantWithLeaseInfo> => {
					const response = await apiClient<TenantWithLeaseInfo>(
						`${API_BASE_URL}/api/v1/tenants/${id}/with-lease`
					)
					return response
				},
				staleTime: 5 * 60 * 1000
			})
		}
	}
}

/**
 * Hook for optimistic tenant updates with automatic rollback
 * Enhanced with proper TypeScript types and error handling
 */
export function useOptimisticTenantUpdate() {
	const queryClient = useQueryClient()

	return {
		updateOptimistically: async (
			id: string,
			updates: Partial<TenantWithLeaseInfo>
		) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: tenantKeys.detail(id) })

			// Snapshot previous value
			const previous = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id)
			)

			// Optimistically update
			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantKeys.detail(id),
				old => {
					if (!old) return old
					return { ...old, ...updates }
				}
			)

			return {
				previous,
				rollback: () => {
					if (previous) {
						queryClient.setQueryData(tenantKeys.detail(id), previous)
					}
				}
			}
		}
	}
}

/**
 * Hook for batch tenant operations
 * Useful for bulk updates/deletes with progress tracking
 */
export function useBatchTenantOperations() {
	const queryClient = useQueryClient()

	return {
		batchUpdate: async (updates: Array<{ id: string; data: TenantUpdate }>) => {
			const results = await Promise.allSettled(
				updates.map(({ id, data }) =>
					apiClient<TenantWithLeaseInfo>(
						`${API_BASE_URL}/api/v1/tenants/${id}`,
						{
							method: 'PUT',
							body: JSON.stringify(data)
						}
					)
				)
			)

			// Invalidate all affected queries
			await queryClient.invalidateQueries({ queryKey: tenantKeys.list() })
			updates.forEach(({ id }) => {
				queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) })
			})

			return results
		},
		batchDelete: async (ids: string[]) => {
			const results = await Promise.allSettled(
				ids.map(id =>
					apiClient<void>(`${API_BASE_URL}/api/v1/tenants/${id}`, {
						method: 'DELETE'
					})
				)
			)

			// Invalidate all affected queries
			await queryClient.invalidateQueries({ queryKey: tenantKeys.list() })

			return results
		}
	}
}
