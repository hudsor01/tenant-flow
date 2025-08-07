import { User } from '@repo/database';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import {
  WebhookEventType,
  WEBHOOK_EVENT_TYPES
} from '@repo/shared'
import {
	SubscriptionEventType,
	FeatureAccessRestrictEvent,
	FeatureAccessRestoreEvent
} from '../common/events/subscription.events'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'
import { StripeBillingService } from './stripe-billing.service'
import { StripeService } from './stripe.service'

// Interfaces for expanded Stripe objects
interface ExpandedPaymentIntent extends Stripe.PaymentIntent {
  invoice: string | Stripe.Invoice | null;
}

interface ExpandedCharge extends Stripe.Charge {
  invoice: string | Stripe.Invoice | null;
}

interface ExpandedInvoice extends Stripe.Invoice {
  subscription: string | Stripe.Subscription | null;
}

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name)
	private readonly processedEvents = new Set<string>()

	constructor(
		@Inject(forwardRef(() => StripeBillingService))
		private readonly billingService: StripeBillingService,
		private readonly stripeService: StripeService,
		private readonly prismaService: PrismaService,
		private readonly eventEmitter: EventEmitter2
	) {}

	async handleWebhookEvent(event: Stripe.Event): Promise<void> {
		// Idempotency check
		if (this.processedEvents.has(event.id)) {
			this.logger.log(`Event ${event.id} already processed, skipping`)
			return
		}

		try {
			this.logger.log(`Processing webhook event: ${event.type}`)

			// Type-safe event handling with proper Stripe event mapping
			const eventType = event.type as WebhookEventType

			switch (eventType) {
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
				case WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED:
					await this.handleCheckoutCompleted(event)
					break
				case WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_REQUIRES_ACTION:
					await this.handlePaymentIntentRequiresAction(event)
					break
				case WEBHOOK_EVENT_TYPES.CHARGE_FAILED:
					await this.handleChargeFailed(event)
					break
				default:
					this.logger.log(`No handler for event type: ${event.type}`)
					return
			}

			this.processedEvents.add(event.id)

			// Clean up old event IDs to prevent memory leak
			if (this.processedEvents.size > 10000) {
				const firstId = this.processedEvents.values().next().value
				if (firstId) {
					this.processedEvents.delete(firstId)
				}
			}
		} catch (error) {
			this.logger.error(`Error processing webhook event ${event.type}:`, error)
			throw error
		}
	}

	private async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		await this.billingService.syncSubscriptionFromStripe(subscription)
		this.logger.log(`Subscription created: ${subscription.id}`)
	}

	private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription>

		// Sync with database first
		await this.billingService.syncSubscriptionFromStripe(subscription)

		// Check for specific status changes
		if (previousAttributes?.status && previousAttributes.status !== subscription.status) {
			this.logger.log(`Subscription ${subscription.id} status changed from ${previousAttributes.status} to ${subscription.status}`)

			// Handle pause behavior (when trial ends without payment method)
			if (subscription.status === 'incomplete' && subscription.pause_collection) {
				await this.handleTrialEndedWithoutPayment(subscription)
			}

			// Handle reactivation
			if (previousAttributes.status === 'incomplete' && subscription.status === 'active') {
				await this.handleSubscriptionReactivated(subscription)
			}
		}

		this.logger.log(`Subscription updated: ${subscription.id}`)
	}

	private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		await this.billingService.handleSubscriptionDeleted(subscription.id)
		this.logger.log(`Subscription deleted: ${subscription.id}`)
	}

	private async handleSubscriptionPaused(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
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
			await this.restrictUserFeatureAccess(dbSubscription.userId, 'SUBSCRIPTION_PAUSED')

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

	private async handleSubscriptionResumed(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		this.logger.log(`Subscription resumed: ${subscription.id}`)

		// Sync subscription from Stripe to ensure accurate status
		await this.billingService.syncSubscriptionFromStripe(subscription)

		// Get updated subscription details
		const dbSubscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscription.id },
			include: { User: true }
		})

		if (dbSubscription) {
			// Restore user's feature access
			await this.restoreUserFeatureAccess(dbSubscription.userId, dbSubscription.planType)

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

	private async handleTrialWillEnd(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		this.logger.log(`Trial will end for subscription: ${subscription.id}`)

		// Get subscription details from database
		const dbSubscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscription.id },
			include: { User: true }
		})

		if (!dbSubscription) {
			this.logger.warn(`Subscription ${subscription.id} not found in database`)
			return
		}

		// Check if customer has a payment method
		const customer = await this.stripeService.client.customers.retrieve(subscription.customer as string)
		const hasPaymentMethod = customer && !customer.deleted &&
			(customer as Stripe.Customer).default_source ||
			(customer as Stripe.Customer).invoice_settings?.default_payment_method

		if (!hasPaymentMethod) {
			// Send email prompting user to add payment method
			this.logger.log(`Sending payment method required email to ${dbSubscription.User.email}`)

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

	private async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
		const invoice = event.data.object as Stripe.Invoice
		// In Stripe API, invoice has a 'subscription' field that can be a string ID or null
		const subscriptionId = (invoice as { subscription?: string | null }).subscription

		if (!subscriptionId) return

		this.logger.log(`Payment succeeded for subscription: ${subscriptionId}`)

		// Update subscription status if needed
		await this.prismaService.subscription.update({
			where: { stripeSubscriptionId: subscriptionId },
			data: { status: 'ACTIVE' }
		})
	}

	private async handlePaymentFailed(event: Stripe.Event): Promise<void> {
		const invoice = event.data.object as Stripe.Invoice
		// In Stripe API, invoice has a 'subscription' field that can be a string ID or null
		const subscriptionId = (invoice as { subscription?: string | null }).subscription

		if (!subscriptionId) {
			this.logger.warn('Payment failed event received but no subscription ID found', {
				invoiceId: invoice.id,
				customerEmail: invoice.customer_email
			})
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
			const updatedSubscription = await this.prismaService.subscription.update({
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
				await this.restrictUserFeatureAccess(updatedSubscription.User.id, 'PAYMENT_FAILED')
			}
		} catch (error) {
			this.logger.error(`Failed to update subscription status for ${subscriptionId}:`, error)
		}
	}

	private async handleInvoiceUpcoming(event: Stripe.Event): Promise<void> {
		const invoice = event.data.object as Stripe.Invoice
		const subscriptionId = (invoice as { subscription?: string | null }).subscription

		if (!subscriptionId) return

		this.logger.log(`Upcoming invoice for subscription: ${subscriptionId}`)

		// Get subscription details for customer notification
		const subscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscriptionId },
			include: { User: true }
		})

		if (!subscription) {
			this.logger.warn(`Subscription ${subscriptionId} not found in database`)
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

		this.logger.log(`Renewal reminder sent to user ${subscription.User.email}`)
	}

	private async handlePaymentActionRequired(event: Stripe.Event): Promise<void> {
		const invoice = event.data.object as Stripe.Invoice
		const subscriptionId = (invoice as { subscription?: string | null }).subscription

		if (!subscriptionId) return

		this.logger.warn(`Payment action required for subscription: ${subscriptionId}`)

		// Get subscription details
		const subscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscriptionId },
			include: { User: true }
		})

		if (!subscription) {
			this.logger.warn(`Subscription ${subscriptionId} not found in database`)
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

		this.logger.log(`Payment action required notification sent to user ${subscription.User.email}`)
	}

	private async handlePaymentIntentRequiresAction(event: Stripe.Event): Promise<void> {
		const paymentIntent = event.data.object as ExpandedPaymentIntent
		this.logger.warn(`Payment intent requires action: ${paymentIntent.id}`)

		// Get the invoice from the payment intent
		const invoice = paymentIntent.invoice ?
			await this.stripeService.client.invoices.retrieve(paymentIntent.invoice as string) :
			null

		if (invoice && (invoice as unknown as ExpandedInvoice).subscription) {
			const subscriptionId = (invoice as unknown as ExpandedInvoice).subscription as string

			// Get subscription details
			const subscription = await this.prismaService.subscription.findUnique({
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

	private async handleChargeFailed(event: Stripe.Event): Promise<void> {
		const charge = event.data.object as ExpandedCharge
		this.logger.error(`Charge failed: ${charge.id}`, {
			amount: charge.amount,
			currency: charge.currency,
			failureCode: charge.failure_code,
			failureMessage: charge.failure_message,
			customerEmail: charge.billing_details?.email
		})

		// Get the invoice from the charge
		const invoice = charge.invoice ?
			await this.stripeService.client.invoices.retrieve(charge.invoice as string) :
			null

		if (invoice && (invoice as unknown as ExpandedInvoice).subscription) {
			const subscriptionId = (invoice as unknown as ExpandedInvoice).subscription as string

			// Get subscription details
			const subscription = await this.prismaService.subscription.findUnique({
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
					failureMessage: charge.failure_message || 'Payment could not be processed',
					amount: charge.amount,
					currency: charge.currency
				})

				// Log for monitoring and potential manual intervention
				this.logger.error(`Charge failed for user ${(subscription.User as User).email}`, {
					subscriptionId,
					chargeId: charge.id,
					failureCode: charge.failure_code,
					failureMessage: charge.failure_message
				})
			}
		}
	}

	private async handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
		const session = event.data.object as Stripe.Checkout.Session

		// Only handle subscription mode sessions
		if (session.mode !== 'subscription') {
			this.logger.log(`Ignoring non-subscription checkout session: ${session.mode}`)
			return
		}

		const subscriptionId = session.subscription as string
		const userId = session.metadata?.userId
		const customerEmail = session.customer_details?.email

		if (!userId || !subscriptionId) {
			this.logger.error('Missing userId or subscriptionId in checkout session', {
				sessionId: session.id,
				userId,
				subscriptionId,
				customerEmail
			})
			return
		}

		this.logger.log(`Checkout completed for user ${userId}, subscription ${subscriptionId}`, {
			sessionId: session.id,
			customerEmail,
			paymentStatus: session.payment_status
		})

		try {
			// PRIMARY SOURCE OF TRUTH: Retrieve the subscription from Stripe to ensure we have the latest data
			const stripeSubscription = await this.stripeService.client.subscriptions.retrieve(subscriptionId)

			// Sync the subscription with our database
			await this.billingService.syncSubscriptionFromStripe(stripeSubscription)

			// Additional success actions
			await this.handleSubscriptionActivated(userId, subscriptionId, session)

			this.logger.log(`Successfully processed checkout completion for subscription ${subscriptionId}`)
		} catch (error) {
			this.logger.error(`Error processing checkout completion for subscription ${subscriptionId}:`, error)
			// Don't rethrow - we still want to return 200 to Stripe
		}
	}

	private async handleSubscriptionActivated(userId: string, subscriptionId: string, session: Stripe.Checkout.Session): Promise<void> {
		// Update user's subscription status to ensure they have access
		const user = await this.prismaService.user.findUnique({
			where: { id: userId },
			include: { Subscription: true }
		})

		if (!user) {
			this.logger.warn(`User ${userId} not found during subscription activation`)
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

	private async handleTrialEndedWithoutPayment(subscription: Stripe.Subscription): Promise<void> {
		this.logger.log(`Trial ended without payment method for subscription: ${subscription.id}`)

		// Get subscription details
		const dbSubscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscription.id },
			include: { User: true }
		})

		if (!dbSubscription) {
			this.logger.warn(`Subscription ${subscription.id} not found in database`)
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

		this.logger.log(`Trial ended without payment method for user ${dbSubscription.User.email}`)

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
		await this.restrictUserFeatureAccess(dbSubscription.User.id, 'TRIAL_ENDED')
	}

	private async handleSubscriptionReactivated(subscription: Stripe.Subscription): Promise<void> {
		this.logger.log(`Subscription reactivated: ${subscription.id}`)

		// Get subscription details
		const dbSubscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscription.id },
			include: { User: true }
		})

		if (!dbSubscription) {
			this.logger.warn(`Subscription ${subscription.id} not found in database`)
			return
		}

		// Update subscription status to ACTIVE (already done by syncSubscriptionFromStripe)
		this.logger.log(`Subscription reactivated for user ${dbSubscription.User.email}`)

		// Send welcome back email
		await this.sendSubscriptionReactivatedEmail({
			userId: dbSubscription.User.id,
			userEmail: dbSubscription.User.email,
			userName: dbSubscription.User.name || undefined,
			subscriptionId: subscription.id,
			planType: dbSubscription.planType || 'BASIC'
		})

		// Restore user's feature access level
		await this.restoreUserFeatureAccess(dbSubscription.User.id, dbSubscription.planType)
	}

	// Helper methods for notifications and feature access
	private async sendPaymentMethodRequiredEmail(_data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		trialEndDate?: Date
	}): Promise<void> {
		// Temporarily disabled for circular dependency fix
		// await this.notificationService.sendPaymentMethodRequired({
		//	userId: data.userId,
		//	userEmail: data.userEmail,
		//	userName: data.userName,
		//	subscriptionId: data.subscriptionId,
		//	planType: data.planType,
		//	trialEndDate: data.trialEndDate
		// })
	}

	private async sendSubscriptionReactivatedEmail(_data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
	}): Promise<void> {
		// await this.notificationService.sendSubscriptionActivated({
		//	userId: data.userId,
		//	userEmail: data.userEmail,
		//	userName: data.userName,
		//	subscriptionId: data.subscriptionId,
		//	planType: data.planType
		// })
	}

	private async restrictUserFeatureAccess(userId: string, reason: 'TRIAL_ENDED' | 'SUBSCRIPTION_PAUSED' | 'PAYMENT_FAILED'): Promise<void> {
		// Emit event for decoupled feature access management
		const event: FeatureAccessRestrictEvent = {
			userId,
			reason
		}

		this.eventEmitter.emit(SubscriptionEventType.FEATURE_ACCESS_RESTRICT, event)
		this.logger.log(`Feature access restriction event emitted for user ${userId}, reason: ${reason}`)
	}

	private async sendPaymentFailedEmail(_data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		attemptCount: number
		amountDue: number
		currency: string
	}): Promise<void> {
		// await this.notificationService.sendPaymentFailed({
		//	userId: data.userId,
		//	userEmail: data.userEmail,
		//	userName: data.userName,
		//	subscriptionId: data.subscriptionId,
		//	planType: data.planType,
		//	attemptCount: data.attemptCount,
		//	amountDue: data.amountDue,
		//	currency: data.currency
		// })
	}

	private async sendUpcomingInvoiceEmail(_data: {
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
		// await this.notificationService.sendUpcomingInvoice({
		//	userId: data.userId,
		//	userEmail: data.userEmail,
		//	userName: data.userName,
		//	subscriptionId: data.subscriptionId,
		//	planType: data.planType,
		//	invoiceAmount: data.invoiceAmount,
		//	currency: data.currency,
		//	invoiceDate: data.invoiceDate,
		//	billingInterval: data.billingInterval
		// })
	}

	private getBillingIntervalFromInvoice(invoice: Stripe.Invoice): 'monthly' | 'annual' {
		// Check the invoice lines to determine billing interval
		const line = invoice.lines?.data?.[0]
		if (line && 'price' in line && line.price && typeof line.price === 'object' && 'recurring' in line.price && line.price.recurring && typeof line.price.recurring === 'object' && 'interval' in line.price.recurring && line.price.recurring.interval === 'year') {
			return 'annual'
		}
		return 'monthly'
	}

	private async restoreUserFeatureAccess(userId: string, planType: string | null): Promise<void> {
		// Emit event for decoupled feature access management
		const event: FeatureAccessRestoreEvent = {
			userId,
			planType: (planType || 'FREETRIAL') as 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
		}

		this.eventEmitter.emit(SubscriptionEventType.FEATURE_ACCESS_RESTORE, event)
		this.logger.log(`Feature access restoration event emitted for user ${userId}, planType: ${planType}`)
	}

	// New notification methods for additional webhook events
	private async sendSubscriptionPausedEmail(_data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
	}): Promise<void> {
		// Temporarily disabled for circular dependency fix
		// await this.notificationService.sendSubscriptionPaused(data)
		this.logger.log(`Subscription paused notification queued for ${_data.userEmail}`)
	}

	private async sendSubscriptionResumedEmail(_data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
	}): Promise<void> {
		// Temporarily disabled for circular dependency fix
		// await this.notificationService.sendSubscriptionResumed(data)
		this.logger.log(`Subscription resumed notification queued for ${_data.userEmail}`)
	}

	private async sendPaymentActionRequiredEmail(_data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		invoiceUrl?: string
	}): Promise<void> {
		// Temporarily disabled for circular dependency fix
		// await this.notificationService.sendPaymentActionRequired(data)
		this.logger.log(`Payment action required notification queued for ${_data.userEmail}`)
	}

	private async sendAuthenticationRequiredEmail(_data: {
		userId: string
		userEmail: string
		userName?: string
		subscriptionId: string
		planType: string
		paymentIntentId: string
	}): Promise<void> {
		// Temporarily disabled for circular dependency fix
		// await this.notificationService.sendAuthenticationRequired(data)
		this.logger.log(`Authentication required notification queued for ${_data.userEmail}`)
	}

	private async sendChargeFailedEmail(_data: {
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
		// Temporarily disabled for circular dependency fix
		// await this.notificationService.sendChargeFailed(data)
		this.logger.log(`Charge failed notification queued for ${_data.userEmail}`)
	}
}
