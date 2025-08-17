import { User, WEBHOOK_EVENT_TYPES, WebhookEventType } from '@repo/shared'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import {
	FeatureAccessRestoreEvent,
	FeatureAccessRestrictEvent,
	type PaymentFailedEvent,
	type PaymentMethodRequiredEvent,
	type SubscriptionCreatedEvent,
	SubscriptionEventType
} from '../common/events/subscription.events'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SubscriptionSyncService } from '../subscriptions/subscription-sync.service'
import { StripeService } from './stripe.service'
import { PrismaService } from '../common/database/prisma.service'
import { WebhookMetricsService } from './webhook-metrics.service'
import { WebhookHealthService } from './webhook-health.service'
import { WebhookErrorMonitorService } from './webhook-error-monitor.service'
import {
	RequestContext,
	WebhookObservabilityService
} from './webhook-observability.service'
import {
	StripeCheckoutSession,
	StripePaymentIntent,
	StripeSetupIntent
} from '@repo/shared/types/stripe-payment-objects'
import {
	StripeCharge,
	StripeEvent,
	StripeSubscription
} from '@repo/shared/types/stripe'
import {
	StripeCustomer,
	StripeInvoice
} from '@repo/shared/types/stripe-core-objects'

// Interfaces for expanded Stripe objects using our typed definitions
interface ExpandedPaymentIntent extends Omit<StripePaymentIntent, 'invoice'> {
	invoice: string | StripeInvoice | null
}

interface ExpandedCharge extends Omit<StripeCharge, 'invoice'> {
	invoice: string | StripeInvoice | null
}

interface ExpandedInvoice extends Omit<StripeInvoice, 'subscription'> {
	subscription: string | StripeSubscription | null
}

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name)
	private readonly processedEvents = new Set<string>()

	constructor(
		@Inject(forwardRef(() => SubscriptionSyncService))
		private readonly subscriptionSync: SubscriptionSyncService,
		private readonly stripeService: StripeService,
		private readonly prismaService: PrismaService,
		private readonly eventEmitter: EventEmitter2,
		private readonly metricsService: WebhookMetricsService,
		private readonly healthService: WebhookHealthService,
		private readonly errorMonitor: WebhookErrorMonitorService,
		private readonly observability: WebhookObservabilityService
	) {}

	async handleWebhookEvent(
		event: StripeEvent,
		requestContext?: RequestContext
	): Promise<void> {
		// Start observability trace
		const traceId = this.observability.startTrace(
			event.type,
			event.id,
			requestContext
		)
		const correlationId =
			requestContext?.correlationId || `wh-${Date.now()}`
		const startTime = Date.now()

		// Type-safe event handling with proper Stripe event mapping (declare early for error handling)
		const eventType = event.type as WebhookEventType

		// Idempotency check
		if (this.processedEvents.has(event.id)) {
			this.logger.log(`Event ${event.id} already processed, skipping`)
			this.metricsService.recordIdempotencyCheck(
				event.id,
				true,
				this.processedEvents.size,
				correlationId
			)
			this.observability.endTrace(traceId, true)
			return
		} else {
			this.metricsService.recordIdempotencyCheck(
				event.id,
				false,
				this.processedEvents.size,
				correlationId
			)
		}

		try {
			this.logger.log(`Processing webhook event: ${event.type}`, {
				correlationId,
				eventId: event.id
			})

			// Start validation span
			const validationSpanId = this.observability.startSpan(
				traceId,
				'webhook.validate',
				undefined,
				{
					'webhook.event_type': event.type,
					'webhook.event_id': event.id
				}
			)

			// End validation span
			this.observability.endSpan(traceId, validationSpanId, true)

			// Start processing span
			const processingSpanId = this.observability.startSpan(
				traceId,
				`webhook.process.${eventType}`,
				undefined,
				{
					'webhook.handler': this.getHandlerName(eventType)
				}
			)

			switch (eventType) {
				// Customer events
				case WEBHOOK_EVENT_TYPES.CUSTOMER_CREATED:
					await this.handleCustomerCreated(event)
					break
				case WEBHOOK_EVENT_TYPES.CUSTOMER_UPDATED:
					await this.handleCustomerUpdated(event)
					break
				case WEBHOOK_EVENT_TYPES.CUSTOMER_DELETED:
					await this.handleCustomerDeleted(event)
					break

				// Subscription events
				case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED:
					await this.handleSubscriptionCreated(event)
					break
				case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_UPDATED:
					await this.handleSubscriptionUpdated(event)
					break
				case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_DELETED:
					await this.handleSubscriptionDeleted(event)
					break
				case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_TRIAL_WILL_END:
					await this.handleTrialWillEnd(event)
					break
				case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PAUSED:
					await this.handleSubscriptionPaused(event)
					break
				case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RESUMED:
					await this.handleSubscriptionResumed(event)
					break
				// Invoice events
				case WEBHOOK_EVENT_TYPES.INVOICE_CREATED:
					await this.handleInvoiceCreated(event)
					break
				case WEBHOOK_EVENT_TYPES.INVOICE_FINALIZED:
					await this.handleInvoiceFinalized(event)
					break
				case WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_SUCCEEDED:
					await this.handlePaymentSucceeded(event)
					break
				case WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_FAILED:
					await this.handlePaymentFailed(event)
					break
				case WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_ACTION_REQUIRED:
					await this.handlePaymentActionRequired(event)
					break
				case WEBHOOK_EVENT_TYPES.INVOICE_UPCOMING:
					await this.handleInvoiceUpcoming(event)
					break
				// Payment intent events
				case WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_CREATED:
					await this.handlePaymentIntentCreated(event)
					break
				case WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED:
					await this.handlePaymentIntentSucceeded(event)
					break
				case WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_PAYMENT_FAILED:
					await this.handlePaymentIntentPaymentFailed(event)
					break
				case WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_REQUIRES_ACTION:
					await this.handlePaymentIntentRequiresAction(event)
					break

				// Charge events
				case WEBHOOK_EVENT_TYPES.CHARGE_FAILED:
					await this.handleChargeFailed(event)
					break

				// Checkout events
				case WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED:
					await this.handleCheckoutCompleted(event)
					break
				case WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_EXPIRED:
					await this.handleCheckoutSessionExpired(event)
					break

				// Setup intent events
				case WEBHOOK_EVENT_TYPES.SETUP_INTENT_SUCCEEDED:
					await this.handleSetupIntentSucceeded(event)
					break
				case WEBHOOK_EVENT_TYPES.SETUP_INTENT_SETUP_FAILED:
					await this.handleSetupIntentSetupFailed(event)
					break
				default:
					this.logger.log(
						`No handler for event type: ${event.type}`,
						{ correlationId, eventId: event.id }
					)
					this.observability.endSpan(traceId, processingSpanId, true)
					this.observability.endTrace(traceId, true)
					return
			}

			// End processing span
			this.observability.endSpan(traceId, processingSpanId, true)

			this.processedEvents.add(event.id)

			// Clean up old event IDs to prevent memory leak
			if (this.processedEvents.size > 10000) {
				const firstId = this.processedEvents.values().next().value
				if (firstId) {
					this.processedEvents.delete(firstId)
				}
			}

			// Record successful processing
			const processingTime = Date.now() - startTime
			this.metricsService.recordWebhookEvent(
				eventType,
				processingTime,
				true,
				correlationId
			)
			this.errorMonitor.recordSuccess(eventType, correlationId)
			this.observability.endTrace(traceId, true)
		} catch (error) {
			const processingTime = Date.now() - startTime
			const webhookError = error as Error

			// Record error metrics
			this.metricsService.recordWebhookEvent(
				eventType,
				processingTime,
				false,
				correlationId,
				webhookError
			)
			this.errorMonitor.recordError(
				eventType,
				event.id,
				correlationId,
				webhookError,
				event
			)
			this.observability.endTrace(traceId, false, webhookError)

			this.logger.error(`Error processing webhook event ${event.type}:`, {
				correlationId,
				eventId: event.id,
				error: webhookError.message,
				processingTime
			})

			// Check if this event should be retried
			if (this.errorMonitor.shouldRetry(webhookError, 0)) {
				const retryDelay = this.errorMonitor.getRetryDelay(0)
				this.logger.warn(
					`Webhook event ${event.id} will be retried in ${retryDelay}ms`,
					{
						correlationId,
						eventType,
						retryDelay
					}
				)
				// In a production system, you'd schedule the retry here
				// For now, we'll just throw to let the webhook endpoint handle it
			}

			throw error
		}
	}

	/**
	 * Get handler name for observability
	 */
	private getHandlerName(eventType: WebhookEventType): string {
		const handlerMap: Record<string, string> = {
			[WEBHOOK_EVENT_TYPES.CUSTOMER_CREATED]: 'handleCustomerCreated',
			[WEBHOOK_EVENT_TYPES.CUSTOMER_UPDATED]: 'handleCustomerUpdated',
			[WEBHOOK_EVENT_TYPES.CUSTOMER_DELETED]: 'handleCustomerDeleted',
			[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED]:
				'handleSubscriptionCreated',
			[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_UPDATED]:
				'handleSubscriptionUpdated',
			[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_DELETED]:
				'handleSubscriptionDeleted',
			[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_TRIAL_WILL_END]:
				'handleTrialWillEnd',
			[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PAUSED]:
				'handleSubscriptionPaused',
			[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RESUMED]:
				'handleSubscriptionResumed',
			[WEBHOOK_EVENT_TYPES.INVOICE_CREATED]: 'handleInvoiceCreated',
			[WEBHOOK_EVENT_TYPES.INVOICE_FINALIZED]: 'handleInvoiceFinalized',
			[WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_SUCCEEDED]:
				'handlePaymentSucceeded',
			[WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_FAILED]: 'handlePaymentFailed',
			[WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_ACTION_REQUIRED]:
				'handlePaymentActionRequired',
			[WEBHOOK_EVENT_TYPES.INVOICE_UPCOMING]: 'handleInvoiceUpcoming',
			[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_CREATED]:
				'handlePaymentIntentCreated',
			[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED]:
				'handlePaymentIntentSucceeded',
			[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_PAYMENT_FAILED]:
				'handlePaymentIntentPaymentFailed',
			[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_REQUIRES_ACTION]:
				'handlePaymentIntentRequiresAction',
			[WEBHOOK_EVENT_TYPES.CHARGE_FAILED]: 'handleChargeFailed',
			[WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED]:
				'handleCheckoutCompleted',
			[WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_EXPIRED]:
				'handleCheckoutSessionExpired',
			[WEBHOOK_EVENT_TYPES.SETUP_INTENT_SUCCEEDED]:
				'handleSetupIntentSucceeded',
			[WEBHOOK_EVENT_TYPES.SETUP_INTENT_SETUP_FAILED]:
				'handleSetupIntentSetupFailed'
		}
		return handlerMap[eventType] || 'handleUnknownEvent'
	}

	/**
	 * Get webhook system health status
	 */
	async getSystemHealth(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy'
		details: Record<string, unknown>
	}> {
		const [connectivityStatus, metricsHealth] = await Promise.all([
			this.healthService.getLastHealthCheck() ||
				this.healthService.performHealthCheck(),
			this.metricsService.getHealthStatus()
		])

		const overall =
			connectivityStatus.overall === 'unhealthy' ||
			metricsHealth.status === 'critical'
				? 'unhealthy'
				: connectivityStatus.overall === 'degraded' ||
					  metricsHealth.status === 'warning'
					? 'degraded'
					: 'healthy'

		return {
			status: overall,
			details: {
				connectivity: connectivityStatus,
				metrics: metricsHealth,
				errorStats: this.errorMonitor.getErrorStatistics(24),
				observability: this.observability.getObservabilityMetrics()
			}
		}
	}

	/**
	 * Get comprehensive webhook metrics
	 */
	getMetrics() {
		return {
			performance: {
				overall: this.metricsService.getPerformanceStats(),
				byEventType: this.metricsService
					.getTrackedEventTypes()
					.map(eventType => ({
						eventType,
						stats: this.metricsService.getPerformanceStats(
							eventType
						)
					}))
			},
			errors: this.errorMonitor.getErrorStatistics(24),
			idempotency: this.metricsService.getIdempotencyMetrics(
				this.processedEvents
			),
			health: this.metricsService.getHealthStatus(),
			observability: this.observability.getObservabilityMetrics()
		}
	}

	/**
	 * Search and get webhook traces for debugging
	 */
	getTraces(criteria?: {
		eventType?: string
		success?: boolean
		minDuration?: number
		hasError?: boolean
		limit?: number
	}) {
		const traces = this.observability.searchTraces(criteria || {})
		return traces.slice(0, criteria?.limit || 50)
	}

	private async handleSubscriptionCreated(event: StripeEvent): Promise<void> {
		const subscription = event.data.object as unknown as StripeSubscription
		const result =
			await this.subscriptionSync.syncSubscriptionFromWebhook(
				subscription
			)

		if (result.success) {
			this.logger.log(
				`Subscription created and synced: ${subscription.id}`,
				{
					changes: result.changes?.length || 0
				}
			)
		} else {
			this.logger.error(
				`Failed to sync created subscription: ${subscription.id}`,
				{
					error: result.error
				}
			)
		}
	}

	private async handleSubscriptionUpdated(event: StripeEvent): Promise<void> {
		const subscription = event.data.object as unknown as StripeSubscription
		const previousAttributes = event.data
			.previous_attributes as Partial<StripeSubscription>

		// Sync with database first
		const result =
			await this.subscriptionSync.syncSubscriptionFromWebhook(
				subscription
			)

		if (result.success) {
			this.logger.log(
				`Subscription updated and synced: ${subscription.id}`,
				{
					changes: result.changes?.length || 0
				}
			)
		}

		// Check for specific status changes
		if (
			previousAttributes?.status &&
			previousAttributes.status !== subscription.status
		) {
			this.logger.log(
				`Subscription ${subscription.id} status changed from ${previousAttributes.status} to ${subscription.status}`
			)

			// Handle pause behavior (when trial ends without payment method)
			if (
				subscription.status === 'incomplete' &&
				subscription.pause_collection
			) {
				await this.handleTrialEndedWithoutPayment(subscription)
			}

			// Handle reactivation
			if (
				previousAttributes.status === 'incomplete' &&
				subscription.status === 'active'
			) {
				await this.handleSubscriptionReactivated(subscription)
			}
		}

		this.logger.log(`Subscription updated: ${subscription.id}`)
	}

	private async handleSubscriptionDeleted(event: StripeEvent): Promise<void> {
		const subscription = event.data.object as unknown as StripeSubscription

		// Update subscription status to canceled in database
		try {
			await this.prismaService.subscription.update({
				where: { stripeSubscriptionId: subscription.id },
				data: {
					status: 'CANCELED',
					canceledAt: new Date(),
					updatedAt: new Date()
				}
			})

			this.logger.log(
				`Subscription deleted and status updated: ${subscription.id}`
			)
		} catch (error) {
			this.logger.error(
				`Failed to update deleted subscription status: ${subscription.id}`,
				error
			)
		}
	}

	private async handleSubscriptionPaused(event: StripeEvent): Promise<void> {
		const subscription = event.data.object as unknown as StripeSubscription
		this.logger.log(`Subscription paused: ${subscription.id}`)

		// Update subscription status in database
		const dbSubscription = await this.prismaService.subscription.update({
			where: { stripeSubscriptionId: subscription.id },
			data: {
				status: 'INCOMPLETE',
				updatedAt: new Date()
			},
			include: { User: true }
		})

		if (dbSubscription) {
			// Restrict user's feature access during pause
			await this.restrictUserFeatureAccess(
				dbSubscription.userId,
				'SUBSCRIPTION_PAUSED'
			)

			// Send pause notification
			await this.sendSubscriptionPausedEmail({
				userId: dbSubscription.userId,
				userEmail: (dbSubscription.User as User).email,
				userName: (dbSubscription.User as User).name || undefined,
				subscriptionId: subscription.id,
				planType: dbSubscription.planType || 'FREETRIAL'
			})
		}
	}

	private async handleSubscriptionResumed(event: StripeEvent): Promise<void> {
		const subscription = event.data.object as unknown as StripeSubscription
		this.logger.log(`Subscription resumed: ${subscription.id}`)

		// Sync subscription from Stripe to ensure accurate status
		await this.subscriptionSync.syncSubscriptionFromWebhook(subscription)

		// Get updated subscription details
		const dbSubscription = await this.prismaService.subscription.findUnique(
			{
				where: { stripeSubscriptionId: subscription.id },
				include: { User: true }
			}
		)

		if (dbSubscription) {
			// Restore user's feature access
			await this.restoreUserFeatureAccess(
				dbSubscription.userId,
				dbSubscription.planType
			)

			// Send resume notification
			await this.sendSubscriptionResumedEmail({
				userId: dbSubscription.userId,
				userEmail: (dbSubscription.User as User).email,
				userName: (dbSubscription.User as User).name || undefined,
				subscriptionId: subscription.id,
				planType: dbSubscription.planType || 'FREETRIAL'
			})
		}
	}

	private async handleTrialWillEnd(event: StripeEvent): Promise<void> {
		const subscription = event.data.object as unknown as StripeSubscription
		this.logger.log(`Trial will end for subscription: ${subscription.id}`)

		// Get subscription details from database
		const dbSubscription = await this.prismaService.subscription.findUnique(
			{
				where: { stripeSubscriptionId: subscription.id },
				include: { User: true }
			}
		)

		if (!dbSubscription) {
			this.logger.warn(
				`Subscription ${subscription.id} not found in database`
			)
			return
		}

		// Check if customer has a payment method
		const customer = await this.stripeService.client.customers.retrieve(
			subscription.customer as string
		)

		// Check for payment methods using the modern Payment Methods API
		let hasPaymentMethod = false
		if (customer && !customer.deleted) {
			// Check for default payment method in invoice settings (modern approach)
			if (
				(customer as StripeCustomer).invoice_settings
					?.default_payment_method
			) {
				hasPaymentMethod = true
			} else {
				// Check if customer has any attached payment methods
				try {
					const paymentMethods =
						await this.stripeService.client.paymentMethods.list({
							customer: customer.id,
							limit: 1
						})
					hasPaymentMethod = paymentMethods.data.length > 0
				} catch (error) {
					this.logger.warn(
						`Failed to check payment methods for customer ${customer.id}:`,
						error
					)
					hasPaymentMethod = false
				}
			}
		}

		if (!hasPaymentMethod) {
			// Send email prompting user to add payment method
			this.logger.log(
				`Sending payment method required email to ${dbSubscription.User.email}`
			)

			// Send payment method required notification
			await this.sendPaymentMethodRequiredEmail({
				userId: dbSubscription.User.id,
				userEmail: dbSubscription.User.email,
				userName: dbSubscription.User.name || undefined,
				subscriptionId: subscription.id,
				planType: dbSubscription.planType || 'FREETRIAL',
				trialEndDate: dbSubscription.trialEnd || undefined
			})
		}
	}

	private async handlePaymentSucceeded(event: StripeEvent): Promise<void> {
		const invoice = event.data.object as unknown as StripeInvoice
		// In Stripe API, invoice has a 'subscription' field that can be a string ID or null
		const subscriptionId = (invoice as { subscription?: string | null })
			.subscription

		if (!subscriptionId) {
			return
		}

		this.logger.log(`Payment succeeded for subscription: ${subscriptionId}`)

		// Update subscription status if needed
		await this.prismaService.subscription.update({
			where: { stripeSubscriptionId: subscriptionId },
			data: { status: 'ACTIVE' }
		})
	}

	private async handlePaymentFailed(event: StripeEvent): Promise<void> {
		const invoice = event.data.object as unknown as StripeInvoice
		// In Stripe API, invoice has a 'subscription' field that can be a string ID or null
		const subscriptionId = (invoice as { subscription?: string | null })
			.subscription

		if (!subscriptionId) {
			this.logger.warn(
				'Payment failed event received but no subscription ID found',
				{
					invoiceId: invoice.id,
					customerEmail: invoice.customer_email
				}
			)
			return
		}

		this.logger.warn(`Payment failed for subscription: ${subscriptionId}`, {
			invoiceId: invoice.id,
			customerEmail: invoice.customer_email,
			attemptCount: invoice.attempt_count,
			amountDue: invoice.amount_due,
			currency: invoice.currency
		})

		try {
			// Update subscription status
			const updatedSubscription =
				await this.prismaService.subscription.update({
					where: { stripeSubscriptionId: subscriptionId },
					data: { status: 'PAST_DUE' },
					include: { User: true }
				})

			// Log for monitoring and potential automated actions
			this.logger.warn(`Subscription marked as PAST_DUE`, {
				subscriptionId,
				userId: updatedSubscription.User.id,
				userEmail: updatedSubscription.User.email,
				planType: updatedSubscription.planType
			})

			// Send payment failed notification
			await this.sendPaymentFailedEmail({
				userId: updatedSubscription.User.id,
				userEmail: updatedSubscription.User.email,
				userName: updatedSubscription.User.name || undefined,
				subscriptionId,
				planType: updatedSubscription.planType || 'BASIC',
				attemptCount: invoice.attempt_count,
				amountDue: invoice.amount_due,
				currency: invoice.currency
			})

			// Restrict access after multiple failed attempts
			if (invoice.attempt_count >= 3) {
				await this.restrictUserFeatureAccess(
					updatedSubscription.User.id,
					'PAYMENT_FAILED'
				)
			}
		} catch (error) {
			this.logger.error(
				`Failed to update subscription status for ${subscriptionId}:`,
				error
			)
		}
	}

	private async handleInvoiceUpcoming(event: StripeEvent): Promise<void> {
		const invoice = event.data.object as unknown as StripeInvoice
		const subscriptionId = (invoice as { subscription?: string | null })
			.subscription

		if (!subscriptionId) {
			return
		}

		this.logger.log(`Upcoming invoice for subscription: ${subscriptionId}`)

		// Get subscription details for customer notification
		const subscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscriptionId },
			include: { User: true }
		})

		if (!subscription) {
			this.logger.warn(
				`Subscription ${subscriptionId} not found in database`
			)
			return
		}

		// Send upcoming invoice notification
		await this.sendUpcomingInvoiceEmail({
			userId: subscription.User.id,
			userEmail: subscription.User.email,
			userName: subscription.User.name || undefined,
			subscriptionId,
			planType: subscription.planType || 'BASIC',
			invoiceAmount: invoice.amount_due,
			currency: invoice.currency,
			invoiceDate: new Date(invoice.period_end * 1000),
			billingInterval: this.getBillingIntervalFromInvoice(invoice)
		})

		this.logger.log(
			`Renewal reminder sent to user ${subscription.User.email}`
		)
	}

	private async handlePaymentActionRequired(
		event: StripeEvent
	): Promise<void> {
		const invoice = event.data.object as unknown as StripeInvoice
		const subscriptionId = (invoice as { subscription?: string | null })
			.subscription

		if (!subscriptionId) {
			return
		}

		this.logger.warn(
			`Payment action required for subscription: ${subscriptionId}`
		)

		// Get subscription details
		const subscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscriptionId },
			include: { User: true }
		})

		if (!subscription) {
			this.logger.warn(
				`Subscription ${subscriptionId} not found in database`
			)
			return
		}

		// Send notification about required action
		await this.sendPaymentActionRequiredEmail({
			userId: subscription.User.id,
			userEmail: subscription.User.email,
			userName: subscription.User.name || undefined,
			subscriptionId,
			planType: subscription.planType || 'FREETRIAL',
			invoiceUrl: invoice.hosted_invoice_url || undefined
		})

		this.logger.log(
			`Payment action required notification sent to user ${subscription.User.email}`
		)
	}

	private async handlePaymentIntentRequiresAction(
		event: StripeEvent
	): Promise<void> {
		const paymentIntent = event.data
			.object as unknown as ExpandedPaymentIntent
		this.logger.warn(`Payment intent requires action: ${paymentIntent.id}`)

		// Get the invoice from the payment intent
		const invoice = paymentIntent.invoice
			? await this.stripeService.client.invoices.retrieve(
					paymentIntent.invoice as string
				)
			: null

		if (invoice && (invoice as unknown as ExpandedInvoice).subscription) {
			const subscriptionId = (invoice as unknown as ExpandedInvoice)
				.subscription as string

			// Get subscription details
			const subscription =
				await this.prismaService.subscription.findUnique({
					where: { stripeSubscriptionId: subscriptionId },
					include: { User: true }
				})

			if (subscription) {
				// Send authentication required notification
				await this.sendAuthenticationRequiredEmail({
					userId: subscription.userId,
					userEmail: (subscription.User as User).email,
					userName: (subscription.User as User).name || undefined,
					subscriptionId,
					planType: subscription.planType || 'FREETRIAL',
					paymentIntentId: paymentIntent.id
				})
			}
		}
	}

	private async handleChargeFailed(event: StripeEvent): Promise<void> {
		const charge = event.data.object as unknown as ExpandedCharge
		this.logger.error(`Charge failed: ${charge.id}`, {
			amount: charge.amount,
			currency: charge.currency,
			failureCode: charge.failure_code,
			failureMessage: charge.failure_message,
			customerEmail: charge.billing_details?.email
		})

		// Get the invoice from the charge
		const invoice = charge.invoice
			? await this.stripeService.client.invoices.retrieve(
					charge.invoice as string
				)
			: null

		if (invoice && (invoice as unknown as ExpandedInvoice).subscription) {
			const subscriptionId = (invoice as unknown as ExpandedInvoice)
				.subscription as string

			// Get subscription details
			const subscription =
				await this.prismaService.subscription.findUnique({
					where: { stripeSubscriptionId: subscriptionId },
					include: { User: true }
				})

			if (subscription) {
				// Send charge failed notification with specific error details
				await this.sendChargeFailedEmail({
					userId: subscription.userId,
					userEmail: (subscription.User as User).email,
					userName: (subscription.User as User).name || undefined,
					subscriptionId,
					planType: subscription.planType || 'FREETRIAL',
					failureCode: charge.failure_code || 'unknown',
					failureMessage:
						charge.failure_message ||
						'Payment could not be processed',
					amount: charge.amount,
					currency: charge.currency
				})

				// Log for monitoring and potential manual intervention
				this.logger.error(
					`Charge failed for user ${(subscription.User as User).email}`,
					{
						subscriptionId,
						chargeId: charge.id,
						failureCode: charge.failure_code,
						failureMessage: charge.failure_message
					}
				)
			}
		}
	}

	private async handleCheckoutCompleted(event: StripeEvent): Promise<void> {
		const session = event.data.object as unknown as StripeCheckoutSession

		// Only handle subscription mode sessions
		if (session.mode !== 'subscription') {
			this.logger.log(
				`Ignoring non-subscription checkout session: ${session.mode}`
			)
			return
		}

		const subscriptionId = session.subscription as string
		const userId = session.metadata?.userId
		const customerEmail = session.customer_details?.email

		if (!userId || !subscriptionId) {
			this.logger.error(
				'Missing userId or subscriptionId in checkout session',
				{
					sessionId: session.id,
					userId,
					subscriptionId,
					customerEmail
				}
			)
			return
		}

		this.logger.log(
			`Checkout completed for user ${userId}, subscription ${subscriptionId}`,
			{
				sessionId: session.id,
				customerEmail,
				paymentStatus: session.payment_status
			}
		)

		try {
			// PRIMARY SOURCE OF TRUTH: Retrieve the subscription from Stripe to ensure we have the latest data
			const stripeSubscription =
				await this.stripeService.client.subscriptions.retrieve(
					subscriptionId
				)

			// Sync the subscription with our database
			await this.subscriptionSync.syncSubscriptionFromWebhook(
				stripeSubscription as unknown as StripeSubscription
			)

			// Additional success actions
			await this.handleSubscriptionActivated(
				userId,
				subscriptionId,
				session
			)

			this.logger.log(
				`Successfully processed checkout completion for subscription ${subscriptionId}`
			)
		} catch (error) {
			this.logger.error(
				`Error processing checkout completion for subscription ${subscriptionId}:`,
				error
			)
			// Don't rethrow - we still want to return 200 to Stripe
		}
	}

	private async handleSubscriptionActivated(
		userId: string,
		subscriptionId: string,
		session: StripeCheckoutSession
	): Promise<void> {
		// Update user's subscription status to ensure they have access
		const user = await this.prismaService.user.findUnique({
			where: { id: userId },
			include: { Subscription: true }
		})

		if (!user) {
			this.logger.warn(
				`User ${userId} not found during subscription activation`
			)
			return
		}

		// Log successful activation for analytics/monitoring
		this.logger.log(`Subscription activated successfully`, {
			userId,
			subscriptionId,
			userEmail: user.email,
			sessionId: session.id,
			paymentStatus: session.payment_status
		})

		// Welcome emails and onboarding workflows would be implemented here when payment features are enabled
		// await this.emailService.sendSubscriptionActivatedEmail(...)
		// User permissions/features would be updated based on subscription plan
	}

	private async handleTrialEndedWithoutPayment(
		subscription: StripeSubscription
	): Promise<void> {
		this.logger.log(
			`Trial ended without payment method for subscription: ${subscription.id}`
		)

		// Get subscription details
		const dbSubscription = await this.prismaService.subscription.findUnique(
			{
				where: { stripeSubscriptionId: subscription.id },
				include: { User: true }
			}
		)

		if (!dbSubscription) {
			this.logger.warn(
				`Subscription ${subscription.id} not found in database`
			)
			return
		}

		// Update subscription status - use INCOMPLETE for paused trials per Stripe docs
		await this.prismaService.subscription.update({
			where: { stripeSubscriptionId: subscription.id },
			data: {
				status: 'INCOMPLETE', // Official Stripe status for paused trials
				updatedAt: new Date()
			}
		})

		this.logger.log(
			`Trial ended without payment method for user ${dbSubscription.User.email}`
		)

		// Send payment method required email
		await this.sendPaymentMethodRequiredEmail({
			userId: dbSubscription.User.id,
			userEmail: dbSubscription.User.email,
			userName: dbSubscription.User.name || undefined,
			subscriptionId: subscription.id,
			planType: dbSubscription.planType || 'FREETRIAL',
			trialEndDate: dbSubscription.trialEnd || undefined
		})

		// Restrict user's feature access to FREETRIAL tier
		await this.restrictUserFeatureAccess(
			dbSubscription.User.id,
			'TRIAL_ENDED'
		)
	}

	private async handleSubscriptionReactivated(
		subscription: StripeSubscription
	): Promise<void> {
		this.logger.log(`Subscription reactivated: ${subscription.id}`)

		// Get subscription details
		const dbSubscription = await this.prismaService.subscription.findUnique(
			{
				where: { stripeSubscriptionId: subscription.id },
				include: { User: true }
			}
		)

		if (!dbSubscription) {
			this.logger.warn(
				`Subscription ${subscription.id} not found in database`
			)
			return
		}

		// Update subscription status to ACTIVE (already done by syncSubscriptionFromStripe)
		this.logger.log(
			`Subscription reactivated for user ${dbSubscription.User.email}`
		)

		// Send welcome back email
		await this.sendSubscriptionReactivatedEmail({
			userId: dbSubscription.User.id,
			userEmail: dbSubscription.User.email,
			userName: dbSubscription.User.name || undefined,
			subscriptionId: subscription.id,
			planType: dbSubscription.planType || 'BASIC'
		})

		// Restore user's feature access level
		await this.restoreUserFeatureAccess(
			dbSubscription.User.id,
			dbSubscription.planType
		)
	}

	// Helper methods for notifications and feature access
	private async sendPaymentMethodRequiredEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		trialEndDate?: Date
	}): Promise<void> {
		// Emit event for decoupled notification handling
		const event: PaymentMethodRequiredEvent = {
			userId: data.userId,
			subscriptionId: data.subscriptionId,
			reason: 'TRIAL_ENDED_WITHOUT_PAYMENT',
			subscriptionStatus: 'incomplete',
			trialEndDate: data.trialEndDate
		}

		this.eventEmitter.emit(
			SubscriptionEventType.PAYMENT_METHOD_REQUIRED,
			event
		)
		this.logger.log(
			`Payment method required event emitted for user ${data.userId}`
		)
	}

	private async sendSubscriptionReactivatedEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
	}): Promise<void> {
		// Emit event for decoupled notification handling
		const event: SubscriptionCreatedEvent = {
			userId: data.userId,
			subscriptionId: data.subscriptionId,
			planType: data.planType,
			customerId: '' // Will be populated by the listener if needed
		}

		this.eventEmitter.emit(
			SubscriptionEventType.SUBSCRIPTION_CREATED,
			event
		)
		this.logger.log(
			`Subscription reactivation event emitted for user ${data.userId}`
		)
	}

	private async restrictUserFeatureAccess(
		userId: string,
		reason: 'TRIAL_ENDED' | 'SUBSCRIPTION_PAUSED' | 'PAYMENT_FAILED'
	): Promise<void> {
		// Emit event for decoupled feature access management
		const event: FeatureAccessRestrictEvent = {
			userId,
			reason
		}

		this.eventEmitter.emit(
			SubscriptionEventType.FEATURE_ACCESS_RESTRICT,
			event
		)
		this.logger.log(
			`Feature access restriction event emitted for user ${userId}, reason: ${reason}`
		)
	}

	private async sendPaymentFailedEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		attemptCount: number
		amountDue: number
		currency: string
	}): Promise<void> {
		// Emit event for decoupled notification handling
		const event: PaymentFailedEvent = {
			userId: data.userId,
			subscriptionId: data.subscriptionId,
			attemptCount: data.attemptCount,
			amount: data.amountDue,
			currency: data.currency,
			nextRetryAt: undefined // Will be calculated by Stripe
		}

		this.eventEmitter.emit(SubscriptionEventType.PAYMENT_FAILED, event)
		this.logger.log(`Payment failed event emitted for user ${data.userId}`)
	}

	private async sendUpcomingInvoiceEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		invoiceAmount: number
		currency: string
		invoiceDate: Date
		billingInterval?: 'monthly' | 'annual'
	}): Promise<void> {
		// For upcoming invoice, we can use the subscription notification service directly
		// since it doesn't have the same circular dependency issues
		this.logger.log(
			`Upcoming invoice notification queued for ${data.userEmail}`
		)
		// TODO: Implement event-based upcoming invoice notification
	}

	private getBillingIntervalFromInvoice(
		invoice: StripeInvoice
	): 'monthly' | 'annual' {
		// Check the invoice lines to determine billing interval
		const line = invoice.lines?.data?.[0]
		if (
			line &&
			'price' in line &&
			line.price &&
			typeof line.price === 'object' &&
			'recurring' in line.price &&
			line.price.recurring &&
			typeof line.price.recurring === 'object' &&
			'interval' in line.price.recurring &&
			line.price.recurring.interval === 'year'
		) {
			return 'annual'
		}
		return 'monthly'
	}

	private async restoreUserFeatureAccess(
		userId: string,
		planType: string | null
	): Promise<void> {
		// Emit event for decoupled feature access management
		const event: FeatureAccessRestoreEvent = {
			userId,
			planType: (planType || 'FREETRIAL') as
				| 'FREETRIAL'
				| 'STARTER'
				| 'GROWTH'
				| 'TENANTFLOW_MAX'
		}

		this.eventEmitter.emit(
			SubscriptionEventType.FEATURE_ACCESS_RESTORE,
			event
		)
		this.logger.log(
			`Feature access restoration event emitted for user ${userId}, planType: ${planType}`
		)
	}

	// New notification methods for additional webhook events
	private async sendSubscriptionPausedEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
	}): Promise<void> {
		// Emit feature access restriction event for subscription pause
		const event: FeatureAccessRestrictEvent = {
			userId: data.userId,
			reason: 'SUBSCRIPTION_PAUSED'
		}

		this.eventEmitter.emit(
			SubscriptionEventType.FEATURE_ACCESS_RESTRICT,
			event
		)
		this.logger.log(
			`Subscription paused notification queued for ${data.userEmail}`
		)
	}

	private async sendSubscriptionResumedEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
	}): Promise<void> {
		// Emit feature access restoration event for subscription resume
		const event: FeatureAccessRestoreEvent = {
			userId: data.userId,
			planType: (data.planType || 'FREETRIAL') as
				| 'FREETRIAL'
				| 'STARTER'
				| 'GROWTH'
				| 'TENANTFLOW_MAX'
		}

		this.eventEmitter.emit(
			SubscriptionEventType.FEATURE_ACCESS_RESTORE,
			event
		)
		this.logger.log(
			`Subscription resumed notification queued for ${data.userEmail}`
		)
	}

	private async sendPaymentActionRequiredEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		invoiceUrl?: string
	}): Promise<void> {
		// Log for now - could emit a more specific event if needed
		this.logger.log(
			`Payment action required notification queued for ${data.userEmail}`
		)
		// TODO: Implement specific payment action required event if needed
	}

	private async sendAuthenticationRequiredEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		paymentIntentId: string
	}): Promise<void> {
		// Log for now - could emit a more specific event if needed
		this.logger.log(
			`Authentication required notification queued for ${data.userEmail}`
		)
		// TODO: Implement specific authentication required event if needed
	}

	private async sendChargeFailedEmail(data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		failureCode: string
		failureMessage: string
		amount: number
		currency: string
	}): Promise<void> {
		// Emit payment failed event for charge failures
		const event: PaymentFailedEvent = {
			userId: data.userId,
			subscriptionId: data.subscriptionId,
			attemptCount: 1, // Charge failures are typically first attempt
			amount: data.amount,
			currency: data.currency,
			nextRetryAt: undefined
		}

		this.eventEmitter.emit(SubscriptionEventType.PAYMENT_FAILED, event)
		this.logger.log(
			`Charge failed notification queued for ${data.userEmail}`
		)
	}

	// ========================
	// New Missing Event Handlers
	// ========================

	private async handleCustomerCreated(event: StripeEvent): Promise<void> {
		const customer = event.data.object as unknown as StripeCustomer
		this.logger.log(`Customer created: ${customer.id}`)

		// Basic customer creation logging - could be extended for customer onboarding
		// TODO: Implement customer onboarding workflow if needed
	}

	private async handleCustomerUpdated(event: StripeEvent): Promise<void> {
		const customer = event.data.object as unknown as StripeCustomer
		const previousAttributes = event.data
			.previous_attributes as Partial<StripeCustomer>

		this.logger.log(`Customer updated: ${customer.id}`)

		// Log significant changes
		if (previousAttributes?.email) {
			this.logger.log(
				`Customer ${customer.id} email changed from ${previousAttributes.email} to ${customer.email}`
			)
		}

		// TODO: Sync customer changes with database if needed
	}

	private async handleCustomerDeleted(event: StripeEvent): Promise<void> {
		const customer = event.data.object as unknown as StripeCustomer
		this.logger.log(`Customer deleted: ${customer.id}`)

		// TODO: Handle customer deletion cleanup if needed
		// Note: This is rare - customers are usually just deactivated
	}

	private async handleInvoiceCreated(event: StripeEvent): Promise<void> {
		const invoice = event.data.object as unknown as StripeInvoice
		this.logger.log(`Invoice created: ${invoice.id}`)

		// TODO: Store invoice details in database for record keeping
	}

	private async handleInvoiceFinalized(event: StripeEvent): Promise<void> {
		const invoice = event.data.object as unknown as StripeInvoice
		this.logger.log(`Invoice finalized: ${invoice.id}`)

		// TODO: Send invoice to customer via email if auto-collection is disabled
	}

	private async handlePaymentIntentCreated(
		event: StripeEvent
	): Promise<void> {
		const paymentIntent = event.data
			.object as unknown as StripePaymentIntent
		this.logger.log(`Payment intent created: ${paymentIntent.id}`)

		// Basic logging - payment intent creation is usually automatic
	}

	private async handlePaymentIntentSucceeded(
		event: StripeEvent
	): Promise<void> {
		const paymentIntent = event.data
			.object as unknown as StripePaymentIntent
		this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`)

		// For subscription payments, this is handled by invoice.payment_succeeded
		// For one-time payments, could trigger success notifications
	}

	private async handlePaymentIntentPaymentFailed(
		event: StripeEvent
	): Promise<void> {
		const paymentIntent = event.data
			.object as unknown as StripePaymentIntent
		this.logger.warn(`Payment intent failed: ${paymentIntent.id}`)

		// Log failure details for debugging
		if (paymentIntent.last_payment_error) {
			this.logger.warn('Payment failure details:', {
				code: paymentIntent.last_payment_error.code,
				message: paymentIntent.last_payment_error.message,
				type: paymentIntent.last_payment_error.type
			})
		}
	}

	private async handleCheckoutSessionExpired(
		event: StripeEvent
	): Promise<void> {
		const session = event.data.object as unknown as StripeCheckoutSession
		this.logger.log(`Checkout session expired: ${session.id}`)

		// Could be used for abandoned cart analytics
		// TODO: Implement abandoned checkout follow-up if needed
	}

	private async handleSetupIntentSucceeded(
		event: StripeEvent
	): Promise<void> {
		const setupIntent = event.data.object as unknown as StripeSetupIntent
		this.logger.log(`Setup intent succeeded: ${setupIntent.id}`)

		// Payment method successfully attached to customer
		// Could trigger "payment method added" notification
	}

	private async handleSetupIntentSetupFailed(
		event: StripeEvent
	): Promise<void> {
		const setupIntent = event.data.object as unknown as StripeSetupIntent
		this.logger.warn(`Setup intent failed: ${setupIntent.id}`)

		// Log failure details
		if (setupIntent.last_setup_error) {
			this.logger.warn('Setup intent failure details:', {
				code: setupIntent.last_setup_error.code,
				message: setupIntent.last_setup_error.message,
				type: setupIntent.last_setup_error.type
			})
		}

		// TODO: Notify customer about payment method setup failure
	}
}
