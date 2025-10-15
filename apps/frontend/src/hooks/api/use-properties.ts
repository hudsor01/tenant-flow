/**
 * Properties Hooks
 * TanStack Query hooks for property management with complete CRUD operations
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Expanded from read-only to full CRUD following use-tenant.ts pattern:
 * - Complete CRUD mutations (create, update, delete)
 * - Analytics hooks for performance, occupancy, financial, maintenance
 * - Optimistic updates with rollback
 * - Proper error handling
 */

import { logger } from '@repo/shared/lib/frontend-logger'
import type {
	CreatePropertyInput,
	UpdatePropertyInput
} from '@repo/shared/types/api-inputs'
import type { Property, PropertyStats } from '@repo/shared/types/core'
import { apiClient } from '@repo/shared/utils/api-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query keys for property endpoints (hierarchical, typed)
 */
export const propertiesKeys = {
	all: ['properties'] as const,
	list: (params?: {
		search?: string | null
		limit?: number
		offset?: number
	}) => [...propertiesKeys.all, 'list', params] as const,
	detail: (id: string) => [...propertiesKeys.all, 'detail', id] as const,
	withUnits: () => [...propertiesKeys.all, 'with-units'] as const,
	stats: () => [...propertiesKeys.all, 'stats'] as const,
	analytics: {
		performance: () =>
			[...propertiesKeys.all, 'analytics', 'performance'] as const,
		occupancy: () => [...propertiesKeys.all, 'analytics', 'occupancy'] as const,
		financial: () => [...propertiesKeys.all, 'analytics', 'financial'] as const,
		maintenance: () =>
			[...propertiesKeys.all, 'analytics', 'maintenance'] as const
	}
}

/**
 * Hook to fetch property by ID with optimized caching
 */
export function useProperty(id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: propertiesKeys.detail(id),
		queryFn: async (): Promise<Property> => {
			const response = await apiClient<Property>(
				`${API_BASE_URL}/api/v1/properties/${id}`
			)
			return response
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2,
		// Use data from list query as placeholder
		placeholderData: () => {
			const cachedLists = queryClient.getQueriesData<{
				data: Property[]
				total: number
			}>({
				queryKey: propertiesKeys.all
			})

			for (const [, data] of cachedLists) {
				const property = data?.data?.find((p: Property) => p.id === id)
				if (property) return property
			}
			return undefined
		}
	})
}

/**
 * Hook to fetch property list with pagination and search
 */
export function usePropertyList(params?: {
	search?: string | null
	limit?: number
	offset?: number
}) {
	const { search = null, limit = 50, offset = 0 } = params || {}
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: propertiesKeys.list({
			...(search && { search }),
			limit,
			offset
		}),
		queryFn: async () => {
			const searchParams = new URLSearchParams()
			if (search) searchParams.append('search', search)
			searchParams.append('limit', limit.toString())
			searchParams.append('offset', offset.toString())

			const response = await apiClient<{
				data: Property[]
				total: number
				limit: number
				offset: number
			}>(`${API_BASE_URL}/api/v1/properties?${searchParams.toString()}`)

			// Prefetch individual property details
			response.data.forEach(property => {
				queryClient.setQueryData(propertiesKeys.detail(property.id), property)
			})

			return response
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		retry: 2,
		structuralSharing: true
	})
}

/**
 * Hook to fetch properties with their units
 * Optimized for property management pages
 */
export function usePropertiesWithUnits() {
	return useQuery({
		queryKey: propertiesKeys.withUnits(),
		queryFn: async () => {
			const response = await apiClient<Property[]>(
				`${API_BASE_URL}/api/v1/properties/with-units`
			)
			return response
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}

/**
 * Hook to fetch property statistics
 */
export function usePropertyStats() {
	return useQuery({
		queryKey: propertiesKeys.stats(),
		queryFn: async (): Promise<PropertyStats> => {
			const response = await apiClient<PropertyStats>(
				`${API_BASE_URL}/api/v1/properties/stats`
			)
			return response
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		retry: 2
	})
}

/**
 * Hook to fetch property performance analytics
 */
export function usePropertyPerformanceAnalytics() {
	return useQuery({
		queryKey: propertiesKeys.analytics.performance(),
		queryFn: async () => {
			const response = await apiClient(
				`${API_BASE_URL}/api/v1/properties/analytics/performance`
			)
			return response
		},
		staleTime: 15 * 60 * 1000, // 15 minutes
		retry: 2
	})
}

/**
 * Hook to fetch property occupancy analytics
 */
export function usePropertyOccupancyAnalytics() {
	return useQuery({
		queryKey: propertiesKeys.analytics.occupancy(),
		queryFn: async () => {
			const response = await apiClient(
				`${API_BASE_URL}/api/v1/properties/analytics/occupancy`
			)
			return response
		},
		staleTime: 15 * 60 * 1000, // 15 minutes
		retry: 2
	})
}

/**
 * Hook to fetch property financial analytics
 */
export function usePropertyFinancialAnalytics() {
	return useQuery({
		queryKey: propertiesKeys.analytics.financial(),
		queryFn: async () => {
			const response = await apiClient(
				`${API_BASE_URL}/api/v1/properties/analytics/financial`
			)
			return response
		},
		staleTime: 15 * 60 * 1000, // 15 minutes
		retry: 2
	})
}

/**
 * Hook to fetch property maintenance analytics
 */
export function usePropertyMaintenanceAnalytics() {
	return useQuery({
		queryKey: propertiesKeys.analytics.maintenance(),
		queryFn: async () => {
			const response = await apiClient(
				`${API_BASE_URL}/api/v1/properties/analytics/maintenance`
			)
			return response
		},
		staleTime: 15 * 60 * 1000, // 15 minutes
		retry: 2
	})
}

/**
 * Mutation hook to create a new property with optimistic updates
 */
export function useCreateProperty() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (propertyData: CreatePropertyInput) => {
			const response = await apiClient<Property>(
				`${API_BASE_URL}/api/v1/properties`,
				{
					method: 'POST',
					body: JSON.stringify(propertyData)
				}
			)
			return response
		},
		onMutate: async (newProperty: CreatePropertyInput) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: propertiesKeys.all })

			// Snapshot previous state
			const previousLists = queryClient.getQueriesData<{
				data: Property[]
				total: number
			}>({
				queryKey: propertiesKeys.all
			})

			// Create optimistic property entry
			const tempId = `temp-${Date.now()}`
			const optimisticProperty: Property = {
				id: tempId,
				name: newProperty.name,
				address: newProperty.address,
				city: newProperty.city,
				state: newProperty.state,
				zipCode: newProperty.zipCode,
				ownerId: '', // Will be set by backend
				propertyType: newProperty.propertyType || 'SINGLE_FAMILY',
				status: newProperty.status || 'ACTIVE',
				description: newProperty.description || null,
				imageUrl: newProperty.imageUrl || null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			// Optimistically update all caches
			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old =>
					old
						? {
								...old,
								data: [optimisticProperty, ...old.data],
								total: old.total + 1
							}
						: { data: [optimisticProperty], total: 1 }
			)

			return { previousLists, tempId }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to create property', {
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: (data, _variables, context) => {
			// Replace optimistic entry with real data
			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old => {
					if (!old) return { data: [data], total: 1 }
					return {
						...old,
						data: old.data.map(property =>
							property.id === context?.tempId ? data : property
						)
					}
				}
			)

			// Cache individual property details
			queryClient.setQueryData(propertiesKeys.detail(data.id), data)

			logger.info('Property created successfully', { propertyId: data.id })
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertiesKeys.all })
			queryClient.invalidateQueries({ queryKey: propertiesKeys.stats() })
		}
	})
}

/**
 * Mutation hook to update an existing property with optimistic updates
 */
export function useUpdateProperty() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			data
		}: {
			id: string
			data: UpdatePropertyInput
		}) => {
			const response = await apiClient<Property>(
				`${API_BASE_URL}/api/v1/properties/${id}`,
				{
					method: 'PUT',
					body: JSON.stringify(data)
				}
			)
			return response
		},
		onMutate: async ({ id, data }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: propertiesKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: propertiesKeys.all })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Property>(
				propertiesKeys.detail(id)
			)
			const previousLists = queryClient.getQueriesData<{
				data: Property[]
				total: number
			}>({
				queryKey: propertiesKeys.all
			})

			// Optimistically update detail cache
			queryClient.setQueryData<Property>(propertiesKeys.detail(id), old =>
				old
					? { ...old, ...data, updatedAt: new Date().toISOString() }
					: undefined
			)

			// Optimistically update list caches
			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(property =>
							property.id === id
								? { ...property, ...data, updatedAt: new Date().toISOString() }
								: property
						)
					}
				}
			)

			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					propertiesKeys.detail(id),
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to update property', {
				propertyId: id,
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: (data, { id }) => {
			// Replace optimistic update with real data
			queryClient.setQueryData(propertiesKeys.detail(id), data)

			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(property =>
							property.id === id ? data : property
						)
					}
				}
			)

			logger.info('Property updated successfully', { propertyId: id })
		},
		onSettled: (_data, _error, { id }) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertiesKeys.detail(id) })
			queryClient.invalidateQueries({ queryKey: propertiesKeys.all })
			queryClient.invalidateQueries({ queryKey: propertiesKeys.stats() })
		}
	})
}

/**
 * Mutation hook to delete a property with optimistic removal
 */
export function useDeleteProperty(options?: {
	onSuccess?: () => void
	onError?: (error: Error) => void
}) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient(`${API_BASE_URL}/api/v1/properties/${id}`, {
				method: 'DELETE'
			})
			return id
		},
		onMutate: async (id: string) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: propertiesKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: propertiesKeys.all })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Property>(
				propertiesKeys.detail(id)
			)
			const previousLists = queryClient.getQueriesData<{
				data: Property[]
				total: number
			}>({
				queryKey: propertiesKeys.all
			})

			// Optimistically remove from all caches
			queryClient.removeQueries({ queryKey: propertiesKeys.detail(id) })
			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old =>
					old
						? {
								...old,
								data: old.data.filter(property => property.id !== id),
								total: old.total - 1
							}
						: old
			)

			return { previousDetail, previousLists }
		},
		onError: (err, id, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					propertiesKeys.detail(id),
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to delete property', {
				propertyId: id,
				error: err instanceof Error ? err.message : String(err)
			})

			options?.onError?.(err instanceof Error ? err : new Error(String(err)))
		},
		onSuccess: id => {
			logger.info('Property deleted successfully', { propertyId: id })
			options?.onSuccess?.()
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertiesKeys.all })
			queryClient.invalidateQueries({ queryKey: propertiesKeys.stats() })
		}
	})
}

/**
 * Hook for prefetching property details (for hover states)
 */
export function usePrefetchProperty() {
	const queryClient = useQueryClient()

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: propertiesKeys.detail(id),
			queryFn: async (): Promise<Property> => {
				const response = await apiClient<Property>(
					`${API_BASE_URL}/api/v1/properties/${id}`
				)
				return response
			},
			staleTime: 5 * 60 * 1000
		})
	}
}

/**
 * Combined hook for all property operations
 * Convenience hook for components that need multiple operations
 */
export function usePropertyOperations() {
	return {
		create: useCreateProperty(),
		update: useUpdateProperty(),
		delete: useDeleteProperty()
	}
}

/**
 * Hook to fetch recent properties (limit 5)
 * Optimized for dashboard display
 * @deprecated Use usePropertyList({ limit: 5, offset: 0 }) instead
 */
export function useRecentProperties() {
	return usePropertyList({ limit: 5, offset: 0 })
}

/**
 * @deprecated Use usePropertyList instead
 */
export function useProperties(params?: {
	search?: string | null
	limit?: number
	offset?: number
}) {
	return usePropertyList(params)
}
