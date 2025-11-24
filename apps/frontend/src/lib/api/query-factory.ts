/**
 * Unified Query Factory - TanStack Query v5 Best Practices
 *
 * Single factory for all entity queries with consistent patterns.
 * Eliminates duplication across domain-specific query files.
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from './client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

/**
 * Generic entity query filters
 */
export interface EntityFilters {
	search?: string
	limit?: number
	offset?: number
	status?: string
	property_id?: string
	[key: string]: unknown
}

/**
 * Query factory configuration
 */
export interface QueryFactoryConfig {
	entityName: string
	baseEndpoint: string
	cacheTime?: keyof typeof QUERY_CACHE_TIMES
}

/**
 * Create a complete set of queries for an entity
 */
export function createEntityQueries<TList = unknown, TDetail = unknown>(
	config: QueryFactoryConfig
) {
	const { entityName, baseEndpoint, cacheTime = 'DETAIL' } = config
	const cacheConfig = QUERY_CACHE_TIMES[cacheTime]

	const all = () => [entityName] as const
	const lists = () => [...all(), 'list'] as const
	const details = () => [...all(), 'detail'] as const

	return {
		/**
		 * Base key for all entity queries
		 */
		all,

		/**
		 * Base key for all entity lists
		 */
		lists,

		/**
		 * Entity list with optional filters
		 */
		list: (filters?: EntityFilters) =>
			queryOptions({
				queryKey: [entityName, 'list', baseEndpoint, filters ?? {}],
				queryFn: async () => {
					const searchParams = new URLSearchParams()
					if (filters) {
						Object.entries(filters).forEach(([key, value]) => {
							if (value !== undefined && value !== null) {
								searchParams.append(key, String(value))
							}
						})
					}
					const params = searchParams.toString()
					return clientFetch<TList>(`${baseEndpoint}${params ? `?${params}` : ''}`)
				},
				...cacheConfig,
			}),

		/**
		 * Base key for all entity details
		 */
		details,

		/**
		 * Single entity by ID
		 */
		detail: (id: string) =>
			queryOptions({
				queryKey: [entityName, 'detail', baseEndpoint, id],
				queryFn: () => clientFetch<TDetail>(`${baseEndpoint}/${id}`),
				...cacheConfig,
				enabled: !!id,
			}),

		/**
		 * Entity statistics
		 */
		stats: () =>
			queryOptions({
				queryKey: [entityName, 'stats', baseEndpoint],
				queryFn: () => clientFetch(`${baseEndpoint}/stats`),
				...cacheConfig,
			}),

		/**
		 * Analytics queries
		 */
		analytics: {
			occupancy: (filters?: EntityFilters) =>
				queryOptions({
					queryKey: [entityName, 'analytics', 'occupancy', baseEndpoint, filters ?? {}],
					queryFn: () => {
						const searchParams = new URLSearchParams()
						if (filters) {
							Object.entries(filters).forEach(([key, value]) => {
								if (value !== undefined && value !== null) {
									searchParams.append(key, String(value))
								}
							})
						}
						const params = searchParams.toString()
						return clientFetch(`${baseEndpoint}/analytics/occupancy${params ? `?${params}` : ''}`)
					},
					...QUERY_CACHE_TIMES.ANALYTICS,
				}),

			financial: (filters?: EntityFilters) =>
				queryOptions({
					queryKey: [entityName, 'analytics', 'financial', baseEndpoint, filters ?? {}],
					queryFn: () => {
						const searchParams = new URLSearchParams()
						if (filters) {
							Object.entries(filters).forEach(([key, value]) => {
								if (value !== undefined && value !== null) {
									searchParams.append(key, String(value))
								}
							})
						}
						const params = searchParams.toString()
						return clientFetch(`${baseEndpoint}/analytics/financial${params ? `?${params}` : ''}`)
					},
					...QUERY_CACHE_TIMES.ANALYTICS,
				}),

			maintenance: (filters?: EntityFilters) =>
				queryOptions({
					queryKey: [entityName, 'analytics', 'maintenance', baseEndpoint, filters ?? {}],
					queryFn: () => {
						const searchParams = new URLSearchParams()
						if (filters) {
							Object.entries(filters).forEach(([key, value]) => {
								if (value !== undefined && value !== null) {
									searchParams.append(key, String(value))
								}
							})
						}
						const params = searchParams.toString()
						return clientFetch(`${baseEndpoint}/analytics/maintenance${params ? `?${params}` : ''}`)
					},
					...QUERY_CACHE_TIMES.ANALYTICS,
				}),
		},

		/**
		 * Entity images
		 */
		images: (id: string) =>
			queryOptions({
				queryKey: [entityName, 'images', baseEndpoint, id],
				queryFn: () => clientFetch(`${baseEndpoint}/${id}/images`),
				...cacheConfig,
				enabled: !!id,
			}),
	}
}