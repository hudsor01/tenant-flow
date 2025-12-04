/**
 * Tenant Query Options (TanStack Query v5 Pattern)
 *
 * Uses native fetch for NestJS calls, Supabase direct for table data.
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'
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
 */
export const tenantQueries = {
	all: () => ['tenants'] as const,
	lists: () => [...tenantQueries.all(), 'list'] as const,

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
				return apiRequest<PaginatedResponse<TenantWithLeaseInfo>>(`/api/v1/tenants${params ? `?${params}` : ''}`)
			},
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	details: () => [...tenantQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id],
			queryFn: () => apiRequest<Tenant>(`/api/v1/tenants/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	withLease: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'with-lease', id],
			queryFn: () => apiRequest<TenantWithLeaseInfo>(`/api/v1/tenants/${id}/with-lease`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	stats: () =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'stats'],
			queryFn: () => apiRequest<TenantStats>('/api/v1/tenants/stats'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000,
		}),

	invitations: () => [...tenantQueries.all(), 'invitations'] as const,

	allTenants: () =>
		queryOptions({
			queryKey: [...tenantQueries.lists(), 'all'],
			queryFn: () => apiRequest<TenantWithLeaseInfo[]>('/api/v1/tenants'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000,
			retry: 3,
			retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
			structuralSharing: true
		}),

	polling: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id, 'polling'],
			queryFn: () => apiRequest<Tenant>(`/api/v1/tenants/${id}`),
			enabled: !!id,
			refetchInterval: 30000,
			refetchIntervalInBackground: false,
			staleTime: 0
		}),

	notificationPreferences: (tenant_id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), tenant_id, 'notification-preferences'],
			queryFn: () => apiRequest<{
				emailNotifications: boolean
				smsNotifications: boolean
				maintenanceUpdates: boolean
				paymentReminders: boolean
			}>(`/api/v1/tenants/${tenant_id}/notification-preferences`),
			enabled: !!tenant_id,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 10 * 60 * 1000
		}),

	invitationList: () =>
		queryOptions({
			queryKey: tenantQueries.invitations(),
			queryFn: () => apiRequest<PaginatedResponse<TenantInvitation>>('/api/v1/tenants/invitations'),
			...QUERY_CACHE_TIMES.LIST
		})
}
