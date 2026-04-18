// Verifies Stripe Checkout sessions after landlord SaaS subscription purchase.

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { StripeSessionStatusResponse } from '#types/core'
import type { SubscriptionData } from '#types/stripe'

export const subscriptionVerificationKeys = {
	verifySession: (sessionId: string) =>
		['subscription', 'verify', sessionId] as const,
	sessionStatus: (sessionId: string) =>
		['subscription', 'status', sessionId] as const
}

export const subscriptionStatusQueries = {
	verifySession: (sessionId: string | null, options?: { throwOnError?: boolean }) =>
		queryOptions({
			queryKey: subscriptionVerificationKeys.verifySession(sessionId ?? ''),
			queryFn: async (): Promise<{ subscription: SubscriptionData | null }> => {
				if (!sessionId) return { subscription: null }
				const supabase = createClient()
				const { data, error } = await supabase.functions.invoke(
					'stripe-checkout-session',
					{ body: { session_id: sessionId } }
				)
				if (error) throw new Error(error.message ?? 'Session verification failed')
				return {
					subscription:
						(data as { subscription: SubscriptionData | null })?.subscription ?? null
				}
			},
			enabled: !!sessionId,
			...QUERY_CACHE_TIMES.SECURITY,
			refetchOnReconnect: false,
			refetchOnMount: false,
			throwOnError: options?.throwOnError ?? false
		}),

	sessionStatus: (sessionId: string | null, options?: { throwOnError?: boolean }) =>
		queryOptions({
			queryKey: subscriptionVerificationKeys.sessionStatus(sessionId ?? ''),
			queryFn: async (): Promise<StripeSessionStatusResponse> => {
				if (!sessionId) {
					return {
						status: 'expired',
						payment_intent_id: null,
						payment_status: null,
						payment_intent_status: null
					} as StripeSessionStatusResponse
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
