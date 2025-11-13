/**
 * Properties Hooks
 * TanStack Query hooks for property management with complete CRUD operations
 * React 19 + TanStack Query v5 patterns with Suspense support

 * Expanded from read-only to full CRUD following use-tenant.ts pattern:
 * - Complete CRUD mutations (create, update, delete)
 * - Analytics hooks for performance, occupancy, financial, maintenance
 * - Optimistic updates with rollback
 * - Proper error handling
 */

import { clientFetch } from '#lib/api/client'
import { logger } from '@repo/shared/lib/frontend-logger'
import {
	handleConflictError,
	isConflictError,
	withVersion,
	incrementVersion
} from '@repo/shared/utils/optimistic-locking'
import type { UpdatePropertyInput } from '@repo/shared/types/api-inputs'
import type { CreatePropertyRequest } from '@repo/shared/types/api-contracts'
import type { Property } from '@repo/shared/types/core'
import type { Tables } from '@repo/shared/types/supabase'
import { compressImage } from '#lib/image-compression'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { propertyQueries, type PropertyFilters } from './queries/property-queries'

/**
 * Query keys for property endpoints (hierarchical, typed)
 */
/**
 * @deprecated Use propertyQueries from './queries/property-queries' instead
 * Keeping for backward compatibility during migration
 */
export const propertiesKeys = {
	all: propertyQueries.all(),
	list: (params?: {
		search?: string | null
		limit?: number
		offset?: number
	}) => {
		// Convert params to PropertyFilters format, only including defined values
		const filters: PropertyFilters | undefined = params ? Object.assign({},
			params.search ? { search: params.search } : {},
			params.limit !== undefined ? { limit: params.limit } : {},
			params.offset !== undefined ? { offset: params.offset } : {}
		) as PropertyFilters : undefined
		return propertyQueries.list(filters).queryKey
	},
	detail: (id: string) => propertyQueries.detail(id).queryKey,
	withUnits: () => [...propertyQueries.all(), 'with-units'] as const,
	stats: () => propertyQueries.stats().queryKey,
	analytics: {
		performance: () => propertyQueries.performance().queryKey,
		occupancy: () => [...propertyQueries.all(), 'analytics', 'occupancy'] as const,
		financial: () => [...propertyQueries.all(), 'analytics', 'financial'] as const,
		maintenance: () => [...propertyQueries.all(), 'analytics', 'maintenance'] as const
	}
}

/**
 * Hook to fetch property by ID
 */
export function useProperty(id: string) {
	return useQuery(propertyQueries.detail(id))
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

			const response = await clientFetch<Property[]>(
				`/api/v1/properties?${searchParams.toString()}`
			)

			// Prefetch individual property details
			response?.forEach?.(property => {
				queryClient.setQueryData(propertiesKeys.detail(property.id), property)
			})

			// Transform to expected paginated format for backwards compatibility
			return {
				data: response || [],
				total: response?.length || 0,
				limit,
				offset
			}
		},
		...QUERY_CACHE_TIMES.LIST,
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
		queryFn: async (): Promise<Property[]> => {
			return clientFetch('/api/v1/properties/with-units')
		},
		...QUERY_CACHE_TIMES.DETAIL,
		retry: 2
	})
}

/**
 * Hook to fetch property statistics
 */
export function usePropertyStats() {
	return useQuery(propertyQueries.stats())
}

/**
 * Hook to fetch property performance analytics
 */
export function usePropertyPerformanceAnalytics() {
	return useQuery(propertyQueries.performance())
}

/**
 * Hook to fetch property occupancy analytics
 */
export function usePropertyOccupancyAnalytics() {
	return useQuery({
		queryKey: propertiesKeys.analytics.occupancy(),
		queryFn: async () => {
			return clientFetch('/api/v1/properties/analytics/occupancy')
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
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
			return clientFetch('/api/v1/properties/analytics/financial')
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
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
			return clientFetch('/api/v1/properties/analytics/maintenance')
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
		retry: 2
	})
}

/**
 * Mutation hook to create a new property with optimistic updates
 */
export function useCreateProperty() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (
			propertyData: CreatePropertyRequest
		): Promise<Property> => {
			return clientFetch<Property>('/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify(propertyData)
			})
		},
		onMutate: async (newProperty: CreatePropertyRequest) => {
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
				status: 'ACTIVE', // Backend default status for new properties
				description: newProperty.description || null,
				imageUrl: newProperty.imageUrl || null,
				date_sold: null,
				sale_price: null,
				sale_notes: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				version: 1 //Optimistic locking
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

			handleMutationError(err, 'Create property')
		},
		onSuccess: (data, _variables, context) => {
			handleMutationSuccess(
				'Create property',
				`${data.name} has been added to your portfolio`
			)

			// Replace optimistic entry with real data
			queryClient.setQueriesData<{ data: Property[]; total: number }>(
				{ queryKey: propertiesKeys.all },
				old => {
					if (!old || !Array.isArray(old.data))
						return { data: [data], total: 1 }
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
			data,
			version
		}: {
			id: string
			data: UpdatePropertyInput
			version?: number
		}): Promise<Property> => {
			return clientFetch<Property>(`/api/v1/properties/${id}`, {
				method: 'PUT',
				// OPTIMISTIC LOCKING: Include version if provided
				body: JSON.stringify(
					version !== null && version !== undefined
						? withVersion(data, version)
						: data
				)
			})
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
							property.id === id ? incrementVersion(property, data) : property
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

			//Handle 409 Conflict using helper
			if (isConflictError(err)) {
				handleConflictError('property', id, queryClient, [
					propertiesKeys.detail(id),
					propertiesKeys.all
				])
			} else {
				handleMutationError(err, 'Update property')
			}
		},
		onSuccess: (data, { id }) => {
			handleMutationSuccess(
				'Update property',
				`${data.name} has been updated successfully`
			)

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
		}): Promise<{ success: boolean; message: string }> => {
			return clientFetch<{ success: boolean; message: string }>(
				`/api/v1/properties/${id}/mark-sold`,
				{
					method: 'PUT',
					body: JSON.stringify({
						dateSold: dateSold.toISOString(),
						salePrice,
						saleNotes
					})
				}
			)
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
		mutationFn: async (id: string): Promise<{ message: string }> => {
			return clientFetch<{ message: string }>(`/api/v1/properties/${id}`, {
				method: 'DELETE'
			})
		},
		onMutate: async id => {
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
				queryClient.setQueryData<{ data: Property[]; total: number }>(
					propertiesKeys.list(),
					context.previousList
				)
			}

			handleMutationError(error, 'Delete property')
		},
		onSuccess: (_, id) => {
			handleMutationSuccess(
				'Delete property',
				'Property has been removed from your portfolio'
			)

			// Remove individual property cache
			queryClient.removeQueries({ queryKey: propertiesKeys.detail(id) })
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
				return clientFetch<Property>(`/api/v1/properties/${id}`)
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}

/**
 * Combined hook for all property operations
 * Convenience hook for components that need multiple operations
 */
/**
 * Hook to fetch property images
 */
export function usePropertyImages(propertyId: string) {
	return useQuery({
		queryKey: [...propertiesKeys.detail(propertyId), 'images'] as const,
		queryFn: () =>
			clientFetch<Tables<'property_images'>[]>(
				`/api/v1/properties/${propertyId}/images`
			),
		enabled: !!propertyId,
		...QUERY_CACHE_TIMES.DETAIL,
		gcTime: 10 * 60 * 1000
	})
}

/**
 * Hook to upload property image
 */
export function useUploadPropertyImage() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			propertyId,
			file,
			isPrimary = false,
			caption
		}: {
			propertyId: string
			file: File
			isPrimary?: boolean
			caption?: string
		}) => {
			// Compress image before upload (reduces storage usage by ~70-90%)
			const compressed = await compressImage(file)

			const formData = new FormData()
			formData.append('file', compressed.file)
			formData.append('isPrimary', String(isPrimary))
			if (caption) formData.append('caption', caption)

			const result = await clientFetch(
				`/api/v1/properties/${propertyId}/images`,
				{
					method: 'POST',
					body: formData
				}
			)

			return { result, compressionRatio: compressed.compressionRatio }
		},
		onSuccess: ({ compressionRatio }, { propertyId }) => {
			handleMutationSuccess(
				'Upload image',
				`Image uploaded (${Math.round((1 - compressionRatio) * 100)}% size reduction)`
			)
			// Invalidate property images
			queryClient.invalidateQueries({
				queryKey: [...propertiesKeys.detail(propertyId), 'images']
			})
			// Invalidate property list (primary image may have changed)
			queryClient.invalidateQueries({
				queryKey: propertiesKeys.all
			})
		},
		onError: error => handleMutationError(error, 'Upload image')
	})
}

/**
 * Hook to delete property image
 */
export function useDeletePropertyImage() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			imageId,
			propertyId: _propertyId
		}: {
			imageId: string
			propertyId: string
		}) =>
			clientFetch<{ message: string }>(`/api/v1/properties/images/${imageId}`, {
				method: 'DELETE'
			}),
		onSuccess: (_, { propertyId }) => {
			handleMutationSuccess('Delete image')
			// Invalidate property images
			queryClient.invalidateQueries({
				queryKey: [...propertiesKeys.detail(propertyId), 'images']
			})
			// Invalidate property list (primary image may have been deleted)
			queryClient.invalidateQueries({
				queryKey: propertiesKeys.all
			})
		},
		onError: error => handleMutationError(error, 'Delete image')
	})
}

export function usePropertyOperations() {
	return {
		create: useCreateProperty(),
		update: useUpdateProperty(),
		delete: useDeleteProperty(),
		markSold: useMarkPropertySold()
	}
}
