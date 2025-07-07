import { Injectable, Logger } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { SupabaseService } from './supabase.service'
import Stripe from 'stripe'

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name)

	constructor(
		private stripeService: StripeService,
		private supabaseService: SupabaseService,
	) {}

	async handleWebhook(event: Stripe.Event) {
		this.logger.log(`Processing webhook event: ${event.type}`)

		try {
			switch (event.type) {
				case 'checkout.session.completed':
					await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
					break

				case 'customer.subscription.created':
				case 'customer.subscription.updated':
					await this.handleSubscriptionChange(event.data.object)
					break

				case 'customer.subscription.deleted':
					await this.handleSubscriptionDeleted(event.data.object)
					break

				case 'payment_intent.succeeded':
					await this.handlePaymentSuccess(event.data.object)
					break

				case 'invoice.payment_succeeded':
					await this.handleInvoicePaymentSucceeded(event.data.object)
					break

				case 'invoice.payment_failed':
					await this.handleInvoicePaymentFailed(event.data.object)
					break

				default:
					this.logger.log(`Unhandled event type: ${event.type}`)
			}
		} catch (error) {
			this.logger.error('Error processing webhook:', error)
			this.logger.error('Error details:', {
				message: (error as any).message,
				stack: (error as any).stack,
				eventType: event.type,
				eventId: event.id,
			})
			throw error
		}
	}

	private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
		this.logger.log('Processing checkout session:', session.id)

		try {
			if (!session.customer) {
				this.logger.log('No customer found in session')
				return
			}

			const metadata = session.metadata || {}
			this.logger.log('Session metadata:', metadata)

			// For subscriptions, handle the subscription creation
			if (session.subscription) {
				this.logger.log('Subscription found in session:', session.subscription)

				// Get the subscription details from Stripe
				const stripe = this.stripeService.getStripeInstance()
				const subscription: any = await stripe.subscriptions.retrieve(session.subscription as string)
				this.logger.log('Retrieved subscription:', subscription.id)

				// Store subscription data using correct schema
				const subscriptionData = {
					userId: metadata.userId || `pending-${session.customer}`,
					plan: metadata.planId || metadata.plan || 'starter',
					status: subscription.status,
					startDate: new Date(subscription.current_period_start * 1000).toISOString(),
					endDate: subscription.cancel_at_period_end
						? new Date(subscription.current_period_end * 1000).toISOString()
						: null,
					stripeCustomerId: session.customer as string,
					stripeSubscriptionId: subscription.id,
					stripePriceId: subscription.items.data[0]?.price.id,
					planId: metadata.planId || metadata.plan,
					billingPeriod: subscription.items.data[0]?.price.recurring?.interval,
					currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
					currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				}

				this.logger.log('Upserting subscription data:', subscriptionData)

				const supabase = this.supabaseService.getClient()
				const { data, error: subError } = await supabase
					.from('Subscription')
					.upsert(subscriptionData, {
						onConflict: 'stripeSubscriptionId',
					})

				if (subError) {
					this.logger.error('Error creating subscription record:', subError)
					throw subError
				} else {
					this.logger.log('Successfully stored subscription:', data)
				}
			}

			// Handle one-time payments
			if (session.payment_intent && !session.subscription) {
				this.logger.log('One-time payment completed:', session.payment_intent)
				// Handle one-time payments if needed
			}
		} catch (error) {
			this.logger.error('Error in checkout completion:', error)
			throw error
		}
	}

	private async handleSubscriptionChange(subscription: any) {
		this.logger.log('Processing subscription change:', subscription.id)

		try {
			const supabase = this.supabaseService.getClient()
			const { data, error } = await supabase
				.from('Subscription')
				.update({
					status: subscription.status,
					endDate: subscription.cancel_at_period_end
						? new Date(subscription.current_period_end * 1000).toISOString()
						: null,
					cancelledAt: subscription.status === 'canceled' ? new Date().toISOString() : null,
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
					currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
					updatedAt: new Date().toISOString(),
				})
				.eq('stripeSubscriptionId', subscription.id)

			if (error) {
				this.logger.error('Error updating subscription:', error)
				throw error
			} else {
				this.logger.log('Successfully updated subscription:', subscription.id)
			}
		} catch (error) {
			this.logger.error('Error in subscription change:', error)
			throw error
		}
	}

	private async handleSubscriptionDeleted(subscription: any) {
		this.logger.log('Processing subscription deletion:', subscription.id)

		try {
			const supabase = this.supabaseService.getClient()
			const { data, error } = await supabase
				.from('Subscription')
				.update({
					status: 'canceled',
					cancelledAt: new Date().toISOString(),
					cancelAtPeriodEnd: true,
					updatedAt: new Date().toISOString(),
				})
				.eq('stripeSubscriptionId', subscription.id)

			if (error) {
				this.logger.error('Error canceling subscription:', error)
				throw error
			} else {
				this.logger.log('Successfully canceled subscription:', subscription.id)
			}
		} catch (error) {
			this.logger.error('Error in subscription deletion:', error)
			throw error
		}
	}

	private async handlePaymentSuccess(paymentIntent: any) {
		this.logger.log('Processing payment success:', paymentIntent.id)

		try {
			const metadata = paymentIntent.metadata

			// Handle rent payments
			if (metadata.leaseId && metadata.rentAmount) {
				const supabase = this.supabaseService.getClient()
				const { data, error } = await supabase.from('Payment').insert({
					leaseId: metadata.leaseId,
					amount: parseFloat(metadata.rentAmount),
					date: new Date().toISOString(),
					type: 'RENT',
					stripePaymentIntentId: paymentIntent.id,
					status: 'COMPLETED',
					processingFee: parseFloat(metadata.processingFee || '0'),
					notes: `Rent payment via Stripe - Processing fee: $${metadata.processingFee || '0'}`,
				})

				if (error) {
					this.logger.error('Error recording payment:', error)
					throw error
				} else {
					this.logger.log('Successfully recorded rent payment:', paymentIntent.id)
				}
			}
		} catch (error) {
			this.logger.error('Error in payment success:', error)
			throw error
		}
	}

	private async handleInvoicePaymentSucceeded(invoice: any) {
		this.logger.log('Processing invoice payment succeeded:', invoice.id)

		try {
			// Update subscription if this is a subscription invoice
			if (invoice.subscription) {
				const supabase = this.supabaseService.getClient()
				const { data, error } = await supabase
					.from('Subscription')
					.update({
						status: 'active',
						currentPeriodStart: new Date(invoice.period_start * 1000).toISOString(),
						currentPeriodEnd: new Date(invoice.period_end * 1000).toISOString(),
						updatedAt: new Date().toISOString(),
					})
					.eq('stripeSubscriptionId', invoice.subscription as string)

				if (error) {
					this.logger.error('Error updating subscription after invoice payment:', error)
					throw error
				} else {
					this.logger.log('Successfully updated subscription after invoice payment')
				}
			}
		} catch (error) {
			this.logger.error('Error in invoice payment succeeded:', error)
			throw error
		}
	}

	private async handleInvoicePaymentFailed(invoice: any) {
		this.logger.log('Processing invoice payment failed:', invoice.id)

		try {
			// Update subscription status if payment failed
			if (invoice.subscription) {
				const supabase = this.supabaseService.getClient()
				const { data, error } = await supabase
					.from('Subscription')
					.update({
						status: 'past_due',
						updatedAt: new Date().toISOString(),
					})
					.eq('stripeSubscriptionId', invoice.subscription as string)

				if (error) {
					this.logger.error('Error updating subscription after failed payment:', error)
					throw error
				} else {
					this.logger.log('Successfully marked subscription as past due')
				}
			}
		} catch (error) {
			this.logger.error('Error in invoice payment failed:', error)
			throw error
		}
	}
}