/**
 * Tenant Query Options (TanStack Query v5 Pattern)
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
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { Tenant, TenantWithLeaseInfo, TenantStats } from '@repo/shared/types/core'

/**
 * Tenant query filters
 */
export interface TenantFilters {
	status?: 'ACTIVE' | 'INACTIVE' | 'PENDING'
	property_id?: string
	search?: string
	limit?: number
	offset?: number
}

/**
 * Tenant query factory
 * Hierarchical structure for targeted cache invalidation
 */
export const tenantQueries = {
	/**
	 * Base key for all tenant queries
	 * Use for invalidating ALL tenant-related data
	 */
	all: () => ['tenants'] as const,

	/**
	 * Base key for all tenant lists
	 */
	lists: () => [...tenantQueries.all(), 'list'] as const,

	/**
	 * Tenant list with optional filters
	 *
	 * @example
	 * // In component
	 * const { data } = useQuery(tenantQueries.list({ status: 'ACTIVE' }))
	 *
	 * // Prefetch
	 * queryClient.prefetchQuery(tenantQueries.list({ status: 'ACTIVE' }))
	 */
	list: (filters?: TenantFilters) =>
		queryOptions({
			queryKey: [...tenantQueries.lists(), filters ?? {}],
			queryFn: async () => {
				const searchParams = new URLSearchParams()
				if (filters?.status) searchParams.append('status', filters.status)
				if (filters?.property_id) searchParams.append('property_id', filters.property_id)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit) searchParams.append('limit', filters.limit.toString())
				if (filters?.offset) searchParams.append('offset', filters.offset.toString())

				const params = searchParams.toString()
				return clientFetch<TenantWithLeaseInfo[]>(
					`/api/v1/tenants${params ? `?${params}` : ''}`
				)
			},
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	/**
	 * Base key for all tenant details
	 */
	details: () => [...tenantQueries.all(), 'detail'] as const,

	/**
	 * Single tenant by ID
	 *
	 * @example
	 * const { data } = useQuery(tenantQueries.detail(tenant_id))
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id],
			queryFn: () => clientFetch<Tenant>(`/api/v1/tenants/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	/**
	 * Tenant with lease information
	 *
	 * @example
	 * const { data } = useQuery(tenantQueries.withLease(tenant_id))
	 */
	withLease: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'with-lease', id],
			queryFn: () =>
				clientFetch<TenantWithLeaseInfo>(`/api/v1/tenants/${id}/with-lease`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	/**
	 * Tenant statistics
	 *
	 * @example
	 * const { data } = useQuery(tenantQueries.stats())
	 */
	stats: () =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'stats'],
			queryFn: () => clientFetch<TenantStats>('/api/v1/tenants/stats'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000, // Keep 30 minutes for stats
		}),
}
