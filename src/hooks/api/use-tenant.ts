import {
	keepPreviousData,
	usePrefetchQuery,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import type { TenantWithLeaseInfo } from '#types/core'
import { useEntityDetail } from '#hooks/use-entity-detail'

import { tenantQueries } from './query-keys/tenant-keys'

// Uses placeholderData from list cache for instant detail view
export function useTenant(id: string) {
	return useEntityDetail<TenantWithLeaseInfo>({
		queryOptions: tenantQueries.detail(id),
		listQueryKey: tenantQueries.lists(),
		id
	})
}

export function useTenantWithLease(id: string) {
	return useEntityDetail<TenantWithLeaseInfo>({
		queryOptions: tenantQueries.withLease(id),
		id
	})
}

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

export function useTenantStats() {
	return useQuery(tenantQueries.stats())
}

// Declarative prefetch on mount. For hover/imperative prefetch, call queryClient.prefetchQuery directly.
export function usePrefetchTenantDetail(id: string) {
	usePrefetchQuery(tenantQueries.detail(id))
}

export function usePrefetchTenantWithLease(id: string) {
	usePrefetchQuery(tenantQueries.withLease(id))
}

// Returns a rollback closure for optimistic writes.
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

export function useNotificationPreferences(tenant_id: string) {
	return useQuery(tenantQueries.notificationPreferences(tenant_id))
}

