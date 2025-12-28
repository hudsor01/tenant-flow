/**
 * Property Query Options (TanStack Query v5 Pattern)
 *
 * Single source of truth for property-related queries.
 * Uses native fetch for NestJS calls, Supabase direct for table data.
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'
import { createClient } from '#utils/supabase/client'
import type {
	Property,
	PropertyStats,
	PropertyPerformance
} from '@repo/shared/types/core'
import type { Tables } from '@repo/shared/types/supabase'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'

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

/**
 * Property query factory
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
	 *
	 * @example
	 * const { data } = useQuery(propertyQueries.list({ status: 'active' }))
	 */
	list: (filters?: PropertyFilters) =>
		queryOptions({
			queryKey: [...propertyQueries.lists(), filters ?? {}],
			queryFn: async () => {
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
					`/api/v1/properties${params ? `?${params}` : ''}`
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
			queryFn: () => apiRequest<Property[]>('/api/v1/properties/with-units'),
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Base key for all property details
	 */
	details: () => [...propertyQueries.all(), 'detail'] as const,

	/**
	 * Single property by ID
	 *
	 * @example
	 * const { data } = useQuery(propertyQueries.detail(property_id))
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...propertyQueries.details(), id],
			queryFn: () => apiRequest<Property>(`/api/v1/properties/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	/**
	 * Property statistics
	 *
	 * @example
	 * const { data } = useQuery(propertyQueries.stats())
	 */
	stats: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'stats'],
			queryFn: () => apiRequest<PropertyStats>('/api/v1/properties/stats'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000 // Keep 30 minutes for stats
		}),

	/**
	 * Property performance metrics
	 * Used in owner dashboard
	 *
	 * @example
	 * const { data } = useQuery(propertyQueries.performance())
	 */
	performance: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'performance'],
			queryFn: () =>
				apiRequest<PropertyPerformance[]>('/api/v1/property-performance'),
			...QUERY_CACHE_TIMES.DETAIL
		}),

	analytics: {
		occupancy: () =>
			queryOptions({
				queryKey: [...propertyQueries.all(), 'analytics', 'occupancy'] as const,
				queryFn: () => apiRequest('/api/v1/properties/analytics/occupancy'),
				...QUERY_CACHE_TIMES.ANALYTICS
			}),
		financial: () =>
			queryOptions({
				queryKey: [...propertyQueries.all(), 'analytics', 'financial'] as const,
				queryFn: () => apiRequest('/api/v1/properties/analytics/financial'),
				...QUERY_CACHE_TIMES.ANALYTICS
			}),
		maintenance: () =>
			queryOptions({
				queryKey: [
					...propertyQueries.all(),
					'analytics',
					'maintenance'
				] as const,
				queryFn: () => apiRequest('/api/v1/properties/analytics/maintenance'),
				...QUERY_CACHE_TIMES.ANALYTICS
			})
	},

	/**
	 * Property images for a specific property
	 * Uses Supabase client directly with RLS (Dec 2025 best practice)
	 *
	 * Note: image_url stores relative path (e.g., "{property_id}/{filename}")
	 * This query transforms it to full public URL using Supabase storage API
	 *
	 * @example
	 * const { data } = useQuery(propertyQueries.images(property_id))
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
				// image_url may be:
				// 1. Full URL (legacy): https://...supabase.co/storage/v1/object/public/property-images/...
				// 2. Relative path (new): {property_id}/{filename}
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
