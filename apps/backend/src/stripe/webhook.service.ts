import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { SubscriptionService } from './subscription.service'
import { StripeService } from './stripe.service'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
// Webhook types - define locally since they're specific to this service
type WebhookEventType = 
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'


interface WebhookEventHandlers {
  'customer.subscription.created': (event: Stripe.Event) => Promise<void>
  'customer.subscription.updated': (event: Stripe.Event) => Promise<void>
  'customer.subscription.deleted': (event: Stripe.Event) => Promise<void>
  'customer.subscription.trial_will_end': (event: Stripe.Event) => Promise<void>
  'invoice.payment_succeeded': (event: Stripe.Event) => Promise<void>
  'invoice.payment_failed': (event: Stripe.Event) => Promise<void>
  'invoice.upcoming': (event: Stripe.Event) => Promise<void>
  'checkout.session.completed': (event: Stripe.Event) => Promise<void>
}

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name)
	private readonly processedEvents = new Set<string>()

	constructor(
		private readonly subscriptionService: SubscriptionService,
		private readonly stripeService: StripeService,
		private readonly prismaService: PrismaService,
		private readonly emailService: EmailService
	) {}

	async handleWebhookEvent(event: Stripe.Event): Promise<void> {
		// Idempotency check
		if (this.processedEvents.has(event.id)) {
			this.logger.log(`Event ${event.id} already processed, skipping`)
			return
		}

		try {
			this.logger.log(`Processing webhook event: ${event.type}`)

			const handlers: Partial<WebhookEventHandlers> = {
				'customer.subscription.created': this.handleSubscriptionCreated.bind(this),
				'customer.subscription.updated': this.handleSubscriptionUpdated.bind(this),
				'customer.subscription.deleted': this.handleSubscriptionDeleted.bind(this),
				'customer.subscription.trial_will_end': this.handleTrialWillEnd.bind(this),
				'invoice.payment_succeeded': this.handlePaymentSucceeded.bind(this),
				'invoice.payment_failed': this.handlePaymentFailed.bind(this),
				'invoice.upcoming': this.handleInvoiceUpcoming.bind(this),
				'checkout.session.completed': this.handleCheckoutCompleted.bind(this)
			}

			const handler = handlers[event.type as WebhookEventType]
			if (handler) {
				await handler(event)
				this.processedEvents.add(event.id)
				
				// Clean up old event IDs to prevent memory leak
				if (this.processedEvents.size > 10000) {
					const firstId = this.processedEvents.values().next().value
					if (firstId) {
						this.processedEvents.delete(firstId)
					}
				}
			} else {
				this.logger.log(`No handler for event type: ${event.type}`)
			}
		} catch (error) {
			this.logger.error(`Error processing webhook event ${event.type}:`, error)
			throw error
		}
	}

	private async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		await this.subscriptionService.syncSubscriptionFromStripe(subscription)
		this.logger.log(`Subscription created: ${subscription.id}`)
	}

	private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		await this.subscriptionService.syncSubscriptionFromStripe(subscription)
		this.logger.log(`Subscription updated: ${subscription.id}`)
	}

	private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		await this.subscriptionService.handleSubscriptionDeleted(subscription.id)
		this.logger.log(`Subscription deleted: ${subscription.id}`)
	}

	private async handleTrialWillEnd(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		this.logger.log(`Trial will end for subscription: ${subscription.id}`)
		// You can implement email notifications here
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

			// Payment retry and grace period handling would be implemented here when payment features are enabled
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

		// Here you can implement email notifications for upcoming renewals
		// For example, send a reminder email 3 days before renewal
		this.logger.log(`Renewal reminder needed for user ${subscription.User.email}`)
		
		// Email notifications for renewal reminders would be implemented here when payment features are enabled
		// await this.emailService.sendSubscriptionRenewalReminder(...)
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
			await this.subscriptionService.syncSubscriptionFromStripe(stripeSubscription)
			
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

	private async handleSubscriptionPaused(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		this.logger.log(`Subscription paused: ${subscription.id}`)
		
		// Update subscription status to PAUSED
		await this.prismaService.subscription.update({
			where: { stripeSubscriptionId: subscription.id },
			data: { 
				status: 'PAUSED',
				updatedAt: new Date()
			}
		})
		
		// Log the pause reason if available
		const pauseCollection = subscription.pause_collection
		if (pauseCollection) {
			this.logger.log(`Pause reason: ${pauseCollection.behavior}`)
		}
	}

	private async handleSubscriptionResumed(event: Stripe.Event): Promise<void> {
		const subscription = event.data.object as Stripe.Subscription
		this.logger.log(`Subscription resumed: ${subscription.id}`)
		
		// Update subscription status back to ACTIVE
		await this.prismaService.subscription.update({
			where: { stripeSubscriptionId: subscription.id },
			data: { 
				status: 'ACTIVE',
				updatedAt: new Date()
			}
		})
	}
}