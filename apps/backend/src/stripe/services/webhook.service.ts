import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import Stripe from 'stripe'

/**
 * Simplified Webhook Service for MVP
 * Only handle essential events: subscriptions and payments
 */
@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name)

	constructor(private prisma: PrismaService) {}

	async handleWebhook(event: Stripe.Event): Promise<void> {
		this.logger.log(`Processing webhook: ${event.type}`)

		try {
			switch (event.type) {
				// Essential: Track subscription creation
				case 'customer.subscription.created':
					await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)
					break

				// Essential: Track subscription updates (plan changes, cancellations)
				case 'customer.subscription.updated':
					await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
					break

				// Essential: Handle successful payments
				case 'payment_intent.succeeded':
					await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
					break

				// Essential: Handle failed payments
				case 'payment_intent.payment_failed':
					await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
					break

				default:
					// Log other events but don't process them for MVP
					this.logger.log(`Ignoring webhook event: ${event.type}`)
			}
		} catch (error) {
			this.logger.error(`Webhook error for ${event.type}:`, error)
			throw error
		}
	}

	private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
		try {
			// Basic subscription tracking - just log for now
			this.logger.log(`Subscription created: ${subscription.id} for customer ${subscription.customer}`)
			
			// TODO: Update user subscription status in database when we have users
			// For now, just ensure the webhook was processed
		} catch (error) {
			this.logger.error('Failed to handle subscription creation:', error)
		}
	}

	private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
		try {
			this.logger.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`)
			
			// TODO: Update subscription status in database when we have users
		} catch (error) {
			this.logger.error('Failed to handle subscription update:', error)
		}
	}

	private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
		try {
			this.logger.log(`Payment succeeded: ${paymentIntent.id}, amount: ${paymentIntent.amount}`)
			
			// TODO: Record payment in database when we have users
		} catch (error) {
			this.logger.error('Failed to handle payment success:', error)
		}
	}

	private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
		try {
			this.logger.log(`Payment failed: ${paymentIntent.id}, amount: ${paymentIntent.amount}`)
			
			// TODO: Handle payment failure (notify user, etc.) when we have users
		} catch (error) {
			this.logger.error('Failed to handle payment failure:', error)
		}
	}

	// Health check
	isHealthy(): boolean {
		return true
	}
}