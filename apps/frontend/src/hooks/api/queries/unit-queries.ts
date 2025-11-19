/**
 * Unit Query Options (TanStack Query v5 Pattern)
 *
 * Single source of truth for unit-related queries.
 * Reusable across components, server components, and prefetching.
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { Unit, UnitStats } from '@repo/shared/types/core'

/**
 * Unit query filters
 */
export interface UnitFilters {
	property_id?: string
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
	search?: string
	limit?: number
	offset?: number
}

/**
 * Unit query factory
 */
export const unitQueries = {
	/**
	 * Base key for all unit queries
	 */
	all: () => ['units'] as const,

	/**
	 * Base key for all unit lists
	 */
	lists: () => [...unitQueries.all(), 'list'] as const,

	/**
	 * Unit list with optional filters
	 *
	 * @example
	 * const { data } = useQuery(unitQueries.list({ status: 'VACANT' }))
	 */
	list: (filters?: UnitFilters) =>
		queryOptions({
			queryKey: [...unitQueries.lists(), filters ?? {}],
			queryFn: async () => {
				const searchParams = new URLSearchParams()
				if (filters?.property_id) searchParams.append('property_id', filters.property_id)
				if (filters?.status) searchParams.append('status', filters.status)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit) searchParams.append('limit', filters.limit.toString())
				if (filters?.offset) searchParams.append('offset', filters.offset.toString())

				const params = searchParams.toString()
				return clientFetch<Unit[]>(`/api/v1/units${params ? `?${params}` : ''}`)
			},
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	/**
	 * Base key for all unit details
	 */
	details: () => [...unitQueries.all(), 'detail'] as const,

	/**
	 * Single unit by ID
	 *
	 * @example
	 * const { data } = useQuery(unitQueries.detail(unit_id))
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...unitQueries.details(), id],
			queryFn: () => clientFetch<Unit>(`/api/v1/units/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	/**
	 * Units by property ID
	 * Optimized for property detail pages showing all units
	 *
	 * @example
	 * const { data } = useQuery(unitQueries.byProperty(property_id))
	 */
	byProperty: (property_id: string) =>
		queryOptions({
			queryKey: [...unitQueries.all(), 'by-property', property_id],
			queryFn: () => clientFetch<Unit[]>(`/api/v1/units/by-property/${property_id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id,
		}),

	/**
	 * Unit statistics
	 *
	 * @example
	 * const { data } = useQuery(unitQueries.stats())
	 */
	stats: () =>
		queryOptions({
			queryKey: [...unitQueries.all(), 'stats'],
			queryFn: () => clientFetch<UnitStats>('/api/v1/units/stats'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000, // Keep 30 minutes for stats
		}),
}
