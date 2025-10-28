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
import { handleConflictError, isConflictError, withVersion, incrementVersion } from '@repo/shared/utils/optimistic-locking'
import type {
	CreatePropertyInput,
	UpdatePropertyInput
} from '@repo/shared/types/api-inputs'
import type { Property, PropertyStats } from '@repo/shared/types/core'
import { apiClient } from '@repo/shared/utils/api-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_BASE_URL } from '#lib/api-client'

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
		retry: 2
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
			date_sold: null,
			sale_price: null,
			sale_notes: null,			createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				version: 1 // 🔐 BUG FIX #2: Optimistic locking
			}

			// Optimistically update all caches
			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old =>
					old && Array.isArray(old.data)
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

			const errorMessage = err instanceof Error ? err.message : 'Failed to create property'
			toast.error('Error', {
				description: errorMessage
			})

			logger.error('Failed to create property', {
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: (data, _variables, context) => {
			toast.success('Property created', {
				description: `${data.name} has been added to your portfolio`
			})

			// Replace optimistic entry with real data
			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old => {
					if (!old || !Array.isArray(old.data)) return { data: [data], total: 1 }
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
			// 🔐 BUG FIX #2: Get current version from cache for optimistic locking
			const currentProperty = queryClient.getQueryData<Property>(
				propertiesKeys.detail(id)
			)
			
			const response = await apiClient<Property>(
				`${API_BASE_URL}/api/v1/properties/${id}`,
				{
					method: 'PUT',
					// Use withVersion helper to include version in request
					body: JSON.stringify(withVersion(data, currentProperty?.version))
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

			// Optimistically update detail cache (use incrementVersion helper)
			queryClient.setQueryData<Property>(propertiesKeys.detail(id), old =>
				old ? incrementVersion(old, data) : undefined
			)

			// Optimistically update list caches
			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old => {
					if (!old || !Array.isArray(old.data)) return old
					return {
						...old,
						data: old.data.map(property =>
							property.id === id
								? incrementVersion(property, data)
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

			// 🔐 BUG FIX #2: Handle 409 Conflict using helper
			if (isConflictError(err)) {
				handleConflictError('property', id, queryClient, [
					propertiesKeys.detail(id) as unknown as string[],
					propertiesKeys.all as unknown as string[]
				])
			} else {
				const errorMessage = err instanceof Error ? err.message : 'Failed to update property'
				toast.error('Error', {
					description: errorMessage
				})
			}

			logger.error('Failed to update property', {
				propertyId: id,
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: (data, { id }) => {
			toast.success('Property updated', {
				description: `${data.name} has been updated successfully`
			})

			// Replace optimistic update with real data (including correct version)
			queryClient.setQueryData(propertiesKeys.detail(id), data)

			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old => {
					if (!old || !Array.isArray(old.data)) return old
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
 * Mark property as sold (7-year retention compliance)
 * Updates status to SOLD with required date_sold and sale_price fields
 */
export function useMarkPropertySold() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			dateSold,
			salePrice,
			saleNotes
		}: {
			id: string
			dateSold: Date
			salePrice: number
			saleNotes?: string
		}) => {
			const response = await apiClient<{
				success: boolean
				message: string
			}>(`${API_BASE_URL}/api/v1/properties/${id}/mark-sold`, {
				method: 'PUT',
				body: JSON.stringify({
					dateSold: dateSold.toISOString(),
					salePrice,
					saleNotes
				})
			})
			return response
		},
		onMutate: async ({ id }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: propertiesKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: propertiesKeys.all })

			// Snapshot previous state for rollback
			const previousDetail = queryClient.getQueryData<Property>(
				propertiesKeys.detail(id)
			)
			const previousLists = queryClient.getQueriesData<{
				data: Property[]
				total: number
			}>({
				queryKey: propertiesKeys.all
			})

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

			logger.error('Failed to mark property as sold', {
				propertyId: id,
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: data => {
			logger.info('Property marked as sold', { message: data.message })
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertiesKeys.all })
			queryClient.invalidateQueries({ queryKey: propertiesKeys.stats() })
		}
	})
}

/**
 * Delete property with optimistic updates and rollback
 * Removes property from list immediately, rolls back on error
 */
export function useDeleteProperty() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient<{ message: string }>(
				`${API_BASE_URL}/api/v1/properties/${id}`,
				{
					method: 'DELETE'
				}
			)
			return response
		},
		onMutate: async (id) => {
			// Cancel outgoing queries to avoid overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: propertiesKeys.all })
			await queryClient.cancelQueries({ queryKey: propertiesKeys.detail(id) })

			// Snapshot previous state for rollback
			const previousList = queryClient.getQueryData<{
				data: Property[]
				total: number
			}>(propertiesKeys.list())

			// Optimistically remove from list
			if (previousList) {
				queryClient.setQueryData<{ data: Property[]; total: number }>(
					propertiesKeys.list(),
					{
						...previousList,
						data: previousList.data.filter(prop => prop.id !== id),
						total: previousList.total - 1
					}
				)
			}

			return { previousList }
		},
		onError: (error, id, context) => {
			// Rollback on error
			if (context?.previousList) {
				queryClient.setQueryData(propertiesKeys.list(), context.previousList)
			}

			const errorMessage = error instanceof Error ? error.message : 'Failed to delete property'
			toast.error('Error', {
				description: errorMessage
			})

			logger.error('Failed to delete property', {
				action: 'delete_property',
				metadata: { propertyId: id, error: String(error) }
			})
		},
		onSuccess: (_, id) => {
			toast.success('Property deleted', {
				description: 'Property has been removed from your portfolio'
			})

			// Remove individual property cache
			queryClient.removeQueries({ queryKey: propertiesKeys.detail(id) })

			logger.info('Property deleted successfully', {
				action: 'delete_property_success',
				metadata: { propertyId: id }
			})
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
		delete: useDeleteProperty(),
		markSold: useMarkPropertySold()
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
