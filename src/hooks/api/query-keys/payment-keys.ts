/**
 * Payment Query Keys and Query Options
 * Extracted from use-payments.ts for the query-keys/ convention.
 *
 * Contains:
 * - rentCollectionKeys: cache key factories for rent collection analytics
 * - rentPaymentKeys: cache key factories for rent payment status/history
 * - rentCollectionQueries: queryOptions factories for rent collection data
 * - tenantPaymentQueries: queryOptions factories for tenant payment data
 *
 * Payment verification keys and status queries are in payment-verification-keys.ts.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type {
	TenantPaymentHistoryResponse
} from '#types/api-contracts'
import type {
	PaymentCollectionAnalytics,
	UpcomingPayment,
	OverduePayment,
	PaymentFilters
} from '#types/sections/payments'

// ============================================================================
// TYPES
// ============================================================================

interface PaymentQueryOptions {
	limit?: number
	enabled?: boolean
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Rent collection query keys for cache management
 */
export const rentCollectionKeys = {
	all: ['rent-collection'] as const,
	analytics: () => [...rentCollectionKeys.all, 'analytics'] as const,
	upcoming: () => [...rentCollectionKeys.all, 'upcoming'] as const,
	overdue: () => [...rentCollectionKeys.all, 'overdue'] as const,
	list: (filters?: PaymentFilters) =>
		[...rentCollectionKeys.all, 'list', filters] as const,
	detail: (id: string) => [...rentCollectionKeys.all, 'detail', id] as const
}

/**
 * Rent payment query keys
 */
export const rentPaymentKeys = {
	all: ['rent-payments'] as const,
	list: () => [...rentPaymentKeys.all, 'list'] as const,
	status: (tenant_id: string) =>
		[...rentPaymentKeys.all, 'status', tenant_id] as const,
	tenantHistory: () => [...rentPaymentKeys.all, 'tenant-history'] as const,
	ownerView: (tenant_id: string, limit?: number) =>
		[
			...rentPaymentKeys.all,
			'tenant-history',
			'owner',
			tenant_id,
			limit ?? 20
		] as const,
	selfView: (limit?: number) =>
		[...rentPaymentKeys.all, 'tenant-history', 'self', limit ?? 20] as const
}

// ============================================================================
// QUERY OPTIONS (for direct use with useQueries/prefetch)
// ============================================================================

/**
 * Rent collection query factory
 */
export const rentCollectionQueries = {
	all: () => ['rent-collection'] as const,

	analytics: () =>
		queryOptions({
			queryKey: rentCollectionKeys.analytics(),
			queryFn: async (): Promise<PaymentCollectionAnalytics> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc('get_dashboard_stats', {
					p_user_id: user.id
				})
				if (error) handlePostgrestError(error, 'rent_payments')
				const stats = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
				const revenue = stats?.revenue as { monthly?: number } | undefined
				return {
					totalCollected: revenue?.monthly ?? 0,
					totalPending: 0,
					totalOverdue: 0,
					collectionRate: 0,
					averagePaymentTime: 0,
					onTimePaymentRate: 0,
					monthlyTrend: [],
				} satisfies PaymentCollectionAnalytics
			},
			staleTime: 60 * 1000
		}),

	upcoming: () =>
		queryOptions({
			queryKey: rentCollectionKeys.upcoming(),
			queryFn: async (): Promise<UpcomingPayment[]> => {
				const supabase = createClient()
				const today = new Date().toISOString().split('T')[0] as string
				const thirtyDaysOut = new Date(Date.now() + 30 * 86400000)
					.toISOString()
					.split('T')[0] as string
				const { data, error } = await supabase
					.from('rent_payments')
					.select(
						'id, amount, currency, status, due_date, tenant_id, lease_id, period_start, period_end'
					)
					.gte('due_date', today)
					.lte('due_date', thirtyDaysOut)
					.eq('status', 'pending')
					.order('due_date')
					.limit(50)
				if (error) handlePostgrestError(error, 'rent_payments')
				return (data ?? []) as unknown as UpcomingPayment[]
			},
			staleTime: 60 * 1000
		}),

	overdue: () =>
		queryOptions({
			queryKey: rentCollectionKeys.overdue(),
			queryFn: async (): Promise<OverduePayment[]> => {
				const supabase = createClient()
				const today = new Date().toISOString().split('T')[0] as string
				const { data, error } = await supabase
					.from('rent_payments')
					.select(
						'id, amount, currency, status, due_date, tenant_id, lease_id, period_start, period_end'
					)
					.lt('due_date', today)
					.in('status', ['pending', 'failed'])
					.order('due_date')
					.limit(50)
				if (error) handlePostgrestError(error, 'rent_payments')
				return (data ?? []) as unknown as OverduePayment[]
			},
			staleTime: 30 * 1000
		})
}

/**
 * Tenant payment query factory
 */
export const tenantPaymentQueries = {
	ownerPayments: (tenant_id: string, options?: PaymentQueryOptions) =>
		queryOptions({
			queryKey: rentPaymentKeys.ownerView(tenant_id, options?.limit),
			queryFn: async (): Promise<TenantPaymentHistoryResponse> => {
				const supabase = createClient()
				const limit = options?.limit ?? 20
				const { data, error, count } = await supabase
					.from('rent_payments')
					.select('*', { count: 'exact' })
					.eq('tenant_id', tenant_id)
					.order('due_date', { ascending: false })
					.limit(limit)
				if (error) handlePostgrestError(error, 'rent_payments')
				return {
					payments: (data ?? []) as unknown as TenantPaymentHistoryResponse['payments'],
					pagination: {
						page: 1,
						limit,
						total: count ?? 0
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: options?.enabled ?? Boolean(tenant_id)
		}),
	selfPayments: (options?: PaymentQueryOptions) =>
		queryOptions({
			queryKey: rentPaymentKeys.selfView(options?.limit),
			queryFn: async (): Promise<TenantPaymentHistoryResponse> => {
				const supabase = createClient()
				const limit = options?.limit ?? 20
				// Resolve tenant record for the logged-in user
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data: tenant, error: tenantError } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()
				if (tenantError) handlePostgrestError(tenantError, 'tenants')
				if (!tenant) throw new Error('Tenant record not found')

				const { data, error, count } = await supabase
					.from('rent_payments')
					.select('*', { count: 'exact' })
					.eq('tenant_id', tenant.id)
					.order('due_date', { ascending: false })
					.limit(limit)
				if (error) handlePostgrestError(error, 'rent_payments')
				return {
					payments: (data ?? []) as unknown as TenantPaymentHistoryResponse['payments'],
					pagination: {
						page: 1,
						limit,
						total: count ?? 0
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: options?.enabled ?? true
		})
}
