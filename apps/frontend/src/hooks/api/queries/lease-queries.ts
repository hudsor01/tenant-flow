/**
 * Lease Query Options (TanStack Query v5 Pattern)
 *
 * Uses native fetch for NestJS calls.
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'
import type { Lease } from '@repo/shared/types/core'
import type { LeaseWithDetails, LeaseWithRelations } from '@repo/shared/types/relations'
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
 */
export const leaseQueries = {
	all: () => ['leases'] as const,
	lists: () => [...leaseQueries.all(), 'list'] as const,

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
				return apiRequest<PaginatedResponse<LeaseWithRelations>>(`/api/v1/leases${params ? `?${params}` : ''}`)
			},
			...QUERY_CACHE_TIMES.LIST,
		}),

	details: () => [...leaseQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.details(), id],
			queryFn: () => apiRequest<Lease>(`/api/v1/leases/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
			retry: 2,
		}),

	tenantPortalActive: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'tenant-portal', 'active'],
			queryFn: () => apiRequest<TenantPortalLease | null>('/api/v1/tenants/leases'),
			...QUERY_CACHE_TIMES.DETAIL,
			retry: 2,
		}),

	expiring: (days: number = 30) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'expiring', days],
			queryFn: () => apiRequest<Lease[]>(`/api/v1/leases/expiring?days=${days}`),
			...QUERY_CACHE_TIMES.DETAIL,
			retry: 2,
		}),

	stats: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'stats'],
			queryFn: () => apiRequest('/api/v1/leases/stats'),
			...QUERY_CACHE_TIMES.STATS,
		}),

	signatureStatus: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'signature-status', id],
			queryFn: () => apiRequest<SignatureStatus>(`/api/v1/leases/${id}/signature-status`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	analytics: {
		performance: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'performance'],
				queryFn: () => apiRequest('/api/v1/leases/analytics/performance'),
				...QUERY_CACHE_TIMES.STATS,
			}),
		duration: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'duration'],
				queryFn: () => apiRequest('/api/v1/leases/analytics/duration'),
				...QUERY_CACHE_TIMES.STATS,
			}),
		turnover: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'turnover'],
				queryFn: () => apiRequest('/api/v1/leases/analytics/turnover'),
				...QUERY_CACHE_TIMES.STATS,
			}),
		revenue: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'revenue'],
				queryFn: () => apiRequest('/api/v1/leases/analytics/revenue'),
				...QUERY_CACHE_TIMES.STATS,
			}),
	},
}
