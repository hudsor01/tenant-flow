/**
 * Lease Query Keys & Options
 * Extracted to avoid circular dependencies and enable reuse across files
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - AbortSignal for query cancellation
 */

import { queryOptions } from '@tanstack/react-query'
import type { Lease } from '@repo/shared/types/core'
import type {
	LeaseWithDetails,
	LeaseWithRelations
} from '@repo/shared/types/relations'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Lease query filters
 */
export interface LeaseFilters {
	property_id?: string
	unit_id?: string
	tenant_id?: string
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

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Lease query factory
 */
export const leaseQueries = {
	all: () => ['leases'] as const,
	lists: () => [...leaseQueries.all(), 'list'] as const,

	list: (filters?: LeaseFilters) =>
		queryOptions({
			queryKey: [...leaseQueries.lists(), filters ?? {}],
			queryFn: async ({ signal }) => {
				const searchParams = new URLSearchParams()
				if (filters?.property_id)
					searchParams.append('property_id', filters.property_id)
				if (filters?.unit_id) searchParams.append('unit_id', filters.unit_id)
				if (filters?.tenant_id)
					searchParams.append('tenant_id', filters.tenant_id)
				if (filters?.status) searchParams.append('status', filters.status)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit)
					searchParams.append('limit', filters.limit.toString())
				if (filters?.offset)
					searchParams.append('offset', filters.offset.toString())
				const params = searchParams.toString()
				return apiRequest<PaginatedResponse<LeaseWithRelations>>(
					`/api/v1/leases${params ? `?${params}` : ''}`,
					{ signal }
				)
			},
			...QUERY_CACHE_TIMES.LIST
		}),

	details: () => [...leaseQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.details(), id],
			queryFn: ({ signal }) =>
				apiRequest<Lease>(`/api/v1/leases/${id}`, { signal }),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	tenantPortalActive: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'tenant-portal', 'active'],
			queryFn: ({ signal }) =>
				apiRequest<TenantPortalLease | null>('/api/v1/tenant-portal/leases', {
					signal
				}),
			...QUERY_CACHE_TIMES.DETAIL
		}),

	expiring: (days: number = 30) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'expiring', days],
			queryFn: ({ signal }) =>
				apiRequest<Lease[]>(`/api/v1/leases/expiring?days=${days}`, { signal }),
			...QUERY_CACHE_TIMES.DETAIL
		}),

	stats: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'stats'],
			queryFn: ({ signal }) =>
				apiRequest('/api/v1/leases/stats', { signal }),
			...QUERY_CACHE_TIMES.STATS
		}),

	signatureStatus: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'signature-status', id],
			queryFn: ({ signal }) =>
				apiRequest<SignatureStatus>(`/api/v1/leases/${id}/signature-status`, {
					signal
				}),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	analytics: {
		performance: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'performance'],
				queryFn: ({ signal }) =>
					apiRequest('/api/v1/leases/analytics/performance', { signal }),
				...QUERY_CACHE_TIMES.STATS
			}),
		duration: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'duration'],
				queryFn: ({ signal }) =>
					apiRequest('/api/v1/leases/analytics/duration', { signal }),
				...QUERY_CACHE_TIMES.STATS
			}),
		turnover: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'turnover'],
				queryFn: ({ signal }) =>
					apiRequest('/api/v1/leases/analytics/turnover', { signal }),
				...QUERY_CACHE_TIMES.STATS
			}),
		revenue: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'revenue'],
				queryFn: ({ signal }) =>
					apiRequest('/api/v1/leases/analytics/revenue', { signal }),
				...QUERY_CACHE_TIMES.STATS
			})
	}
}
