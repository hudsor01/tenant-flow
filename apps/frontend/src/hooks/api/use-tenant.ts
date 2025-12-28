/**
 * Tenant Hooks
 * TanStack Query hooks for tenant management - Single Source of Truth
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * TanStack Query provides:
 * - Normalized cache (query keys)
 * - Global state (accessible anywhere)
 * - Automatic deduplication
 * - Loading/error states
 * - Optimistic updates
 */

import { useMemo } from 'react'
import {
	keepPreviousData,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { tenantQueries } from './queries/tenant-queries'
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
	const queryOptions = tenantQueries.list({ limit, offset })

	return useQuery({
		...queryOptions,
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
 * Hook for tenant data with polling fallback
 * @deprecated Prefer using useTenant() with SSE enabled at app level.
 */
export function useTenantPolling(id: string, interval: number = 5 * 60 * 1000) {
	return useQuery({
		...tenantQueries.polling(id),
		refetchInterval: interval
	})
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
