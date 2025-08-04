import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeService } from './stripe.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name)
	private readonly processedEvents = new Set<string>()

	constructor(
		private readonly stripeService: StripeService,
		private readonly prismaService: PrismaService
	) {}

	async handleWebhookEvent(event: Stripe.Event): Promise<void> {
		// Prevent duplicate processing
		if (this.processedEvents.has(event.id)) {
			this.logger.warn(`Event ${event.id} already processed, skipping`)
			return
		}

		try {
			this.logger.log(`Processing webhook event: ${event.type} (${event.id})`)

			// Store webhook event for auditing
			await this.storeWebhookEvent(event)

			// Basic event handling - just log for now
			switch (event.type) {
				case 'customer.created':
					this.logger.log(`Customer created: ${(event.data.object as Stripe.Customer).id}`)
					break
				case 'customer.subscription.created':
					this.logger.log(`Subscription created: ${(event.data.object as Stripe.Subscription).id}`)
					break
				case 'customer.subscription.updated':
					this.logger.log(`Subscription updated: ${(event.data.object as Stripe.Subscription).id}`)
					break
				case 'customer.subscription.deleted':
					this.logger.log(`Subscription deleted: ${(event.data.object as Stripe.Subscription).id}`)
					break
				default:
					this.logger.log(`Unhandled event type: ${event.type}`)
			}

			// Mark as processed
			this.processedEvents.add(event.id)
			
			// Clean up old processed events (keep last 1000)
			if (this.processedEvents.size > 1000) {
				const eventsToRemove = Array.from(this.processedEvents).slice(0, 100)
				eventsToRemove.forEach(eventId => this.processedEvents.delete(eventId))
			}

		} catch (error) {
			this.logger.error(`Failed to process webhook event ${event.id}:`, error)
			throw error
		}
	}

	private async storeWebhookEvent(event: Stripe.Event): Promise<void> {
		try {
			// Basic webhook event storage
			// Note: This requires a webhookEvent table in the database
			// For now, just log the event details
			this.logger.debug(`Webhook event stored: ${event.id} - ${event.type}`)
		} catch (error) {
			this.logger.warn(`Failed to store webhook event ${event.id}:`, error)
			// Don't throw - webhook processing can continue even if storage fails
		}
	}

	/**
	 * Verify webhook signature
	 */
	async verifyWebhookSignature(
		payload: string | Buffer,
		signature: string,
		endpointSecret: string
	): Promise<Stripe.Event> {
		return await this.stripeService.constructWebhookEvent(payload, signature, endpointSecret)
	}
}