/**
 * Server-Side Stripe Webhook Processor - No React Dependencies
 *
 * Handles Stripe webhook events on the server without React hooks.
 * Processes events and emits notifications via SSE for client consumption.
 */
import type Stripe from 'stripe'
import { logger } from '../logger/logger'

export type StripeWebhookEvent =
	| 'customer.subscription.created'
	| 'customer.subscription.updated'
	| 'customer.subscription.deleted'
	| 'invoice.payment_succeeded'
	| 'invoice.payment_failed'
	| 'customer.updated'
	| 'payment_method.attached'
	| 'payment_method.detached'

export interface WebhookNotification {
	id: string
	type: 'success' | 'error' | 'info' | 'warning'
	title: string
	message: string
	timestamp: Date
	metadata?: Record<string, unknown>
}

export interface WebhookProcessor {
	event: StripeWebhookEvent
	processor: (event: Stripe.Event) => Promise<WebhookNotification[]>
}

/**
 * Server-side webhook event processors (no React hooks)
 */
export const webhookProcessors: WebhookProcessor[] = [
	{
		event: 'customer.subscription.created',
		processor: async (
			event: Stripe.Event
		): Promise<WebhookNotification[]> => {
			const subscription = event.data.object as Stripe.Subscription
			logger.info('Subscription created', {
				subscriptionId: subscription.id
			})

			return [
				{
					id: `webhook-${event.id}`,
					type: 'success',
					title: 'Welcome to TenantFlow!',
					message:
						'Your subscription has been activated successfully.',
					timestamp: new Date(),
					metadata: {
						subscriptionId: subscription.id,
						customerId: subscription.customer as string
					}
				}
			]
		}
	},

	{
		event: 'customer.subscription.updated',
		processor: async (
			event: Stripe.Event
		): Promise<WebhookNotification[]> => {
			const subscription = event.data.object as Stripe.Subscription
			const previousAttributes = event.data
				.previous_attributes as Partial<Stripe.Subscription>
			const notifications: WebhookNotification[] = []

			logger.info('Subscription updated', {
				subscriptionId: subscription.id,
				status: subscription.status,
				previousStatus: previousAttributes?.status
			})

			// Status changes
			if (
				previousAttributes?.status &&
				previousAttributes.status !== subscription.status
			) {
				if (subscription.status === 'active') {
					notifications.push({
						id: `webhook-${event.id}-status`,
						type: 'success',
						title: 'Subscription Reactivated',
						message: 'Your subscription is now active.',
						timestamp: new Date(),
						metadata: { subscriptionId: subscription.id }
					})
				} else if (subscription.status === 'canceled') {
					notifications.push({
						id: `webhook-${event.id}-status`,
						type: 'info',
						title: 'Subscription Canceled',
						message: 'Your subscription has been canceled.',
						timestamp: new Date(),
						metadata: { subscriptionId: subscription.id }
					})
				} else if (subscription.status === 'past_due') {
					notifications.push({
						id: `webhook-${event.id}-status`,
						type: 'error',
						title: 'Payment Issue',
						message:
							'We had trouble processing your payment. Please update your payment method.',
						timestamp: new Date(),
						metadata: { subscriptionId: subscription.id }
					})
				}
			}

			// Plan changes
			if (
				previousAttributes?.items &&
				subscription.items.data.length > 0
			) {
				const newPrice = subscription.items.data[0]?.price
				if (newPrice) {
					notifications.push({
						id: `webhook-${event.id}-plan`,
						type: 'success',
						title: 'Plan Updated',
						message: `Your subscription has been updated to ${newPrice.nickname || 'the new plan'}.`,
						timestamp: new Date(),
						metadata: {
							subscriptionId: subscription.id,
							newPriceId: newPrice.id
						}
					})
				}
			}

			return notifications
		}
	},

	{
		event: 'customer.subscription.deleted',
		processor: async (
			event: Stripe.Event
		): Promise<WebhookNotification[]> => {
			const subscription = event.data.object as Stripe.Subscription
			logger.info('Subscription deleted', {
				subscriptionId: subscription.id
			})

			return [
				{
					id: `webhook-${event.id}`,
					type: 'info',
					title: 'Subscription Ended',
					message:
						'Your subscription has ended. You can reactivate it anytime from your billing settings.',
					timestamp: new Date(),
					metadata: { subscriptionId: subscription.id }
				}
			]
		}
	},

	{
		event: 'invoice.payment_succeeded',
		processor: async (
			event: Stripe.Event
		): Promise<WebhookNotification[]> => {
			const invoice = event.data.object as Stripe.Invoice
			logger.info('Invoice payment succeeded', { invoiceId: invoice.id })

			if (invoice.billing_reason === 'subscription_cycle') {
				return [
					{
						id: `webhook-${event.id}`,
						type: 'success',
						title: 'Payment Successful',
						message: `Your payment of ${formatCurrency(invoice.amount_paid)} has been processed successfully.`,
						timestamp: new Date(),
						metadata: {
							invoiceId: invoice.id,
							amount: invoice.amount_paid
						}
					}
				]
			}

			return []
		}
	},

	{
		event: 'invoice.payment_failed',
		processor: async (
			event: Stripe.Event
		): Promise<WebhookNotification[]> => {
			const invoice = event.data.object as Stripe.Invoice
			logger.warn('Invoice payment failed', { invoiceId: invoice.id })

			return [
				{
					id: `webhook-${event.id}`,
					type: 'error',
					title: 'Payment Failed',
					message:
						'We were unable to process your payment. Please update your payment method to avoid service interruption.',
					timestamp: new Date(),
					metadata: {
						invoiceId: invoice.id,
						customerId: invoice.customer as string
					}
				}
			]
		}
	},

	{
		event: 'customer.updated',
		processor: async (
			event: Stripe.Event
		): Promise<WebhookNotification[]> => {
			const customer = event.data.object as Stripe.Customer
			const previousAttributes = event.data
				.previous_attributes as Partial<Stripe.Customer>
			logger.info('Customer updated', { customerId: customer.id })

			// Only notify for significant changes like email updates
			if (
				previousAttributes?.email &&
				customer.email !== previousAttributes.email
			) {
				return [
					{
						id: `webhook-${event.id}`,
						type: 'info',
						title: 'Account Updated',
						message: 'Your billing email has been updated.',
						timestamp: new Date(),
						metadata: { customerId: customer.id }
					}
				]
			}

			return []
		}
	},

	{
		event: 'payment_method.attached',
		processor: async (
			event: Stripe.Event
		): Promise<WebhookNotification[]> => {
			const paymentMethod = event.data.object as Stripe.PaymentMethod
			logger.info('Payment method attached', {
				paymentMethodId: paymentMethod.id
			})

			if (paymentMethod.type === 'card' && paymentMethod.card) {
				return [
					{
						id: `webhook-${event.id}`,
						type: 'success',
						title: 'Payment Method Added',
						message: `Your ${paymentMethod.card.brand} •••• ${paymentMethod.card.last4} has been added successfully.`,
						timestamp: new Date(),
						metadata: {
							paymentMethodId: paymentMethod.id,
							brand: paymentMethod.card.brand,
							last4: paymentMethod.card.last4
						}
					}
				]
			} else {
				return [
					{
						id: `webhook-${event.id}`,
						type: 'success',
						title: 'Payment Method Added',
						message:
							'Your new payment method has been added successfully.',
						timestamp: new Date(),
						metadata: { paymentMethodId: paymentMethod.id }
					}
				]
			}
		}
	},

	{
		event: 'payment_method.detached',
		processor: async (
			event: Stripe.Event
		): Promise<WebhookNotification[]> => {
			const paymentMethod = event.data.object as Stripe.PaymentMethod
			logger.info('Payment method detached', {
				paymentMethodId: paymentMethod.id
			})

			if (paymentMethod.type === 'card' && paymentMethod.card) {
				return [
					{
						id: `webhook-${event.id}`,
						type: 'info',
						title: 'Payment Method Removed',
						message: `Your ${paymentMethod.card.brand} •••• ${paymentMethod.card.last4} has been removed.`,
						timestamp: new Date(),
						metadata: {
							paymentMethodId: paymentMethod.id,
							brand: paymentMethod.card.brand,
							last4: paymentMethod.card.last4
						}
					}
				]
			} else {
				return [
					{
						id: `webhook-${event.id}`,
						type: 'info',
						title: 'Payment Method Removed',
						message:
							'A payment method has been removed from your account.',
						timestamp: new Date(),
						metadata: { paymentMethodId: paymentMethod.id }
					}
				]
			}
		}
	}
]

/**
 * Process incoming Stripe webhook event (server-side only)
 */
export async function processStripeWebhook(
	event: Stripe.Event,
	emitNotifications?: (notifications: WebhookNotification[]) => Promise<void>
): Promise<WebhookNotification[]> {
	try {
		const processor = webhookProcessors.find(
			p => p.event === (event.type as StripeWebhookEvent)
		)

		if (processor) {
			logger.info('Processing Stripe webhook', {
				eventType: event.type,
				eventId: event.id
			})

			const notifications = await processor.processor(event)

			// Emit notifications via SSE or other transport if provided
			if (emitNotifications && notifications.length > 0) {
				await emitNotifications(notifications)
			}

			return notifications
		} else {
			logger.debug('Unhandled Stripe webhook event', {
				eventType: event.type,
				eventId: event.id
			})
			return []
		}
	} catch (error) {
		logger.error(
			'Error processing Stripe webhook',
			error instanceof Error ? error : new Error(String(error)),
			{
				eventType: event.type,
				eventId: event.id
			}
		)
		return []
	}
}

/**
 * Format currency amounts from Stripe (cents) to display format
 */
function formatCurrency(amountInCents: number | null): string {
	if (!amountInCents) return '$0.00'
	return `$${(amountInCents / 100).toFixed(2)}`
}

/**
 * Validate webhook event structure
 */
export function validateWebhookEvent(event: unknown): event is Stripe.Event {
	if (!event || typeof event !== 'object') return false

	const eventObj = event as Record<string, unknown>

	return !!(
		'id' in eventObj &&
		'type' in eventObj &&
		'data' in eventObj &&
		typeof eventObj.id === 'string' &&
		typeof eventObj.type === 'string' &&
		eventObj.data &&
		typeof eventObj.data === 'object'
	)
}
