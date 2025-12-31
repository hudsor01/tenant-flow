/**
 * Tenant Hooks & Query Options
 * TanStack Query hooks for tenant management with colocated query options
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Colocated query options + hooks following the single-file pattern:
 * - Query factory with all tenant queries
 * - Query hooks for data fetching
 * - Utility hooks for prefetching and optimistic updates
 */

import { useMemo } from 'react'
import {
	keepPreviousData,
	queryOptions,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
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
import {
	useCreateTenant as useCreateTenantMutation,
	useUpdateTenant as useUpdateTenantMutation
} from './mutations/tenant-mutations'

// Re-export all mutations from the mutations module
export {
	useCreateTenant,
	useUpdateTenant,
	useCreateTenantMutation as useCreateTenantMutationFactory,
	useUpdateTenantMutation as useUpdateTenantMutationFactory,
	useDeleteTenantMutation,
	useMarkTenantAsMovedOut,
	useBatchTenantOperations,
	useInviteTenant,
	useResendInvitation,
	useCancelInvitation,
	useUpdateNotificationPreferences
} from './mutations/tenant-mutations'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Invitation filters
 */
export interface InvitationFilters {
	status?: 'sent' | 'accepted' | 'expired'
	page?: number
	limit?: number
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

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
				if (filters?.property_id)
					searchParams.append('property_id', filters.property_id)
				if (filters?.search) searchParams.append('search', filters.search)
				if (filters?.limit)
					searchParams.append('limit', filters.limit.toString())
				if (filters?.offset)
					searchParams.append('offset', filters.offset.toString())
				const params = searchParams.toString()
				return apiRequest<PaginatedResponse<TenantWithLeaseInfo>>(
					`/api/v1/tenants${params ? `?${params}` : ''}`
				)
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	details: () => [...tenantQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id],
			queryFn: () => apiRequest<Tenant>(`/api/v1/tenants/${id}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	withLease: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'with-lease', id],
			queryFn: () =>
				apiRequest<TenantWithLeaseInfo>(`/api/v1/tenants/${id}/with-lease`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	stats: () =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'stats'],
			queryFn: () => apiRequest<TenantStats>('/api/v1/tenants/stats'),
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000
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

	/**
	 * Tenant detail query with SSE real-time updates
	 * SSE automatically invalidates queries on tenant.updated events
	 * Fallback polling at 5 min for missed events, refetch on window focus
	 */
	polling: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id, 'polling'],
			queryFn: () => apiRequest<Tenant>(`/api/v1/tenants/${id}`),
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
			queryFn: () =>
				apiRequest<{
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
			queryFn: () =>
				apiRequest<PaginatedResponse<TenantInvitation>>(
					'/api/v1/tenants/invitations'
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
			queryFn: () => {
				const params = limit ? `?limit=${limit}` : ''
				return apiRequest<TenantPaymentHistoryResponse>(
					`/api/v1/tenants/${tenantId}/payments${params}`
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
			queryFn: () =>
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
				}>(`/api/v1/tenants/${tenantId}/leases`),
			enabled: !!tenantId,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 10 * 60 * 1000
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch tenant by ID
 */
export function useTenant(id: string) {
	return useQuery(tenantQueries.detail(id))
}

/**
 * Hook to fetch tenant with lease information
 */
export function useTenantWithLease(id: string) {
	return useQuery(tenantQueries.withLease(id))
}

/**
 * Hook to fetch tenant list with pagination
 */
export function useTenantList(page: number = 1, limit: number = 50) {
	const queryClient = useQueryClient()
	const offset = (page - 1) * limit
	const queryOpts = tenantQueries.list({ limit, offset })

	return useQuery({
		...queryOpts,
		select: response => {
			response.data?.forEach?.(tenant => {
				const detailKey = tenantQueries.detail(tenant.id).queryKey
				const leaseKey = tenantQueries.withLease(tenant.id).queryKey

				// TenantWithLeaseInfo extends Tenant, so this is type-safe
				if (!queryClient.getQueryData(detailKey)) {
					queryClient.setQueryData(detailKey, tenant)
				}
				if (!queryClient.getQueryData(leaseKey)) {
					queryClient.setQueryData(leaseKey, tenant)
				}
			})

			return {
				data: response.data || [],
				total: response.total || 0,
				page,
				limit
			}
		},
		retry: 2,
		placeholderData: keepPreviousData
	})
}

/**
 * Hook to fetch all tenants (for dropdowns, selects, etc.)
 */
export function useAllTenants() {
	const queryClient = useQueryClient()

	return useQuery({
		...tenantQueries.allTenants(),
		select: response => {
			response.forEach(tenant => {
				const existingDetail = queryClient.getQueryData(
					tenantQueries.detail(tenant.id).queryKey
				)
				const existingWithLease = queryClient.getQueryData(
					tenantQueries.withLease(tenant.id).queryKey
				)

				// TenantWithLeaseInfo extends Tenant, so this is type-safe
				if (!existingDetail) {
					queryClient.setQueryData(
						tenantQueries.detail(tenant.id).queryKey,
						tenant
					)
				}
				if (!existingWithLease) {
					queryClient.setQueryData(
						tenantQueries.withLease(tenant.id).queryKey,
						tenant
					)
				}
			})

			return response
		}
	})
}

/**
 * Hook to fetch tenant statistics
 */
export function useTenantStats() {
	return useQuery(tenantQueries.stats())
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Combined hook for tenant operations needed by tenant management pages
 */
export function useTenantOperations() {
	const createTenant = useCreateTenantMutation()
	const updateTenant = useUpdateTenantMutation()

	return useMemo(
		() => ({
			createTenant,
			updateTenant,
			isLoading: createTenant.isPending || updateTenant.isPending,
			error: createTenant.error || updateTenant.error
		}),
		[createTenant, updateTenant]
	)
}

/**
 * Hook for prefetching tenant data before navigation
 */
export function usePrefetchTenant() {
	const queryClient = useQueryClient()

	return {
		prefetchTenant: (id: string) => {
			return queryClient.prefetchQuery(tenantQueries.detail(id))
		},
		prefetchTenantWithLease: (id: string) => {
			return queryClient.prefetchQuery(tenantQueries.withLease(id))
		}
	}
}

/**
 * Hook for optimistic tenant updates with automatic rollback
 */
export function useOptimisticTenantUpdate() {
	const queryClient = useQueryClient()

	return {
		updateOptimistically: async (
			id: string,
			updates: Partial<TenantWithLeaseInfo>
		) => {
			await queryClient.cancelQueries({
				queryKey: tenantQueries.detail(id).queryKey
			})

			const previous = queryClient.getQueryData<TenantWithLeaseInfo>(
				tenantQueries.detail(id).queryKey
			)

			queryClient.setQueryData<TenantWithLeaseInfo>(
				tenantQueries.detail(id).queryKey,
				old => {
					if (!old) return old
					return { ...old, ...updates }
				}
			)

			return {
				previous,
				rollback: () => {
					if (previous) {
						queryClient.setQueryData(
							tenantQueries.detail(id).queryKey,
							previous
						)
					}
				}
			}
		}
	}
}

/**
 * Hook to fetch notification preferences for a tenant
 */
export function useNotificationPreferences(tenant_id: string) {
	return useQuery(tenantQueries.notificationPreferences(tenant_id))
}

/**
 * Hook to fetch tenant invitations list
 */
export function useInvitations() {
	return useQuery(tenantQueries.invitationList())
}
