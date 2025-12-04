/**
 * Tenant Payment Query Options (TanStack Query v5 Pattern)
 *
 * Single source of truth for tenant payment-related queries.
 * Uses native fetch for NestJS calls.
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'
import type { TenantPaymentHistoryResponse } from '@repo/shared/types/api-contracts'

/**
 * Tenant payment query filters
 */
export interface TenantPaymentFilters {
	limit?: number
	enabled?: boolean
}

/**
 * Tenant payment query factory
 */
export const tenantPaymentQueries = {
	/**
	 * Base key for all tenant payment queries
	 */
	all: () => ['tenantPayments'] as const,

	/**
	 * Base key for owner tenant payment queries
	 */
	owner: () => [...tenantPaymentQueries.all(), 'owner'] as const,

	/**
	 * Owner tenant payments by tenant ID
	 *
	 * @example
	 * const { data } = useQuery(tenantPaymentQueries.ownerPayments(tenant_id, { limit: 20 }))
	 */
	ownerPayments: (tenant_id: string, filters?: TenantPaymentFilters) =>
		queryOptions({
			queryKey: [...tenantPaymentQueries.owner(), tenant_id, filters?.limit ?? 20],
			queryFn: () => apiRequest<TenantPaymentHistoryResponse>(`/api/v1/tenants/${tenant_id}/payments?limit=${filters?.limit ?? 20}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: filters?.enabled ?? Boolean(tenant_id)
		}),

	/**
	 * Base key for self tenant payment queries
	 */
	self: () => [...tenantPaymentQueries.all(), 'self'] as const,

	/**
	 * Current tenant's payment history
	 *
	 * @example
	 * const { data } = useQuery(tenantPaymentQueries.selfPayments({ limit: 20 }))
	 */
	selfPayments: (filters?: TenantPaymentFilters) =>
		queryOptions({
			queryKey: [...tenantPaymentQueries.self(), filters?.limit ?? 20],
			queryFn: () => apiRequest<TenantPaymentHistoryResponse>(`/api/v1/tenants/me/payments?limit=${filters?.limit ?? 20}`),
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: filters?.enabled ?? true
		})
}

// Re-export keys for backward compatibility
export const tenantPaymentKeys = {
	owner: (tenant_id: string) => [...tenantPaymentQueries.owner(), tenant_id] as const,
	self: () => tenantPaymentQueries.self()
}
