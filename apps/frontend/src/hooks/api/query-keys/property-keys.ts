/**
 * Property Query Keys & Options
 * Extracted to avoid circular dependencies and enable reuse across files
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - AbortSignal for query cancellation
 */

import { queryOptions } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { createClient } from '#lib/supabase/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'
import type {
	Property,
	PropertyStats,
	PropertyPerformance
} from '@repo/shared/types/core'
import type { Tables } from '@repo/shared/types/supabase'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Property query filters
 */
export interface PropertyFilters {
	status?: 'active' | 'SOLD' | 'inactive'
	property_type?:
		| 'SINGLE_FAMILY'
		| 'MULTI_FAMILY'
		| 'APARTMENT'
		| 'CONDO'
		| 'TOWNHOUSE'
		| 'COMMERCIAL'
	search?: string
	limit?: number
	offset?: number
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Property query factory
 * Colocated queryOptions for use with useQuery, useQueries, prefetch
 */
export const propertyQueries = {
	/**
	 * Base key for all property queries
	 */
	all: () => ['properties'] as const,

	/**
	 * Base key for all property lists
	 */
	lists: () => [...propertyQueries.all(), 'list'] as const,

	/**
	 * Property list with optional filters
	 */
	list: (filters?: PropertyFilters) =>
		queryOptions({
			queryKey: [...propertyQueries.lists(), filters ?? {}],
			queryFn: async ({ signal }) => {
				const searchParams = new URLSearchParams()
				if (filters?.status) searchParams.append('status', filters.status)
				if (filters?.property_type)
					searchParams.append('property_type', filters.property_type)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit)
					searchParams.append('limit', filters.limit.toString())
				if (filters?.offset)
					searchParams.append('offset', filters.offset.toString())
				const params = searchParams.toString()
				return apiRequest<PaginatedResponse<Property>>(
					`/api/v1/properties${params ? `?${params}` : ''}`,
					{ signal }
				)
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Properties with units (e.g., management dashboard)
	 */
	withUnits: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'with-units'] as const,
			queryFn: ({ signal }) =>
				apiRequest<Property[]>('/api/v1/properties/with-units', { signal }),
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Base key for all property details
	 */
	details: () => [...propertyQueries.all(), 'detail'] as const,

	/**
	 * Single property by ID
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...propertyQueries.details(), id],
			queryFn: ({ signal }) =>
				apiRequest<Property>(`/api/v1/properties/${id}`, { signal }),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	/**
	 * Property statistics
	 */
	stats: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'stats'],
			queryFn: ({ signal }) =>
				apiRequest<PropertyStats>('/api/v1/properties/stats', { signal }),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000 // Keep 30 minutes for stats
		}),

	/**
	 * Property performance metrics
	 * Used in owner dashboard
	 */
	performance: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'performance'],
			queryFn: ({ signal }) =>
				apiRequest<PropertyPerformance[]>('/api/v1/property-performance', {
					signal
				}),
			...QUERY_CACHE_TIMES.DETAIL
		}),

	analytics: {
		occupancy: () =>
			queryOptions({
				queryKey: [...propertyQueries.all(), 'analytics', 'occupancy'] as const,
				queryFn: ({ signal }) =>
					apiRequest('/api/v1/properties/analytics/occupancy', { signal }),
				...QUERY_CACHE_TIMES.ANALYTICS
			}),
		financial: () =>
			queryOptions({
				queryKey: [...propertyQueries.all(), 'analytics', 'financial'] as const,
				queryFn: ({ signal }) =>
					apiRequest('/api/v1/properties/analytics/financial', { signal }),
				...QUERY_CACHE_TIMES.ANALYTICS
			}),
		maintenance: () =>
			queryOptions({
				queryKey: [
					...propertyQueries.all(),
					'analytics',
					'maintenance'
				] as const,
				queryFn: ({ signal }) =>
					apiRequest('/api/v1/properties/analytics/maintenance', { signal }),
				...QUERY_CACHE_TIMES.ANALYTICS
			})
	},

	/**
	 * Property images for a specific property
	 * Uses Supabase client directly with RLS
	 *
	 * Note: image_url stores relative path (e.g., "{property_id}/{filename}")
	 * This query transforms it to full public URL using Supabase storage API
	 * Note: Supabase JS client doesn't support AbortController directly
	 */
	images: (property_id: string) =>
		queryOptions({
			queryKey: [...propertyQueries.detail(property_id).queryKey, 'images'],
			queryFn: async () => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('property_images')
					.select('*')
					.eq('property_id', property_id)
					.order('display_order', { ascending: true })

				if (error) throw new Error(error.message)

				// Transform relative paths to full public URLs
				return (data as Tables<'property_images'>[]).map(image => {
					const isFullUrl = image.image_url.startsWith('http')
					if (isFullUrl) {
						return image
					}
					// Construct full URL from relative path
					const {
						data: { publicUrl }
					} = supabase.storage
						.from('property-images')
						.getPublicUrl(image.image_url)
					return { ...image, image_url: publicUrl }
				})
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id
		})
}
