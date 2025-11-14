'use client'

import type { SubscriptionData } from '#types/stripe'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { StripeSessionStatusResponse } from '@repo/shared/types/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const logger = createLogger({ component: 'PaymentVerification' })

// Query keys for payment verification
export const paymentQueryKeys = {
	verifySession: (sessionId: string) => ['payment', 'verify', sessionId] as const,
	sessionStatus: (sessionId: string) => ['payment', 'status', sessionId] as const
}

// Hook to verify payment session with TanStack Query
export function usePaymentVerification(sessionId: string | null, options: { throwOnError?: boolean } = {}) {
	return useQuery({
		queryKey: paymentQueryKeys.verifySession(sessionId || ''),
		queryFn: async (): Promise<{ subscription: SubscriptionData }> => {
			if (!sessionId) {
				throw new Error('No session ID provided')
			}

			let data
			try {
				const response = await clientFetch<{
					session: unknown
					subscription: {
						id: string
						status: string
						current_period_start: number | null
						current_period_end: number | null
						cancelAt_period_end: boolean
						items: Array<{
							price: {
								nickname: string | null
								product: {
									name: string
								}
							}
						}>
					} | null
				}>('/stripe/verify-checkout-session', {
					method: 'POST',
					body: JSON.stringify({ sessionId })
				})

				// Map backend response to SubscriptionData
				if (!response.subscription) {
					throw new Error('No subscription found in response')
				}

				const sub = response.subscription
				const planName = sub.items[0]?.price?.nickname || sub.items[0]?.price?.product?.name || 'Unknown Plan'

				data = {
					subscription: {
						status: sub.status as SubscriptionData['status'],
						planName,
						currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : '',
						cancelAtPeriodEnd: sub.cancelAt_period_end
					}
				}
			} catch (error) {
				logger.error('Payment verification failed', {
					action: 'payment_verification_failed',
					metadata: {
						sessionId,
						error: error instanceof Error ? error.message : String(error)
					}
				})
				throw error
			}

			logger.info('Payment verification successful', {
				action: 'payment_verification_success',
				metadata: {
					sessionId,
					planName: data.subscription?.planName
				}
			})

			return data
		},
		enabled: !!sessionId, // Only run query if sessionId exists
		retry: 2,
		...QUERY_CACHE_TIMES.SECURITY,
		refetchOnWindowFocus: false, // Security: Never refetch payment data on focus
		refetchOnReconnect: false, // Security: Don't refetch on network reconnect
		refetchOnMount: false, // Security: Only fetch once per session
		throwOnError: options.throwOnError ?? false
	})
}

// Hook to get session status with TanStack Query
export function useSessionStatus(sessionId: string | null, options: { throwOnError?: boolean } = {}) {
	return useQuery({
		queryKey: paymentQueryKeys.sessionStatus(sessionId || ''),
		queryFn: async (): Promise<StripeSessionStatusResponse> => {
			if (!sessionId) {
				throw new Error('No session ID provided')
			}

			const data = await clientFetch<StripeSessionStatusResponse>(
				`/stripe/session-status?session_id=${sessionId}`
			)

			logger.info('Session status retrieved', {
				action: 'session_status_retrieved',
				metadata: {
					sessionId,
					status: data.status,
					paymentStatus: data.payment_status
				}
			})

			return data
		},
		enabled: !!sessionId, // Only run query if sessionId exists
		retry: 2,
		...QUERY_CACHE_TIMES.STATS,
		refetchOnWindowFocus: false, // Security: Never refetch payment data on focus
		refetchOnReconnect: false, // Security: Don't refetch on network reconnect
		refetchOnMount: false, // Security: Only fetch once per session
		throwOnError: options.throwOnError ?? false
	})
}

/**
 * Hook for prefetching payment verification
 */
export function usePrefetchPaymentVerification() {
	const queryClient = useQueryClient()

	return (sessionId: string) => {
		queryClient.prefetchQuery({
			queryKey: paymentQueryKeys.verifySession(sessionId),
			...QUERY_CACHE_TIMES.SECURITY
		})
	}
}

/**
 * Hook for prefetching session status
 */
export function usePrefetchSessionStatus() {
	const queryClient = useQueryClient()

	return (sessionId: string) => {
		queryClient.prefetchQuery({
			queryKey: paymentQueryKeys.sessionStatus(sessionId),
			queryFn: () =>
				clientFetch<StripeSessionStatusResponse>(
					`/stripe/session-status?session_id=${sessionId}`
				),
			...QUERY_CACHE_TIMES.STATS
		})
	}
}
