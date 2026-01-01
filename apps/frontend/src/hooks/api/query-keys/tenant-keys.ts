/**
 * Tenant Query Keys & Options
 * Extracted to avoid circular dependencies with mutation hooks
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - AbortSignal for query cancellation
 */

import { queryOptions } from '@tanstack/react-query'
import type {
	Tenant,
	TenantWithLeaseInfo,
	TenantStats
} from '@repo/shared/types/core'
import type {
	PaginatedResponse,
	TenantFilters,
	TenantInvitation,
	TenantPaymentHistoryResponse
} from '@repo/shared/types/api-contracts'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'

/**
 * Tenant query factory
 */
export const tenantQueries = {
	all: () => ['tenants'] as const,
	lists: () => [...tenantQueries.all(), 'list'] as const,

	list: (filters?: TenantFilters) =>
		queryOptions({
			queryKey: [...tenantQueries.lists(), filters ?? {}],
			queryFn: async ({ signal }) => {
				const searchParams = new URLSearchParams()
				if (filters?.status) searchParams.append('status', filters.status)
				if (filters?.property_id)
					searchParams.append('property_id', filters.property_id)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit)
					searchParams.append('limit', filters.limit.toString())
				if (filters?.offset)
					searchParams.append('offset', filters.offset.toString())
				const params = searchParams.toString()
				return apiRequest<PaginatedResponse<TenantWithLeaseInfo>>(
					`/api/v1/tenants${params ? `?${params}` : ''}`,
					{ signal }
				)
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	details: () => [...tenantQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id],
			queryFn: ({ signal }) =>
				apiRequest<Tenant>(`/api/v1/tenants/${id}`, { signal }),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	withLease: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'with-lease', id],
			queryFn: ({ signal }) =>
				apiRequest<TenantWithLeaseInfo>(`/api/v1/tenants/${id}/with-lease`, {
					signal
				}),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	stats: () =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'stats'],
			queryFn: ({ signal }) =>
				apiRequest<TenantStats>('/api/v1/tenants/stats', { signal }),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000
		}),

	invitations: () => [...tenantQueries.all(), 'invitations'] as const,

	allTenants: () =>
		queryOptions({
			queryKey: [...tenantQueries.lists(), 'all'],
			queryFn: ({ signal }) =>
				apiRequest<TenantWithLeaseInfo[]>('/api/v1/tenants', { signal }),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000,
			structuralSharing: true
		}),

	/**
	 * Tenant detail query with SSE real-time updates
	 * SSE automatically invalidates queries on tenant.updated events
	 * Fallback polling at 5 min for missed events, refetch on window focus
	 */
	polling: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id, 'polling'],
			queryFn: ({ signal }) =>
				apiRequest<Tenant>(`/api/v1/tenants/${id}`, { signal }),
			enabled: !!id,
			// SSE provides real-time updates; 5-min fallback for missed events
			refetchInterval: 5 * 60 * 1000, // 5 minutes (reduced from 30 seconds)
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
			staleTime: 30_000 // Consider fresh for 30 seconds
		}),

	notificationPreferences: (tenant_id: string) =>
		queryOptions({
			queryKey: [
				...tenantQueries.details(),
				tenant_id,
				'notification-preferences'
			],
			queryFn: ({ signal }) =>
				apiRequest<{
					emailNotifications: boolean
					smsNotifications: boolean
					maintenanceUpdates: boolean
					paymentReminders: boolean
				}>(`/api/v1/tenants/${tenant_id}/notification-preferences`, { signal }),
			enabled: !!tenant_id,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 10 * 60 * 1000
		}),

	invitationList: () =>
		queryOptions({
			queryKey: tenantQueries.invitations(),
			queryFn: ({ signal }) =>
				apiRequest<PaginatedResponse<TenantInvitation>>(
					'/api/v1/tenants/invitations',
					{ signal }
				),
			...QUERY_CACHE_TIMES.LIST
		}),

	/**
	 * Payment history for a specific tenant
	 * Returns list of payment records with status, amount, and dates
	 */
	paymentHistory: (tenantId: string, limit?: number) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), tenantId, 'payments', limit ?? 20],
			queryFn: ({ signal }) => {
				const params = limit ? `?limit=${limit}` : ''
				return apiRequest<TenantPaymentHistoryResponse>(
					`/api/v1/tenants/${tenantId}/payments${params}`,
					{ signal }
				)
			},
			enabled: !!tenantId,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 5 * 60 * 1000
		}),

	/**
	 * All leases (past and current) for a specific tenant
	 * Used in tenant detail view for lease history
	 */
	leaseHistory: (tenantId: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), tenantId, 'leases'],
			queryFn: ({ signal }) =>
				apiRequest<{
					leases: Array<{
						id: string
						property_name: string
						unit_number: string
						start_date: string
						end_date: string | null
						rent_amount: number
						status: string
					}>
				}>(`/api/v1/tenants/${tenantId}/leases`, { signal }),
			enabled: !!tenantId,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 10 * 60 * 1000
		})
}
