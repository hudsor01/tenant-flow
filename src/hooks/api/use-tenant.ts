/**
 * Tenant Query Hooks & Query Options
 * TanStack Query hooks for tenant data fetching
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Query keys are in a separate file to avoid circular dependencies.
 * Mutation hooks are in use-tenant-mutations.ts.
 *
 * PostgREST migration notes:
 * - All CRUD mutations use supabase-js directly
 * - tenants table: id, user_id, emergency_contact_*, identity_verified, ssn_last_four, stripe_customer_id
 * - Invite flow: creates tenant_invitations record; actual tenant created when user accepts
 */

import {
	keepPreviousData,
	usePrefetchQuery,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import type { TenantWithLeaseInfo } from '#types/core'

// Import query keys from separate file to avoid circular dependency
import { tenantQueries } from './query-keys/tenant-keys'

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
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch tenant by ID
 * Uses placeholderData from list cache for instant detail view
 */
export function useTenant(id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		...tenantQueries.detail(id),
		placeholderData: () => {
			// Search all list caches for this tenant
			const listCaches = queryClient.getQueriesData<{
				data?: TenantWithLeaseInfo[]
			}>({
				queryKey: tenantQueries.lists()
			})

			for (const [, response] of listCaches) {
				const item = response?.data?.find(t => t.id === id)
				if (item) return item
			}
			return undefined
		}
	})
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
 * Declarative prefetch hook for tenant detail
 * Prefetches when component mounts (route-level prefetching)
 *
 * For imperative prefetching (e.g., on hover), use:
 * queryClient.prefetchQuery(tenantQueries.detail(id))
 */
export function usePrefetchTenantDetail(id: string) {
	usePrefetchQuery(tenantQueries.detail(id))
}

/**
 * Declarative prefetch hook for tenant with lease info
 * Prefetches tenant detail with associated lease data
 */
export function usePrefetchTenantWithLease(id: string) {
	usePrefetchQuery(tenantQueries.withLease(id))
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
