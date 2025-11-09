/**
 * Property Query Options (TanStack Query v5 Pattern)
 *
 * Single source of truth for property-related queries.
 * Reusable across components, server components, and prefetching.
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import type { Property, PropertyStats, PropertyPerformance } from '@repo/shared/types/core'

/**
 * Property query filters
 */
export interface PropertyFilters {
	status?: 'ACTIVE' | 'SOLD' | 'INACTIVE'
	propertyType?: 'SINGLE_FAMILY' | 'MULTI_FAMILY' | 'APARTMENT' | 'CONDO' | 'TOWNHOUSE' | 'COMMERCIAL'
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
				if (filters?.propertyType) searchParams.append('propertyType', filters.propertyType)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit) searchParams.append('limit', filters.limit.toString())
				if (filters?.offset) searchParams.append('offset', filters.offset.toString())

				const params = searchParams.toString()
				return clientFetch<Property[]>(`/api/v1/properties${params ? `?${params}` : ''}`)
			},
			staleTime: 3 * 60 * 1000, // 3 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
		}),

	/**
	 * Base key for all property details
	 */
	details: () => [...propertyQueries.all(), 'detail'] as const,

	/**
	 * Single property by ID
	 *
	 * @example
	 * const { data } = useQuery(propertyQueries.detail(propertyId))
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...propertyQueries.details(), id],
			queryFn: () => clientFetch<Property>(`/api/v1/properties/${id}`),
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
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
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000, // 30 minutes
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
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),
}
