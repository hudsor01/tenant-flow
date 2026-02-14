/**
 * Properties Hooks
 * TanStack Query hooks for property management
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Query keys are in a separate file to avoid circular dependencies.
 * - Query hooks for property data fetching
 * - Analytics hooks for performance, occupancy, financial, maintenance
 * - Prefetch hooks for route-level data loading
 */

import { useMutation, usePrefetchQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { apiRequest } from '#lib/api-request'
import { handleMutationError } from '#lib/mutation-error-handler'
import { createClient } from '#lib/supabase/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

import { createLogger, logger } from '@repo/shared/lib/frontend-logger'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'
import type { Property } from '@repo/shared/types/core'
import type {
	PropertyCreate,
	PropertyUpdate
} from '@repo/shared/validation/properties'

// Import query keys from separate file to avoid circular dependency
import { propertyQueries, type PropertyFilters } from './query-keys/property-keys'
import { unitQueries } from './query-keys/unit-keys'
import { mutationKeys } from './mutation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

/**
 * Extract data array from paginated response
 * Stable reference for TanStack Query select optimization
 */
const selectPaginatedData = <T>(response: PaginatedResponse<T>): T[] => response.data

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch property by ID
 * Uses placeholderData from list cache for instant detail view
 */
export function useProperty(id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		...propertyQueries.detail(id),
		placeholderData: () => {
			// Search all list caches for this property
			const listCaches = queryClient.getQueriesData<PaginatedResponse<Property>>({
				queryKey: propertyQueries.lists()
			})

			for (const [, response] of listCaches) {
				const item = response?.data?.find(p => p.id === id)
				if (item) return item
			}
			return undefined
		}
	})
}

/**
 * Hook to fetch property list with pagination and search
 * Returns plain array of properties with automatic detail prefetching
 *
 * Optimizations from TanStack Query docs:
 * - notifyOnChangeProps: Only re-render when data/error/isPending change
 * - select: Using stable function reference (selectPaginatedData)
 * - structuralSharing: Prevents unnecessary re-renders when data is identical
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations
 */
export function usePropertyList(params?: {
	search?: string | null
	limit?: number
	offset?: number
}) {
	const { search = null, limit = 50, offset = 0 } = params || {}

	const filters: PropertyFilters = {
		...(search ? { search } : {}),
		limit,
		offset
	}

	const listQuery = propertyQueries.list(filters)

	return useQuery({
		...listQuery,
		...QUERY_CACHE_TIMES.LIST,
		// Stable select function - defined outside component for referential equality
		select: selectPaginatedData,
		structuralSharing: true,
		// Only re-render when these properties change (not on every internal state change)
		notifyOnChangeProps: ['data', 'error', 'isPending', 'isFetching']
	})
}

/**
 * Hook to fetch properties with their units
 * Optimized for property management pages
 */
export function usePropertiesWithUnits() {
	return useQuery(propertyQueries.withUnits())
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
	return useQuery(propertyQueries.analytics.occupancy())
}

/**
 * Hook to fetch property financial analytics
 */
export function usePropertyFinancialAnalytics() {
	return useQuery(propertyQueries.analytics.financial())
}

/**
 * Hook to fetch property maintenance analytics
 */
export function usePropertyMaintenanceAnalytics() {
	return useQuery(propertyQueries.analytics.maintenance())
}

/**
 * Hook to fetch property images
 * Uses Supabase client directly with RLS
 */
export function usePropertyImages(property_id: string) {
	return useQuery(propertyQueries.images(property_id))
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mark property as sold (7-year retention compliance)
 * Updates status to SOLD with required date_sold and sale_price fields
 */
export function useMarkPropertySoldMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.properties.markSold,
		mutationFn: async ({
			id,
			dateSold,
			salePrice
		}: {
			id: string
			dateSold: Date
			salePrice: number
		}): Promise<{ success: boolean; message: string }> => {
			return apiRequest<{ success: boolean; message: string }>(
				`/api/v1/properties/${id}/mark-sold`,
				{
					method: 'PUT',
					body: JSON.stringify({
						sale_date: dateSold.toISOString(),
						sale_price: salePrice
					})
				}
			)
		},
		onMutate: async ({ id }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: propertyQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: propertyQueries.lists() })

			// Snapshot previous state for rollback
			const previousDetail = queryClient.getQueryData<Property>(
				propertyQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<Property[]>({
				queryKey: propertyQueries.lists()
			})

			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					propertyQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to mark property as sold', {
				property_id: id,
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: data => {
			logger.info('Property marked as sold', { message: data.message })
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({
				queryKey: propertyQueries.stats().queryKey
			})
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
		}
	})
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Declarative prefetch hook for property detail
 * Prefetches when component mounts (route-level prefetching)
 *
 * For imperative prefetching (e.g., on hover), use:
 * queryClient.prefetchQuery(propertyQueries.detail(id))
 */
export function usePrefetchPropertyDetail(id: string) {
	usePrefetchQuery(propertyQueries.detail(id))
}

/**
 * Declarative prefetch hook for property with related units
 * Prefetches both property detail and its units
 */
export function usePrefetchPropertyWithUnits(id: string) {
	usePrefetchQuery(propertyQueries.detail(id))
	usePrefetchQuery(unitQueries.byProperty(id))
}

/**
 * Create property mutation
 */
export function useCreatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.properties.create,
		mutationFn: (data: PropertyCreate) =>
			apiRequest<Property>('/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Property created successfully')
		},
		onError: error => {
			handleMutationError(error, 'Create property')
		}
	})
}

/**
 * Update property mutation
 */
export function useUpdatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.properties.update,
		mutationFn: async ({
			id,
			data,
			version
		}: {
			id: string
			data: PropertyUpdate
			version?: number
		}) =>
			apiRequest<Property>(`/api/v1/properties/${id}`, {
				method: 'PUT',
				body: JSON.stringify(version ? { ...data, version } : data)
			}),
		onSuccess: updatedProperty => {
			queryClient.setQueryData(
				propertyQueries.detail(updatedProperty.id).queryKey,
				updatedProperty
			)
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.analytics.stats() })
			toast.success('Property updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update property')
		}
	})
}

/**
 * Delete property mutation
 */
export function useDeletePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.properties.delete,
		mutationFn: async (id: string) =>
			apiRequest<void>(`/api/v1/properties/${id}`, { method: 'DELETE' }),
		onSuccess: (_result, deletedId) => {
			// Remove from cache
			queryClient.removeQueries({
				queryKey: propertyQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Property deleted successfully')
		},
		onError: error => {
			handleMutationError(error, 'Delete property')
		}
	})
}

/**
 * Delete property image mutation
 * Uses Supabase client directly with RLS (Dec 2025 best practice)
 */
export function useDeletePropertyImageMutation() {
	const queryClient = useQueryClient()
	const mutationLogger = createLogger({ component: 'PropertyMutations' })

	return useMutation({
		mutationKey: mutationKeys.properties.deleteImage,
		mutationFn: async ({
			imageId,
			imagePath
		}: {
			imageId: string
			property_id: string
			imagePath?: string // e.g., "property_id/filename.webp"
		}) => {
			const supabase = createClient()

			// Delete from database (RLS will verify ownership)
			const { error: dbError } = await supabase
				.from('property_images')
				.delete()
				.eq('id', imageId)

			if (dbError) throw new Error(dbError.message)

			// Delete from storage if path provided (non-blocking)
			if (imagePath) {
				try {
					await supabase.storage.from('property-images').remove([imagePath])
				} catch {
					// Log warning but don't fail - DB cleanup is intact
					mutationLogger.warn('Storage deletion failed', {
						action: 'delete_storage_image_failed',
						metadata: { imagePath }
					})
				}
			}

			return { success: true }
		},
		onSuccess: (_, { property_id }) => {
			// Invalidate property images
			queryClient.invalidateQueries({
				queryKey: [...propertyQueries.detail(property_id).queryKey, 'images']
			})
			// Invalidate property list (primary image may have been deleted)
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			toast.success('Image deleted successfully')
		},
		onError: error => {
			handleMutationError(error, 'Delete image')
		}
	})
}
