import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { SubscriptionService } from './subscription.service'
import { PrismaService } from '../prisma/prisma.service'
import type { WebhookEventHandler, WebhookEventType } from './types/stripe.types'

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name)
	private readonly processedEvents = new Set<string>()

	constructor(
		private readonly subscriptionService: SubscriptionService,
		private readonly prismaService: PrismaService
	) {}

	async handleWebhookEvent(event: Stripe.Event): Promise<void> {
		// Idempotency check
		if (this.processedEvents.has(event.id)) {
			this.logger.log(`Event ${event.id} already processed, skipping`)
			return
		}

		try {
			this.logger.log(`Processing webhook event: ${event.type}`)

			const handlers: Partial<WebhookEventHandler> = {
				'customer.subscription.created': this.handleSubscriptionCreated.bind(this),
				'customer.subscription.updated': this.handleSubscriptionUpdated.bind(this),
				'customer.subscription.deleted': this.handleSubscriptionDeleted.bind(this),
				'customer.subscription.paused': this.handleSubscriptionPaused.bind(this),
				'customer.subscription.resumed': this.handleSubscriptionResumed.bind(this),
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
		const subscriptionId = (invoice as any).subscription as string | null
			
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
		const subscriptionId = (invoice as any).subscription as string | null
			
		if (!subscriptionId) return

		this.logger.warn(`Payment failed for subscription: ${subscriptionId}`)
		
		// Update subscription status
		await this.prismaService.subscription.update({
			where: { stripeSubscriptionId: subscriptionId },
			data: { status: 'PAST_DUE' }
		})
	}

	private async handleInvoiceUpcoming(event: Stripe.Event): Promise<void> {
		const invoice = event.data.object as Stripe.Invoice
		const subscriptionId = (invoice as any).subscription as string | null
			
		if (!subscriptionId) return

		this.logger.log(`Upcoming invoice for subscription: ${subscriptionId}`)
		
		// Get subscription details for customer notification
		const subscription = await this.prismaService.subscription.findUnique({
			where: { stripeSubscriptionId: subscriptionId },
			include: { user: true }
		})

		if (!subscription) {
			this.logger.warn(`Subscription ${subscriptionId} not found in database`)
			return
		}

		// Here you can implement email notifications for upcoming renewals
		// For example, send a reminder email 3 days before renewal
		this.logger.log(`Renewal reminder needed for user ${subscription.user.email}`)
		
		// TODO: Implement email notification service
		// await this.emailService.sendRenewalReminder(subscription.user.email, subscription)
	}

	private async handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
		const session = event.data.object as Stripe.Checkout.Session

		// Only handle subscription mode sessions
		if (session.mode !== 'subscription') return

		const subscriptionId = session.subscription as string
		const userId = session.metadata?.userId

		if (!userId || !subscriptionId) {
			this.logger.error('Missing userId or subscriptionId in checkout session')
			return
		}

		this.logger.log(`Checkout completed for user ${userId}, subscription ${subscriptionId}`)

		// Subscription will be synced via subscription.created event
		// This is just for logging and potential additional actions
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