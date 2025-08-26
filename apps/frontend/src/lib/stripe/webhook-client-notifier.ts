/**
 * Client-Side Stripe Webhook Notifier - React Hooks Enabled
 *
 * Handles client-side webhook notifications using React hooks and Zustand.
 * Receives notifications from server-side webhook processor via SSE.
 */
'use client'

import { useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useNotificationSystem } from '@/hooks/use-app-store'
import { logger } from '@/lib/logger/logger'
import type { WebhookNotification } from './webhook-server-processor'

export interface WebhookClientOptions {
	autoConnect?: boolean
	reconnectDelay?: number
	maxReconnectAttempts?: number
	userId?: string
}

/**
 * Hook for managing real-time webhook notifications via SSE
 */
export function useStripeWebhookNotifications(
	options: WebhookClientOptions = {}
) {
	const {
		autoConnect = true,
		reconnectDelay = 5000,
		maxReconnectAttempts = 3,
		userId
	} = options

	const { notify } = useNotificationSystem()
	const eventSourceRef = useRef<EventSource | null>(null)
	const reconnectAttemptsRef = useRef(0)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// Enhanced notification handler with toast integration
	const handleWebhookNotification = useCallback(
		(notification: WebhookNotification) => {
			// Add to Zustand store using notify method
			notify(
				notification.type === 'error'
					? 'error'
					: notification.type === 'warning'
						? 'warning'
						: notification.type === 'success'
							? 'success'
							: 'info',
				notification.title,
				notification.message,
				{
					autoHide: notification.type !== 'error',
					duration:
						notification.type === 'error'
							? 8000
							: notification.type === 'success'
								? 4000
								: 5000
				}
			)

			// Show toast notification
			const toastFn = {
				success: toast.success,
				error: toast.error,
				warning: toast.warning,
				info: toast.info
			}[notification.type]

			toastFn(notification.title, {
				description: notification.message,
				duration: notification.type === 'error' ? 8000 : 4000
			})

			logger.info('Webhook notification processed', {
				notificationId: notification.id,
				type: notification.type,
				title: notification.title
			})
		},
		[notify]
	)

	// Connect to SSE endpoint
	const connect = useCallback(() => {
		if (eventSourceRef.current) {
			return // Already connected
		}

		try {
			const url = userId
				? `/api/webhooks/stripe/notifications?userId=${userId}`
				: '/api/webhooks/stripe/notifications'

			const eventSource = new EventSource(url)
			eventSourceRef.current = eventSource

			eventSource.onopen = () => {
				logger.info('Webhook notification connection established')
				reconnectAttemptsRef.current = 0 // Reset reconnect attempts
			}

			eventSource.onmessage = event => {
				try {
					const notification: WebhookNotification = JSON.parse(
						event.data
					)
					handleWebhookNotification(notification)
				} catch (error) {
					logger.error(
						'Failed to parse webhook notification',
						error instanceof Error
							? error
							: new Error(String(error))
					)
				}
			}

			eventSource.onerror = error => {
				logger.error(
					'Webhook notification connection error',
					error instanceof Error ? error : new Error('SSE error')
				)

				// Close current connection
				eventSource.close()
				eventSourceRef.current = null

				// Attempt reconnection with exponential backoff
				if (reconnectAttemptsRef.current < maxReconnectAttempts) {
					const delay =
						reconnectDelay *
						Math.pow(2, reconnectAttemptsRef.current)
					reconnectAttemptsRef.current++

					logger.info(
						`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
					)

					reconnectTimeoutRef.current = setTimeout(() => {
						connect()
					}, delay)
				} else {
					logger.warn(
						'Max reconnection attempts reached for webhook notifications'
					)
				}
			}
		} catch (error) {
			logger.error(
				'Failed to establish webhook notification connection',
				error instanceof Error ? error : new Error(String(error))
			)
		}
	}, [
		userId,
		handleWebhookNotification,
		reconnectDelay,
		maxReconnectAttempts
	])

	// Disconnect from SSE
	const disconnect = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close()
			eventSourceRef.current = null
		}

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		reconnectAttemptsRef.current = 0
	}, [])

	// Auto-connect on mount if enabled
	useEffect(() => {
		if (autoConnect && typeof window !== 'undefined') {
			connect()
		}

		return () => {
			disconnect()
		}
	}, [autoConnect, connect, disconnect])

	const isConnected = eventSourceRef.current?.readyState === EventSource.OPEN
	const isConnecting =
		eventSourceRef.current?.readyState === EventSource.CONNECTING

	return {
		isConnected,
		isConnecting,
		connect,
		disconnect,
		reconnectAttempts: reconnectAttemptsRef.current
	}
}

/**
 * Lightweight hook for webhook notifications without SSE management
 */
export function useWebhookNotificationHandler() {
	const { notifySuccess, notifyError, notifyInfo, notifyWarning } =
		useNotificationSystem()

	const handleNotification = useCallback(
		(notification: WebhookNotification) => {
			const notifyFn = {
				success: notifySuccess,
				error: notifyError,
				info: notifyInfo,
				warning: notifyWarning
			}[notification.type]

			notifyFn(notification.title, notification.message)
		},
		[notifySuccess, notifyError, notifyInfo, notifyWarning]
	)

	return {
		handleNotification
	}
}

/**
 * Hook specifically for Stripe payment-related notifications
 */
export function useStripePaymentNotifications() {
	const { handleNotification } = useWebhookNotificationHandler()

	// Enhanced handlers for specific Stripe events
	const handlePaymentSuccess = useCallback(
		(amount: number, paymentMethod?: string) => {
			handleNotification({
				id: `payment-success-${Date.now()}`,
				type: 'success',
				title: 'Payment Successful',
				message: `Your payment of $${(amount / 100).toFixed(2)} has been processed${paymentMethod ? ` using ${paymentMethod}` : ''}.`,
				timestamp: new Date()
			})
		},
		[handleNotification]
	)

	const handlePaymentFailed = useCallback(
		(reason?: string) => {
			handleNotification({
				id: `payment-failed-${Date.now()}`,
				type: 'error',
				title: 'Payment Failed',
				message:
					reason ||
					'We were unable to process your payment. Please check your payment method and try again.',
				timestamp: new Date()
			})
		},
		[handleNotification]
	)

	const handleSubscriptionChange = useCallback(
		(planName: string, action: 'created' | 'updated' | 'cancelled') => {
			const messages = {
				created: `Welcome! Your ${planName} subscription has been activated.`,
				updated: `Your subscription has been updated to ${planName}.`,
				cancelled: `Your ${planName} subscription has been cancelled.`
			}

			const types = {
				created: 'success' as const,
				updated: 'success' as const,
				cancelled: 'info' as const
			}

			handleNotification({
				id: `subscription-${action}-${Date.now()}`,
				type: types[action],
				title: 'Subscription Updated',
				message: messages[action],
				timestamp: new Date()
			})
		},
		[handleNotification]
	)

	const handlePaymentMethodChange = useCallback(
		(paymentMethod: string, action: 'added' | 'removed') => {
			const messages = {
				added: `${paymentMethod} has been added to your account.`,
				removed: `${paymentMethod} has been removed from your account.`
			}

			handleNotification({
				id: `payment-method-${action}-${Date.now()}`,
				type: action === 'added' ? 'success' : 'info',
				title: `Payment Method ${action === 'added' ? 'Added' : 'Removed'}`,
				message: messages[action],
				timestamp: new Date()
			})
		},
		[handleNotification]
	)

	return {
		handlePaymentSuccess,
		handlePaymentFailed,
		handleSubscriptionChange,
		handlePaymentMethodChange,
		handleNotification
	}
}
