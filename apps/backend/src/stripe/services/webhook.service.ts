import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import Stripe from 'stripe'

// Stripe.Subscription properties are available but TypeScript doesn't recognize them
// This interface ensures proper typing for subscription period dates
interface SubscriptionWithPeriods extends Stripe.Subscription {
	current_period_start: number
	current_period_end: number
}

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
					await this.handleSubscriptionCreated(event.data.object as SubscriptionWithPeriods)
					break

				// Essential: Track subscription updates (plan changes, cancellations)
				case 'customer.subscription.updated':
					await this.handleSubscriptionUpdated(event.data.object as SubscriptionWithPeriods)
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

	private async handleSubscriptionCreated(subscription: SubscriptionWithPeriods): Promise<void> {
		try {
			this.logger.log(`Subscription created: ${subscription.id} for customer ${subscription.customer}`)
			
			// Find user by Stripe customer ID and create/update subscription record
			const existingSubscription = await this.prisma.subscription.findUnique({
				where: { stripeSubscriptionId: subscription.id }
			})

			if (!existingSubscription) {
				// Find existing subscription with this customer ID to get userId
				const existingCustomerSubscription = await this.prisma.subscription.findFirst({
					where: { stripeCustomerId: subscription.customer as string }
				})

				let userId: string
				if (existingCustomerSubscription) {
					// Use the same userId from existing subscription for this customer
					userId = existingCustomerSubscription.userId
				} else {
					this.logger.error(`No existing user found for Stripe customer ${subscription.customer}. Skipping subscription creation.`)
					throw new Error('User resolution failed for Stripe customer')
				}

				// Create new subscription record
				await this.prisma.subscription.create({
					data: {
						stripeSubscriptionId: subscription.id,
						stripeCustomerId: subscription.customer as string,
						status: subscription.status,
						stripePriceId: subscription.items.data[0]?.price.id,
						planId: this.mapStripePriceToPlanId(subscription.items.data[0]?.price.id),
						billingPeriod: subscription.items.data[0]?.price.recurring?.interval,
						currentPeriodStart: new Date(subscription.current_period_start * 1000),
						currentPeriodEnd: new Date(subscription.current_period_end * 1000),
						trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
						trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
						cancelAtPeriodEnd: subscription.cancel_at_period_end,
						userId: userId
					}
				})
				this.logger.log(`Created subscription record for Stripe subscription ${subscription.id}`)
			}
		} catch (error) {
			this.logger.error('Failed to handle subscription creation:', error)
		}
	}

	private async handleSubscriptionUpdated(subscription: SubscriptionWithPeriods): Promise<void> {
		try {
			this.logger.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`)
			
			// Update existing subscription record
			const updated = await this.prisma.subscription.updateMany({
				where: { stripeSubscriptionId: subscription.id },
				data: {
					status: subscription.status,
					stripePriceId: subscription.items.data[0]?.price.id,
					planId: this.mapStripePriceToPlanId(subscription.items.data[0]?.price.id),
					billingPeriod: subscription.items.data[0]?.price.recurring?.interval,
					currentPeriodStart: new Date(subscription.current_period_start * 1000),
					currentPeriodEnd: new Date(subscription.current_period_end * 1000),
					trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
					trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
					updatedAt: new Date()
				}
			})

			if (updated.count > 0) {
				this.logger.log(`Updated subscription record for Stripe subscription ${subscription.id}`)
			} else {
				this.logger.warn(`No subscription record found for Stripe subscription ${subscription.id}`)
			}
		} catch (error) {
			this.logger.error('Failed to handle subscription update:', error)
		}
	}

	private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
		try {
			this.logger.log(`Payment succeeded: ${paymentIntent.id}, amount: ${paymentIntent.amount}`)
			
			// Record successful payment in database
			if (paymentIntent.customer) {
				// Find related subscription by customer ID
				const subscription = await this.prisma.subscription.findFirst({
					where: { stripeCustomerId: paymentIntent.customer as string }
				})

				if (subscription) {
					// Record the payment as an invoice record
					await this.prisma.invoice.create({
						data: {
							userId: subscription.userId,
							subscriptionId: subscription.id,
							stripeInvoiceId: paymentIntent.id, // Use payment intent ID as fallback
							amountPaid: paymentIntent.amount,
							amountDue: 0, // Paid in full
							currency: paymentIntent.currency,
							status: 'paid',
							invoiceDate: new Date(),
							paidAt: new Date(),
							description: `Payment for subscription ${subscription.stripeSubscriptionId}`
						}
					})
					this.logger.log(`Recorded payment for subscription ${subscription.id}`)
				} else {
					// This might be a one-time payment - log for now
					this.logger.log(`One-time payment recorded: ${paymentIntent.id}`)
				}
			}
		} catch (error) {
			this.logger.error('Failed to handle payment success:', error)
		}
	}

	private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
		try {
			this.logger.log(`Payment failed: ${paymentIntent.id}, amount: ${paymentIntent.amount}`)
			
			// Handle payment failure - record and potentially notify user
			if (paymentIntent.customer) {
				// Find related subscription
				const subscription = await this.prisma.subscription.findFirst({
					where: { stripeCustomerId: paymentIntent.customer as string }
				})

				if (subscription) {
					// Record the failed payment attempt
					await this.prisma.invoice.create({
						data: {
							userId: subscription.userId,
							subscriptionId: subscription.id,
							stripeInvoiceId: paymentIntent.id, // Use payment intent ID as fallback
							amountPaid: 0,
							amountDue: paymentIntent.amount,
							currency: paymentIntent.currency,
							status: 'payment_failed',
							invoiceDate: new Date(),
							description: `Failed payment for subscription ${subscription.stripeSubscriptionId}`
						}
					})

					
					this.logger.warn(`Payment failed for user ${subscription.userId}, subscription ${subscription.id}`)
				}
			}
		} catch (error) {
			this.logger.error('Failed to handle payment failure:', error)
		}
	}

	/**
	 * Map Stripe price ID to internal plan ID
	 */
	private mapStripePriceToPlanId(stripePriceId?: string): string | null {
		if (!stripePriceId) return null
		
		// This mapping should match your Stripe price configuration
		const priceToPlanMapping: Record<string, string> = {
			// Add your actual Stripe price IDs here
			'price_starter_monthly': 'STARTER',
			'price_starter_annual': 'STARTER', 
			'price_growth_monthly': 'GROWTH',
			'price_growth_annual': 'GROWTH',
			'price_enterprise': 'ENTERPRISE'
		}
		
		return priceToPlanMapping[stripePriceId] || null
	}


	// Health check
	isHealthy(): boolean {
		return true
	}
}