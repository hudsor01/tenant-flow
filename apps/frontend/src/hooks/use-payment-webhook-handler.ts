import { createClient } from '#lib/supabase/client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'

/**
 * React Query cache invalidation for payment-related webhooks
 * Provides real-time UI updates when payment events occur
 */
export const usePaymentWebhookHandler = () => {
	const queryClient = useQueryClient()

	const invalidatePaymentData = useCallback(() => {
		// Invalidate all payment-related queries for real-time updates
		queryClient.invalidateQueries({ queryKey: ['subscription'] })
		queryClient.invalidateQueries({ queryKey: ['paymentMethods'] })
		queryClient.invalidateQueries({ queryKey: ['invoices'] })
		queryClient.invalidateQueries({ queryKey: ['user', 'billing'] })
		queryClient.invalidateQueries({ queryKey: ['user', 'subscription'] })
		queryClient.invalidateQueries({ queryKey: ['payments'] })
		queryClient.invalidateQueries({ queryKey: ['billing', 'history'] })
	}, [queryClient])

	const handlePaymentSuccess = useCallback(() => {
		invalidatePaymentData()
		toast.success('Payment processed successfully!')
	}, [invalidatePaymentData])

	const handlePaymentFailure = useCallback(() => {
		invalidatePaymentData()
		toast.error('Payment failed. Please check your payment method.')
	}, [invalidatePaymentData])

	const handleSubscriptionUpdate = useCallback(() => {
		invalidatePaymentData()
		toast.info('Subscription updated')
	}, [invalidatePaymentData])

	const handlePaymentMethodSaved = useCallback(() => {
		invalidatePaymentData()
		toast.success('Payment method saved successfully!')
	}, [invalidatePaymentData])

	return {
		invalidatePaymentData,
		handlePaymentSuccess,
		handlePaymentFailure,
		handleSubscriptionUpdate,
		handlePaymentMethodSaved
	}
}

/**
 * Real-time payment status updates via Supabase realtime subscriptions
 * Automatically invalidates React Query cache when payment events occur
 */
export const usePaymentStatusSubscription = (userId: string | undefined) => {
	const { invalidatePaymentData, handleSubscriptionUpdate } =
		usePaymentWebhookHandler()
	const logger = createLogger({ component: 'usePaymentStatusSubscription' })

	useEffect(() => {
		if (!userId) return

		const supabase = createClient()

		// Subscribe to subscription changes
		const subscriptionChannel = supabase
			.channel('subscription-updates')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'Subscription',
					filter: `userId=eq.${userId}`
				},
				payload => {
					logger.info('Subscription update received', {
						action: 'subscription_realtime_update',
						metadata: { payload }
					})
					handleSubscriptionUpdate()
				}
			)
			.subscribe()

		// Subscribe to payment method changes
		const paymentMethodChannel = supabase
			.channel('payment-method-updates')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'PaymentMethod',
					filter: `userId=eq.${userId}`
				},
				payload => {
					logger.info('Payment method update received', {
						action: 'payment_method_realtime_update',
						metadata: { payload }
					})
					invalidatePaymentData()
				}
			)
			.subscribe()

		// Subscribe to user billing status changes
		const userChannel = supabase
			.channel('user-billing-updates')
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'User',
					filter: `id=eq.${userId}`
				},
				payload => {
					logger.info('User billing update received', {
						action: 'user_billing_realtime_update',
						metadata: { payload }
					})
					// Check if subscription-related fields changed
					const newRecord = payload.new as Record<string, unknown>
					const oldRecord = payload.old as Record<string, unknown>

					if (
						newRecord.subscriptionStatus !== oldRecord.subscriptionStatus ||
						newRecord.autoBillingEnabled !== oldRecord.autoBillingEnabled
					) {
						invalidatePaymentData()

						// Show appropriate toast based on status change
						if (
							newRecord.subscriptionStatus === 'ACTIVE' &&
							oldRecord.subscriptionStatus !== 'ACTIVE'
						) {
							toast.success('Subscription activated!')
						} else if (newRecord.subscriptionStatus === 'CANCELLED') {
							toast.info('Subscription cancelled')
						} else if (newRecord.subscriptionStatus === 'SUSPENDED') {
							toast.error(
								'Subscription suspended - please update payment method'
							)
						}
					}
				}
			)
			.subscribe()

		return () => {
			subscriptionChannel.unsubscribe()
			paymentMethodChannel.unsubscribe()
			userChannel.unsubscribe()
		}
	}, [userId, invalidatePaymentData, handleSubscriptionUpdate, logger])
}

/**
 * Manual payment retry hook for failed payment intents
 */
export const usePaymentRetry = () => {
	const { handlePaymentSuccess, handlePaymentFailure } =
		usePaymentWebhookHandler()

	const retryPayment = useCallback(
		async (paymentIntentId: string) => {
			try {
				const response = await fetch('/api/payment/retry', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ paymentIntentId })
				})

				if (response.ok) {
					handlePaymentSuccess()
					return { success: true }
				} else {
					const errorData = await response.json()
					handlePaymentFailure()
					return { success: false, error: errorData.error }
				}
			} catch {
				handlePaymentFailure()
				return { success: false, error: 'Network error occurred' }
			}
		},
		[handlePaymentSuccess, handlePaymentFailure]
	)

	return { retryPayment }
}

/**
 * Webhook event handler for direct webhook processing
 * Used when payment events need immediate UI feedback
 */
export const useWebhookEventHandler = () => {
	const webhookHandlers = usePaymentWebhookHandler()
	const logger = createLogger({ component: 'useWebhookEventHandler' })

	const handleWebhookEvent = useCallback(
		(eventType: string, eventData: unknown) => {
			logger.info('Processing webhook event', {
				action: 'webhook_event_processing',
				metadata: { eventType, eventData }
			})

			switch (eventType) {
				case 'payment_intent.succeeded':
					webhookHandlers.handlePaymentSuccess()
					break
				case 'payment_intent.payment_failed':
					webhookHandlers.handlePaymentFailure()
					break
				case 'setup_intent.succeeded':
					webhookHandlers.handlePaymentMethodSaved()
					break
				case 'customer.subscription.created':
				case 'customer.subscription.updated':
				case 'customer.subscription.deleted':
					webhookHandlers.handleSubscriptionUpdate()
					break
				case 'invoice.payment_succeeded':
					webhookHandlers.handlePaymentSuccess()
					break
				case 'invoice.payment_failed':
					webhookHandlers.handlePaymentFailure()
					break
				default:
					// Generic update for unknown events
					webhookHandlers.invalidatePaymentData()
			}
		},
		[webhookHandlers, logger]
	)

	return { handleWebhookEvent }
}
