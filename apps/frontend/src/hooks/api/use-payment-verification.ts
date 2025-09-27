'use client'

import { apiClient, API_BASE_URL } from '@/lib/api-client'
import type { SubscriptionData } from '@/types/stripe'
import { createLogger, type StripeSessionStatusResponse } from '@repo/shared'
import { useQuery } from '@tanstack/react-query'

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

			const response = await fetch(`${API_BASE_URL}/stripe/verify-session`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.getItem('auth-token') || ''}`
				},
				body: JSON.stringify({ sessionId })
			})

			if (!response.ok) {
				const errorText = await response.text()
				logger.error('Payment verification failed', {
					action: 'payment_verification_failed',
					metadata: {
						sessionId,
						status: response.status,
						error: errorText
					}
				})
				throw new Error(`Failed to verify payment: ${response.statusText}`)
			}

			const data = await response.json()

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
		staleTime: 2 * 60 * 1000, // Reduced to 2 minutes for security
		gcTime: 5 * 60 * 1000, // Reduced to 5 minutes for security
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

			const data = await apiClient<StripeSessionStatusResponse>(
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
		staleTime: 1 * 60 * 1000, // Reduced to 1 minute for security
		gcTime: 3 * 60 * 1000, // Reduced to 3 minutes for security
		refetchOnWindowFocus: false, // Security: Never refetch payment data on focus
		refetchOnReconnect: false, // Security: Don't refetch on network reconnect
		refetchOnMount: false, // Security: Only fetch once per session
		throwOnError: options.throwOnError ?? false
	})
}