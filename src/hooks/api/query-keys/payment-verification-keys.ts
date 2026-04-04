/**
 * Payment Verification Query Keys & Options
 * Extracted from payment-keys.ts for the 300-line file size rule.
 *
 * Contains:
 * - paymentVerificationKeys: cache key factories for Stripe session verification
 * - paymentStatusQueries: queryOptions factories for payment status and session verification
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { rentPaymentKeys } from './payment-keys'
import type {
	TenantPaymentStatusResponse
} from '#types/api-contracts'
import type { StripeSessionStatusResponse } from '#types/core'
import type { SubscriptionData } from '#types/stripe'

// ============================================================================
// QUERY KEYS
// ============================================================================

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
// QUERY OPTIONS
// ============================================================================

/**
 * Payment status and verification query factories
 */
export const paymentStatusQueries = {
	status: (tenant_id: string) =>
		queryOptions({
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
		}),

	verifySession: (sessionId: string | null, options?: { throwOnError?: boolean }) =>
		queryOptions({
			queryKey: paymentVerificationKeys.verifySession(sessionId ?? ''),
			queryFn: async (): Promise<{ subscription: SubscriptionData | null }> => {
				if (!sessionId) return { subscription: null }
				const supabase = createClient()
				const { data, error } = await supabase.functions.invoke(
					'stripe-checkout-session',
					{ body: { session_id: sessionId } }
				)
				if (error) throw new Error(error.message ?? 'Session verification failed')
				return { subscription: (data as { subscription: SubscriptionData | null })?.subscription ?? null }
			},
			enabled: !!sessionId,
			...QUERY_CACHE_TIMES.SECURITY,
			refetchOnReconnect: false,
			refetchOnMount: false,
			throwOnError: options?.throwOnError ?? false
		}),

	sessionStatus: (sessionId: string | null, options?: { throwOnError?: boolean }) =>
		queryOptions({
			queryKey: paymentVerificationKeys.sessionStatus(sessionId ?? ''),
			queryFn: async (): Promise<StripeSessionStatusResponse> => {
				if (!sessionId) {
					return { status: 'expired', payment_intent_id: null, payment_status: null, payment_intent_status: null } as StripeSessionStatusResponse
				}
				const supabase = createClient()
				const { data, error } = await supabase.functions.invoke(
					'stripe-checkout-session',
					{ body: { session_id: sessionId } }
				)
				if (error) throw new Error(error.message ?? 'Session status check failed')
				return data as StripeSessionStatusResponse
			},
			enabled: !!sessionId,
			...QUERY_CACHE_TIMES.STATS,
			refetchOnReconnect: false,
			refetchOnMount: false,
			throwOnError: options?.throwOnError ?? false
		})
}
