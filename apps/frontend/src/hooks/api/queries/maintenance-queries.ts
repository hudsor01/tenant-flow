/**
 * Maintenance Request Query Options (TanStack Query v5 Pattern)
 *
 * Uses queryOptions API for type-safe, reusable query configurations.
 * Single source of truth for queryKey + queryFn + cache settings.
 *
 * Benefits:
 * - Type inference across useQuery, prefetchQuery, getQueryData, setQueryData
 * - No duplicate configurations
 * - Reusable in components, server components, and prefetching
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-options
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

/**
 * Maintenance query filters
 */
export interface MaintenanceFilters {
	unit_id?: string
	property_id?: string
	priority?: string
	category?: string
	status?: string
	limit?: number
	offset?: number
}

/**
 * Maintenance query factory
 * Hierarchical structure for targeted cache invalidation
 */
export const maintenanceQueries = {
	/**
	 * Base key for all maintenance queries
	 * Use for invalidating ALL maintenance-related data
	 */
	all: () => ['maintenance'] as const,

	/**
	 * Base key for all maintenance lists
	 */
	lists: () => [...maintenanceQueries.all(), 'list'] as const,

	/**
	 * Maintenance list with optional filters
	 *
	 * @example
	 * const { data } = useQuery(maintenanceQueries.list({ status: 'PENDING' }))
	 */
	list: (filters?: MaintenanceFilters) =>
		queryOptions({
			queryKey: [...maintenanceQueries.lists(), filters ?? {}],
			queryFn: async () => {
				const params = new URLSearchParams()
				if (filters?.unit_id) params.append('unit_id', filters.unit_id)
				if (filters?.property_id) params.append('property_id', filters.property_id)
				if (filters?.priority) params.append('priority', filters.priority)
				if (filters?.category) params.append('category', filters.category)
				if (filters?.status) params.append('status', filters.status)
				if (filters?.limit) params.append('limit', filters.limit.toString())
				if (filters?.offset) params.append('offset', filters.offset.toString())

				const queryString = params.toString()
				return clientFetch<MaintenanceRequest[]>(
					`/api/v1/maintenance${queryString ? `?${queryString}` : ''}`
				)
			},
			...QUERY_CACHE_TIMES.LIST,
		}),

	/**
	 * Base key for all maintenance details
	 */
	details: () => [...maintenanceQueries.all(), 'detail'] as const,

	/**
	 * Single maintenance request by ID
	 *
	 * @example
	 * const { data } = useQuery(maintenanceQueries.detail(requestId))
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...maintenanceQueries.details(), id],
			queryFn: () => clientFetch<MaintenanceRequest>(`/api/v1/maintenance/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	/**
	 * Maintenance statistics
	 *
	 * @example
	 * const { data } = useQuery(maintenanceQueries.stats())
	 */
	stats: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'stats'],
			queryFn: () => clientFetch('/api/v1/maintenance/stats'),
			...QUERY_CACHE_TIMES.STATS,
		}),

	/**
	 * Urgent maintenance requests
	 *
	 * @example
	 * const { data } = useQuery(maintenanceQueries.urgent())
	 */
	urgent: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'urgent'],
			queryFn: () => clientFetch<MaintenanceRequest[]>('/api/v1/maintenance/urgent'),
			staleTime: 30 * 1000, // 30 seconds (urgent updates frequently)
			gcTime: 5 * 60 * 1000,
		}),

	/**
	 * Overdue maintenance requests
	 *
	 * @example
	 * const { data } = useQuery(maintenanceQueries.overdue())
	 */
	overdue: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'overdue'],
			queryFn: () => clientFetch<MaintenanceRequest[]>('/api/v1/maintenance/overdue'),
			...QUERY_CACHE_TIMES.STATS,
		}),
}
