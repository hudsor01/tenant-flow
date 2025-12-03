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
import type {
	PaginatedResponse,
	TenantFilters,
	TenantInvitation
} from '@repo/shared/types/api-contracts'

// Re-export for backward compatibility
export type { TenantFilters, TenantInvitation }

/**
 * Invitation filters
 */
export interface InvitationFilters {
	status?: 'sent' | 'accepted' | 'expired'
	page?: number
	limit?: number
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
	 * const { data } = useQuery(tenantQueries.list({ status: 'active' }))
	 *
	 * // Prefetch
	 * queryClient.prefetchQuery(tenantQueries.list({ status: 'active' }))
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
				return clientFetch<PaginatedResponse<TenantWithLeaseInfo>>(
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

	/**
	 * Base key for all invitation queries
	 */
	invitations: () => [...tenantQueries.all(), 'invitations'] as const,

	/**
	 * All tenants (for dropdowns, selects)
	 * Cached longer for UI components
	 *
	 * @example
	 * const { data } = useQuery(tenantQueries.allTenants())
	 */
	allTenants: () =>
		queryOptions({
			queryKey: [...tenantQueries.lists(), 'all'],
			queryFn: () => clientFetch<TenantWithLeaseInfo[]>('/api/v1/tenants'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000, // Keep 30 minutes for dropdown data
			retry: 3,
			retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
			structuralSharing: true
		}),

	/**
	 * Tenant polling (real-time updates)
	 *
	 * @example
	 * const { data } = useQuery(tenantQueries.polling(tenant_id))
	 */
	polling: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id, 'polling'],
			queryFn: () => clientFetch<Tenant>(`/api/v1/tenants/${id}`),
			enabled: !!id,
			refetchInterval: 30000, // 30 seconds
			refetchIntervalInBackground: false,
			staleTime: 0 // Always refetch on interval
		}),

	/**
	 * Tenant notification preferences
	 *
	 * @example
	 * const { data } = useQuery(tenantQueries.notificationPreferences(tenant_id))
	 */
	notificationPreferences: (tenant_id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), tenant_id, 'notification-preferences'],
			queryFn: () =>
				clientFetch<{
					emailNotifications: boolean
					smsNotifications: boolean
					maintenanceUpdates: boolean
					paymentReminders: boolean
				}>(`/api/v1/tenants/${tenant_id}/notification-preferences`),
			enabled: !!tenant_id,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 10 * 60 * 1000 // 10 minutes
		}),

	/**
	 * List of tenant invitations
	 *
	 * @example
	 * const { data } = useQuery(tenantQueries.invitationList())
	 */
	invitationList: () =>
		queryOptions({
			queryKey: tenantQueries.invitations(),
			queryFn: () => clientFetch<PaginatedResponse<TenantInvitation>>('/api/v1/tenants/invitations'),
			...QUERY_CACHE_TIMES.LIST
		})
}
