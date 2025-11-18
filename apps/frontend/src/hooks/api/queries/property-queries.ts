/**
 * Property Query Options (TanStack Query v5 Pattern)
 *
 * Single source of truth for property-related queries.
 * Reusable across components, server components, and prefetching.
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { Property, PropertyStats, PropertyPerformance } from '@repo/shared/types/core'

/**
 * Property query filters
 */
export interface PropertyFilters {
	status?: 'ACTIVE' | 'SOLD' | 'INACTIVE'
	property_type?: 'SINGLE_FAMILY' | 'MULTI_FAMILY' | 'APARTMENT' | 'CONDO' | 'TOWNHOUSE' | 'COMMERCIAL'
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
	 * const { data } = useQuery(propertyQueries.list({ status: 'ACTIVE' }))
	 */
	list: (filters?: PropertyFilters) =>
		queryOptions({
			queryKey: [...propertyQueries.lists(), filters ?? {}],
			queryFn: async () => {
				const searchParams = new URLSearchParams()
				if (filters?.status) searchParams.append('status', filters.status)
				if (filters?.property_type) searchParams.append('property_type', filters.property_type)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit) searchParams.append('limit', filters.limit.toString())
				if (filters?.offset) searchParams.append('offset', filters.offset.toString())

				const params = searchParams.toString()
				return clientFetch<Property[]>(`/api/v1/properties${params ? `?${params}` : ''}`)
			},
			...QUERY_CACHE_TIMES.DETAIL,
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
			queryFn: () => clientFetch<Property>(`/api/v1/properties/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
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
			queryFn: () => clientFetch<PropertyStats>('/api/v1/properties/stats'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000, // Keep 30 minutes for stats
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
			queryFn: () => clientFetch<PropertyPerformance[]>('/api/v1/manage/property-performance'),
			...QUERY_CACHE_TIMES.DETAIL,
		}),
}
