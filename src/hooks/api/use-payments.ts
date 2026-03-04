/**
 * Payments Hooks
 * TanStack Query hooks for all payment-related functionality
 *
 * All operations use Supabase PostgREST directly — no apiRequest calls.
 * rent_payments table: id, amount, currency, status, tenant_id, lease_id,
 *   stripe_payment_intent_id, application_fee_amount, late_fee_amount,
 *   payment_method_type, period_start, period_end, due_date, paid_date,
 *   notes, created_at, updated_at
 *
 * Includes:
 * - Rent collection (analytics, upcoming/overdue, manual payments, CSV export)
 * - Rent payments (status, history)
 * - Payment verification (Stripe Checkout session status)
 *
 * React 19 + TanStack Query v5 patterns
 */

import {
	queryOptions,
	useQuery,
	useMutation,
	useQueryClient,
	type QueryKey
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { mutationKeys } from './mutation-keys'
import type { StripeSessionStatusResponse } from '#shared/types/core'
import type {
	TenantPaymentStatusResponse,
	SendPaymentReminderRequest,
	SendPaymentReminderResponse,
	TenantPaymentHistoryResponse
} from '#shared/types/api-contracts'
import type {
	PaymentCollectionAnalytics,
	UpcomingPayment,
	OverduePayment,
	PaymentFilters,
	ManualPaymentInput
} from '#shared/types/sections/payments'
import type { SubscriptionData } from '#types/stripe'

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

/**
 * Payment verification query keys
 */
export const paymentVerificationKeys = {
	verifySession: (sessionId: string) =>
		['payment', 'verify', sessionId] as const,
	sessionStatus: (sessionId: string) =>
		['payment', 'status', sessionId] as const
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


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert rent_payments rows to CSV string
 */
function rowsToCsv(rows: Record<string, unknown>[]): string {
	if (rows.length === 0) return ''
	const headers = Object.keys(rows[0] as Record<string, unknown>)
	const headerRow = headers.join(',')
	const dataRows = rows.map(row =>
		headers
			.map(h => {
				const val = (row as Record<string, unknown>)[h]
				const str = val === null || val === undefined ? '' : String(val)
				// Escape double-quotes and wrap in quotes if value contains comma/newline/quote
				return str.includes(',') || str.includes('"') || str.includes('\n')
					? `"${str.replace(/"/g, '""')}"`
					: str
			})
			.join(',')
	)
	return [headerRow, ...dataRows].join('\n')
}

/**
 * Export payments as CSV — client-side generation from PostgREST
 */
export async function exportPaymentsCSV(
	filters?: PaymentFilters
): Promise<Blob> {
	const supabase = createClient()
	let query = supabase
		.from('rent_payments')
		.select(
			'id, amount, currency, status, due_date, paid_date, period_start, period_end, payment_method_type, late_fee_amount, notes, created_at'
		)
		.order('due_date', { ascending: false })
		.limit(10000)

	if (filters?.status) {
		query = query.eq('status', filters.status)
	}
	if (filters?.startDate) {
		query = query.gte('due_date', filters.startDate)
	}
	if (filters?.endDate) {
		query = query.lte('due_date', filters.endDate)
	}

	const { data, error } = await query
	if (error) handlePostgrestError(error, 'rent_payments')
	const csv = rowsToCsv((data ?? []) as unknown as Record<string, unknown>[])
	return new Blob([csv], { type: 'text/csv' })
}

/**
 * Record a manual payment — PostgREST insert into rent_payments
 */
export async function recordManualPayment(
	input: ManualPaymentInput
): Promise<{ success: boolean; payment: unknown }> {
	const supabase = createClient()
	const { data, error } = await supabase
		.from('rent_payments')
		.insert({
			tenant_id: input.tenant_id,
			lease_id: input.lease_id,
			amount: input.amount,
			currency: 'USD',
			status: 'succeeded',
			payment_method_type: input.payment_method ?? 'manual',
			period_start: new Date().toISOString().split('T')[0] as string,
			period_end: new Date().toISOString().split('T')[0] as string,
			due_date: input.paid_date,
			paid_date: input.paid_date,
			application_fee_amount: 0,
			notes: input.notes ?? null
		})
		.select('id')
		.single()
	if (error) handlePostgrestError(error, 'rent_payments')
	return { success: true, payment: data }
}

// ============================================================================
// RENT COLLECTION HOOKS
// ============================================================================

/**
 * Get payment analytics
 */
export function usePaymentAnalytics() {
	return useQuery(rentCollectionQueries.analytics())
}

/**
 * Get upcoming payments
 */
export function useUpcomingPayments() {
	return useQuery(rentCollectionQueries.upcoming())
}

/**
 * Get overdue payments
 */
export function useOverduePayments() {
	return useQuery(rentCollectionQueries.overdue())
}

/**
 * Record a manual payment
 */
export function useRecordManualPaymentMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.rentCollection.recordManual,
		mutationFn: (data: ManualPaymentInput) => recordManualPayment(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: rentCollectionKeys.all })
		},
		onError: (error) => {
			handleMutationError(error, 'Record manual payment')
		}
	})
}

/**
 * Export payments as CSV — client-side from PostgREST
 */
export function useExportPaymentsMutation() {
	return useMutation({
		mutationKey: mutationKeys.rentCollection.exportCsv,
		mutationFn: async (filters?: PaymentFilters) => {
			const blob = await exportPaymentsCSV(filters)

			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)

			return blob
		},
		onError: (error) => {
			handleMutationError(error, 'Export payments')
		}
	})
}

// ============================================================================
// RENT PAYMENT HOOKS
// ============================================================================


/**
 * Get current payment status for a tenant — PostgREST
 */
export function usePaymentStatus(tenant_id: string) {
	return useQuery({
		queryKey: rentPaymentKeys.status(tenant_id),
		queryFn: async (): Promise<TenantPaymentStatusResponse> => {
			const supabase = createClient()
			const today = new Date().toISOString().split('T')[0] as string
			const { data, error } = await supabase
				.from('rent_payments')
				.select('id, amount, status, due_date, paid_date, stripe_payment_intent_id')
				.eq('tenant_id', tenant_id)
				.order('due_date', { ascending: false })
				.limit(1)
				.maybeSingle()
			if (error) handlePostgrestError(error, 'rent_payments')
			if (!data) {
				return {
					status: 'pending',
					rent_amount: 0,
					nextDueDate: null,
					lastPaymentDate: null,
					outstandingBalance: 0,
					isOverdue: false
				}
			}
			const isOverdue =
				data.status !== 'succeeded' && data.due_date < today
			return {
				status: data.status as TenantPaymentStatusResponse['status'],
				rent_amount: data.amount,
				nextDueDate: data.due_date,
				lastPaymentDate: data.paid_date,
				outstandingBalance: data.status === 'succeeded' ? 0 : data.amount,
				isOverdue
			}
		},
		enabled: !!tenant_id,
		...QUERY_CACHE_TIMES.STATS
	})
}

/**
 * Get tenant payment history from owner perspective — PostgREST
 */
export function useOwnerTenantPayments(
	tenant_id: string,
	options?: PaymentQueryOptions
) {
	return useQuery(tenantPaymentQueries.ownerPayments(tenant_id, options))
}

/**
 * Get tenant's own payment history — PostgREST
 */
export function useTenantPaymentsHistory(options?: PaymentQueryOptions) {
	return useQuery(tenantPaymentQueries.selfPayments(options))
}

type SendReminderVariables = {
	request: SendPaymentReminderRequest
	ownerQueryKey?: QueryKey
}

/**
 * Send payment reminder to tenant via Resend email Edge Function.
 * Invokes the send-payment-reminder Edge Function which uses the
 * shared _shared/resend.ts helper to deliver the reminder email.
 */
export function useSendTenantPaymentReminderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.rentPayments.sendReminder,
		mutationFn: async (variables: SendReminderVariables): Promise<SendPaymentReminderResponse> => {
			const supabase = createClient()
			const { data, error } = await supabase.functions.invoke(
				'send-payment-reminder',
				{
					body: variables.request
				}
			)
			if (error) throw new Error(error.message ?? 'Failed to send payment reminder')
			return (data as SendPaymentReminderResponse) ?? { success: true }
		},
		onSuccess: (_data, variables) => {
			if (variables?.ownerQueryKey) {
				queryClient.invalidateQueries({
					queryKey: variables.ownerQueryKey
				})
			} else if (variables?.request.tenant_id) {
				queryClient.invalidateQueries({
					queryKey: rentPaymentKeys.ownerView(variables.request.tenant_id)
				})
			}
		},
		onError: (error) => {
			handleMutationError(error, 'Send payment reminder')
		}
	})
}

// ============================================================================
// PAYMENT VERIFICATION HOOKS
// ============================================================================

/**
 * Verify payment session — retrieves Stripe Checkout session status.
 * Used by the /pricing/success page for subscription checkout verification.
 * Returns null subscription when session ID is missing (graceful degradation).
 */
export function usePaymentVerification(
	sessionId: string | null,
	options: { throwOnError?: boolean } = {}
) {
	return useQuery({
		queryKey: paymentVerificationKeys.verifySession(sessionId ?? ''),
		queryFn: async (): Promise<{ subscription: SubscriptionData | null }> => {
			if (!sessionId) return { subscription: null }
			const supabase = createClient()
			const { data, error } = await supabase.functions.invoke(
				'stripe-checkout-status',
				{ body: { session_id: sessionId } }
			)
			if (error) throw new Error(error.message ?? 'Session verification failed')
			return { subscription: (data as { subscription: SubscriptionData | null })?.subscription ?? null }
		},
		enabled: !!sessionId,
		...QUERY_CACHE_TIMES.SECURITY,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		throwOnError: options.throwOnError ?? false
	})
}

/**
 * Get Stripe Checkout session status.
 * Used by the /pricing/complete page for subscription checkout completion.
 * Returns null data when session ID is missing.
 */
export function useSessionStatus(
	sessionId: string | null,
	options: { throwOnError?: boolean } = {}
) {
	return useQuery({
		queryKey: paymentVerificationKeys.sessionStatus(sessionId ?? ''),
		queryFn: async (): Promise<StripeSessionStatusResponse> => {
			if (!sessionId) {
				return { status: 'expired', payment_intent_id: null, payment_status: null, payment_intent_status: null } as StripeSessionStatusResponse
			}
			const supabase = createClient()
			const { data, error } = await supabase.functions.invoke(
				'stripe-checkout-status',
				{ body: { session_id: sessionId } }
			)
			if (error) throw new Error(error.message ?? 'Session status check failed')
			return data as StripeSessionStatusResponse
		},
		enabled: !!sessionId,
		...QUERY_CACHE_TIMES.STATS,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		throwOnError: options.throwOnError ?? false
	})
}

// Legacy key exports for backwards compatibility
export const paymentQueryKeys = paymentVerificationKeys
