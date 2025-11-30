/**
 * Lease Query Options (TanStack Query v5 Pattern)
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
import type { Lease } from '@repo/shared/types/core'
import type { LeaseWithDetails } from '@repo/shared/types/relations'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'

/**
 * Lease query filters
 */
export interface LeaseFilters {
	status?: string
	search?: string
	limit?: number
	offset?: number
}

/**
 * Signature status for a lease
 */
export interface SignatureStatus {
	lease_id: string
	status: string
	owner_signed: boolean
	owner_signed_at: string | null
	tenant_signed: boolean
	tenant_signed_at: string | null
	sent_for_signature_at: string | null
	both_signed: boolean
}

/**
 * Tenant Portal Lease type
 */
export type TenantPortalLease = LeaseWithDetails & {
	metadata: {
		documentUrl: string | null
	}
}

/**
 * Lease query factory
 * Hierarchical structure for targeted cache invalidation
 */
export const leaseQueries = {
	/**
	 * Base key for all lease queries
	 * Use for invalidating ALL lease-related data
	 */
	all: () => ['leases'] as const,

	/**
	 * Base key for all lease lists
	 */
	lists: () => [...leaseQueries.all(), 'list'] as const,

	/**
	 * Lease list with optional filters
	 *
	 * @example
	 * const { data } = useQuery(leaseQueries.list({ status: 'ACTIVE' }))
	 */
	list: (filters?: LeaseFilters) =>
		queryOptions({
			queryKey: [...leaseQueries.lists(), filters ?? {}],
			queryFn: async () => {
				const searchParams = new URLSearchParams()
				if (filters?.status) searchParams.append('status', filters.status)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit) searchParams.append('limit', filters.limit.toString())
				if (filters?.offset) searchParams.append('offset', filters.offset.toString())

				const params = searchParams.toString()
				return clientFetch<PaginatedResponse<Lease>>(
					`/api/v1/leases${params ? `?${params}` : ''}`
				)
			},
			...QUERY_CACHE_TIMES.LIST,
		}),

	/**
	 * Base key for all lease details
	 */
	details: () => [...leaseQueries.all(), 'detail'] as const,

	/**
	 * Single lease by ID
	 *
	 * @example
	 * const { data } = useQuery(leaseQueries.detail(lease_id))
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.details(), id],
			queryFn: () => clientFetch<Lease>(`/api/v1/leases/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
			retry: 2,
		}),

	/**
	 * Current tenant portal lease
	 *
	 * @example
	 * const { data } = useQuery(leaseQueries.tenantPortalActive())
	 */
	tenantPortalActive: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'tenant-portal', 'active'],
			queryFn: () =>
				clientFetch<TenantPortalLease | null>('/api/v1/tenant-portal/lease'),
			...QUERY_CACHE_TIMES.DETAIL,
			retry: 2,
		}),

	/**
	 * Expiring leases
	 *
	 * @example
	 * const { data } = useQuery(leaseQueries.expiring())
	 */
	expiring: (days: number = 30) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'expiring', days],
			queryFn: () => clientFetch<Lease[]>(`/api/v1/leases/expiring?days=${days}`),
			...QUERY_CACHE_TIMES.DETAIL,
			retry: 2,
		}),

	/**
	 * Lease statistics
	 *
	 * @example
	 * const { data } = useQuery(leaseQueries.stats())
	 */
	stats: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'stats'],
			queryFn: () => clientFetch('/api/v1/leases/stats'),
			...QUERY_CACHE_TIMES.STATS,
		}),

	/**
	 * Lease signature status
	 *
	 * @example
	 * const { data } = useQuery(leaseQueries.signatureStatus(lease_id))
	 */
	signatureStatus: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'signature-status', id],
			queryFn: () =>
				clientFetch<SignatureStatus>(`/api/v1/leases/${id}/signature-status`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	/**
	 * Lease analytics queries
	 */
	analytics: {
		performance: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'performance'],
				queryFn: () => clientFetch('/api/v1/leases/analytics/performance'),
				...QUERY_CACHE_TIMES.STATS,
			}),
		duration: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'duration'],
				queryFn: () => clientFetch('/api/v1/leases/analytics/duration'),
				...QUERY_CACHE_TIMES.STATS,
			}),
		turnover: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'turnover'],
				queryFn: () => clientFetch('/api/v1/leases/analytics/turnover'),
				...QUERY_CACHE_TIMES.STATS,
			}),
		revenue: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'revenue'],
				queryFn: () => clientFetch('/api/v1/leases/analytics/revenue'),
				...QUERY_CACHE_TIMES.STATS,
			}),
	},
}
