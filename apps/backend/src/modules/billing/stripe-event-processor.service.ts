import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter'
import type { SubscriptionStatus } from '@repo/shared/types/auth'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import {
	PaymentFailedEvent,
	PaymentReceivedEvent
} from '../notifications/events/notification.events'
import type {
	InvoiceWithSubscription,
	SubscriptionWithPeriod
} from './stripe-interfaces'

/**
 * Stripe Event Processor Service
 *
 * Handles async processing of Stripe webhook events
 * Uses EventEmitter for decoupled, scalable event handling
 * Follows Stripe's best practices for webhook processing
 */
@Injectable()
export class StripeEventProcessor {
	private readonly logger = new Logger(StripeEventProcessor.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Handle payment intent succeeded events
	 */
	@OnEvent('stripe.payment_intent.succeeded', { async: true })
	async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
		this.logger.log(
			`Processing payment intent succeeded: ${paymentIntent.id}`,
			{
				amount: paymentIntent.amount,
				customer: paymentIntent.customer
			}
		)

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Update user payment status if metadata contains user ID
			if (paymentIntent.metadata?.tenant_id) {
				const { error } = await supabase
					.from('users')
					.update({
						stripeCustomerId: paymentIntent.customer as string,
						lastPaymentDate: new Date().toISOString()
					})
					.eq('id', paymentIntent.metadata.tenant_id)

				if (error) {
					this.logger.error('Failed to update user payment status', {
						error,
						userId: paymentIntent.metadata.tenant_id
					})
				}
			}

			// Emit payment received event for notification system
			if (paymentIntent.metadata?.user_id) {
				this.eventEmitter.emit(
					'payment.received',
					new PaymentReceivedEvent(
						paymentIntent.metadata.user_id,
						paymentIntent.metadata.subscription_id || '',
						paymentIntent.amount,
						paymentIntent.currency,
						'', // invoice URL would be set if available
						`Payment of ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()} received`
					)
				)
			}

			this.logger.log(`Payment intent succeeded processed: ${paymentIntent.id}`)
		} catch (error) {
			this.logger.error('Failed to process payment intent succeeded', {
				paymentIntentId: paymentIntent.id,
				error
			})
			throw error
		}
	}

	/**
	 * Handle payment intent failed events
	 */
	@OnEvent('stripe.payment_intent.payment_failed', { async: true })
	async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
		this.logger.warn(`Processing payment intent failed: ${paymentIntent.id}`, {
			amount: paymentIntent.amount,
			customer: paymentIntent.customer
		})

		try {
			// Emit payment failed event for notification system
			if (paymentIntent.metadata?.user_id) {
				this.eventEmitter.emit(
					'payment.failed',
					new PaymentFailedEvent(
						paymentIntent.metadata.user_id,
						paymentIntent.metadata.subscription_id || '',
						paymentIntent.amount,
						paymentIntent.currency,
						'', // invoice URL would be set if available
						paymentIntent.last_payment_error?.message || 'Payment failed'
					)
				)
			}

			// Log payment failed notification (email functionality removed per NO ABSTRACTIONS)
			if (paymentIntent.metadata?.user_email) {
				this.logger.log('Payment failed notification', {
					email: paymentIntent.metadata.user_email,
					userName: paymentIntent.metadata.user_name,
					amount: paymentIntent.amount,
					currency: paymentIntent.currency,
					retryUrl: this.generateRetryPaymentUrl()
				})
			}

			this.logger.log(`Payment intent failed processed: ${paymentIntent.id}`)
		} catch (error) {
			this.logger.error('Failed to process payment intent failed', {
				paymentIntentId: paymentIntent.id,
				error
			})
			throw error
		}
	}

	/**
	 * Handle setup intent succeeded events
	 */
	@OnEvent('stripe.setup_intent.succeeded', { async: true })
	async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
		this.logger.log(`Processing setup intent succeeded: ${setupIntent.id}`)

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Save payment method for future use
			if (setupIntent.payment_method && setupIntent.metadata?.user_id) {
				const { error } = await supabase.from('payment_method').upsert(
					{
						id: setupIntent.payment_method as string, // Use payment method ID as primary key
						tenantId: setupIntent.metadata.user_id,
						organizationId: setupIntent.metadata.user_id, // Using user_id as organizationId temporarily
						stripePaymentMethodId: setupIntent.payment_method as string,
						type: 'card', // Default to card type
						isDefault: true,
						active: true
					},
					{
						onConflict: 'stripePaymentMethodId'
					}
				)

				if (error) {
					this.logger.error('Failed to save payment method', {
						error,
						setupIntentId: setupIntent.id
					})
				}

				// Log payment method saved notification (email functionality removed per NO ABSTRACTIONS)
				if (setupIntent.metadata?.user_email) {
					this.logger.log('Payment method saved notification', {
						email: setupIntent.metadata.user_email,
						userName: setupIntent.metadata.user_name,
						lastFour: '****', // Would be fetched from payment method
						brand: 'Card' // Would be fetched from payment method
					})
				}
			}

			this.logger.log(`Setup intent succeeded processed: ${setupIntent.id}`)
		} catch (error) {
			this.logger.error('Failed to process setup intent succeeded', {
				setupIntentId: setupIntent.id,
				error
			})
			throw error
		}
	}

	/**
	 * Handle subscription created events
	 */
	@OnEvent('stripe.customer.subscription.created', { async: true })
	async handleSubscriptionCreated(subscription: Stripe.Subscription) {
		this.logger.log(`Processing subscription created: ${subscription.id}`, {
			customer: subscription.customer,
			status: subscription.status
		})

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Get user by Stripe customer ID
			const { data: user } = await supabase
				.from('users')
				.select('id, email, name')
				.eq('stripeCustomerId', subscription.customer as string)
				.single()

			if (!user) {
				this.logger.error('User not found for Stripe customer', {
					customerId: subscription.customer
				})
				return
			}

			// Create or update subscription record
			const upsertData: {
				stripeSubscriptionId: string
				stripeCustomerId: string
				status: SubscriptionStatus
				userId: string
				currentPeriodEnd?: string | null
				cancelAtPeriodEnd: boolean
			} = {
				stripeSubscriptionId: subscription.id,
				stripeCustomerId: subscription.customer as string,
				status: subscription.status.toUpperCase() as SubscriptionStatus,
				userId: user.id,
				cancelAtPeriodEnd: subscription.cancel_at_period_end
			}

			// Only assign currentPeriodEnd if it exists
			const periodEnd = (subscription as SubscriptionWithPeriod)
				.current_period_end
			if (periodEnd) {
				upsertData.currentPeriodEnd = new Date(periodEnd * 1000).toISOString()
			}

			const { error } = await supabase.from('subscription').upsert(upsertData, {
				onConflict: 'stripeSubscriptionId'
			})

			if (error) {
				this.logger.error('Failed to create subscription record', {
					error,
					subscriptionId: subscription.id
				})
			}

			// Log subscription status change in UserAccessLog
			await supabase.from('user_access_log').insert({
				userId: user.id,
				subscriptionStatus: subscription.status.toUpperCase() as
					| 'ACTIVE'
					| 'CANCELED'
					| 'PAST_DUE',
				planType: 'PREMIUM',
				reason: 'Subscription created via Stripe webhook',
				accessGranted: { premium_features: true }
			})

			this.logger.log(`Subscription created processed: ${subscription.id}`)
		} catch (error) {
			this.logger.error('Failed to process subscription created', {
				subscriptionId: subscription.id,
				error
			})
			throw error
		}
	}

	/**
	 * Handle subscription updated events
	 */
	@OnEvent('stripe.customer.subscription.updated', { async: true })
	async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
		this.logger.log(`Processing subscription updated: ${subscription.id}`, {
			customer: subscription.customer,
			status: subscription.status
		})

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Update subscription record
			const updateData: {
				status: SubscriptionStatus
				currentPeriodEnd?: string | null
				cancelAtPeriodEnd: boolean
			} = {
				status: subscription.status.toUpperCase() as SubscriptionStatus,
				cancelAtPeriodEnd: subscription.cancel_at_period_end
			}

			// Only assign currentPeriodEnd if it exists
			const periodEnd = (subscription as SubscriptionWithPeriod)
				.current_period_end
			if (periodEnd) {
				updateData.currentPeriodEnd = new Date(periodEnd * 1000).toISOString()
			}

			const { error } = await supabase
				.from('subscription')
				.update(updateData)
				.eq('stripeSubscriptionId', subscription.id)

			if (error) {
				this.logger.error('Failed to update subscription record', {
					error,
					subscriptionId: subscription.id
				})
			}

			// Update user subscription status
			const { data: subRecord } = await supabase
				.from('subscription')
				.select('userId')
				.eq('stripeSubscriptionId', subscription.id)
				.single()

			if (subRecord) {
				await supabase.from('user_access_log').insert({
					userId: subRecord.userId,
					subscriptionStatus: subscription.status.toUpperCase() as
						| 'ACTIVE'
						| 'CANCELED'
						| 'PAST_DUE',
					planType: ['active', 'trialing'].includes(subscription.status)
						? 'PREMIUM'
						: 'LIMITED',
					reason: 'Subscription updated via Stripe webhook',
					accessGranted: ['active', 'trialing'].includes(subscription.status)
						? { premium_features: true }
						: { basic_features_only: true }
				})
			}

			this.logger.log(`Subscription updated processed: ${subscription.id}`)
		} catch (error) {
			this.logger.error('Failed to process subscription updated', {
				subscriptionId: subscription.id,
				error
			})
			throw error
		}
	}

	/**
	 * Handle subscription deleted events
	 */
	@OnEvent('stripe.customer.subscription.deleted', { async: true })
	async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
		this.logger.log(`Processing subscription deleted: ${subscription.id}`, {
			customer: subscription.customer
		})

		try {
			const supabase = this.supabaseService.getAdminClient()

			// Get user details before updating
			const { data: subRecord } = await supabase
				.from('subscription')
				.select('userId, users!subscription_userId_fkey!inner(email, name)')
				.eq('stripeSubscriptionId', subscription.id)
				.single()

			if (!subRecord) {
				this.logger.warn('Subscription record not found', {
					subscriptionId: subscription.id
				})
				return
			}

			// Update subscription status to CANCELLED
			await supabase
				.from('subscription')
				.update({
					status: 'CANCELED',
					cancelledAt: new Date().toISOString()
				})
				.eq('stripeSubscriptionId', subscription.id)

			// Log subscription cancellation in UserAccessLog
			await supabase.from('user_access_log').insert({
				userId: subRecord.userId,
				subscriptionStatus: 'CANCELED',
				planType: 'NONE',
				reason: 'Subscription cancelled via Stripe webhook',
				accessGranted: {}
			})

			// Log subscription cancelled notification (email functionality removed per NO ABSTRACTIONS)
			const userRecord = (
				subRecord as unknown as {
					userId: string
					users: { email: string; name: string | null } | null
				}
			).users
			if (userRecord?.email) {
				this.logger.log('Subscription cancelled notification', {
					email: userRecord.email,
					userName: userRecord.name || undefined,
					planName: 'TenantFlow Pro', // Would fetch from subscription items
					cancellationDate: new Date()
				})
			}

			this.logger.log(`Subscription deleted processed: ${subscription.id}`)
		} catch (error) {
			this.logger.error('Failed to process subscription deleted', {
				subscriptionId: subscription.id,
				error
			})
			throw error
		}
	}

	/**
	 * Handle invoice payment succeeded events
	 */
	@OnEvent('stripe.invoice.payment_succeeded', { async: true })
	async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
		this.logger.log(`Processing invoice payment succeeded: ${invoice.id}`, {
			customer: invoice.customer,
			amount: invoice.amount_paid
		})

		try {
			// Get user email for receipt
			const user = await this.getUserByStripeCustomerId(
				invoice.customer as string
			)

			if (user?.email) {
				// Log invoice receipt notification (email functionality removed per NO ABSTRACTIONS)
				this.logger.log('Invoice receipt notification', {
					email: user.email,
					userName: user.name || undefined,
					invoiceNumber: invoice.number || null,
					amount: invoice.amount_paid,
					currency: invoice.currency,
					invoiceUrl: invoice.hosted_invoice_url || null
				})
			}

			// Emit payment received event
			if (user) {
				this.eventEmitter.emit(
					'payment.received',
					new PaymentReceivedEvent(
						user.id,
						((invoice as InvoiceWithSubscription).subscription &&
						typeof (invoice as InvoiceWithSubscription).subscription ===
							'string'
							? ((invoice as InvoiceWithSubscription).subscription as string)
							: (
									(invoice as InvoiceWithSubscription).subscription as
										| Stripe.Subscription
										| undefined
								)?.id) || '',
						invoice.amount_paid,
						invoice.currency,
						invoice.hosted_invoice_url || '',
						`Invoice payment of ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()} received`
					)
				)
			}

			this.logger.log(`Invoice payment succeeded processed: ${invoice.id}`)
		} catch (error) {
			this.logger.error('Failed to process invoice payment succeeded', {
				invoiceId: invoice.id,
				error
			})
			throw error
		}
	}

	/**
	 * Handle invoice payment failed events
	 */
	@OnEvent('stripe.invoice.payment_failed', { async: true })
	async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
		this.logger.warn(`Processing invoice payment failed: ${invoice.id}`, {
			customer: invoice.customer,
			attemptCount: invoice.attempt_count
		})

		try {
			const maxRetries = 3
			const currentAttempt = invoice.attempt_count || 0
			const user = await this.getUserByStripeCustomerId(
				invoice.customer as string
			)

			if (!user) {
				this.logger.error('User not found for invoice payment failed', {
					customerId: invoice.customer
				})
				return
			}

			if (currentAttempt < maxRetries) {
				// Log payment failed notification (email functionality removed per NO ABSTRACTIONS)
				if (user.email) {
					this.logger.log('Invoice payment failed notification', {
						email: user.email,
						userName: user.name || undefined,
						attemptNumber: currentAttempt,
						maxRetries,
						nextRetryDate: this.calculateNextRetryDate(currentAttempt),
						updatePaymentMethodUrl: this.generateUpdatePaymentMethodUrl()
					})
				}
			} else {
				// Max retries reached - suspend subscription
				const subscriptionId =
					(invoice as InvoiceWithSubscription).subscription &&
					typeof (invoice as InvoiceWithSubscription).subscription === 'string'
						? ((invoice as InvoiceWithSubscription).subscription as string)
						: (
								(invoice as InvoiceWithSubscription).subscription as
									| Stripe.Subscription
									| undefined
							)?.id
				if (subscriptionId && typeof subscriptionId === 'string') {
					await this.suspendSubscriptionAccess(subscriptionId)

					// Log account suspended notification (email functionality removed per NO ABSTRACTIONS)
					if (user.email) {
						this.logger.log('Account suspended notification', {
							email: user.email,
							userName: user.name || undefined,
							suspensionReason: 'payment_failure'
						})
					}
				}
			}

			// Emit payment failed event
			this.eventEmitter.emit(
				'payment.failed',
				new PaymentFailedEvent(
					user.id,
					((invoice as InvoiceWithSubscription).subscription &&
					typeof (invoice as InvoiceWithSubscription).subscription === 'string'
						? ((invoice as InvoiceWithSubscription).subscription as string)
						: (
								(invoice as InvoiceWithSubscription).subscription as
									| Stripe.Subscription
									| undefined
							)?.id) || '',
					invoice.amount_due,
					invoice.currency,
					invoice.hosted_invoice_url || '',
					`Payment attempt ${currentAttempt} of ${maxRetries} failed`
				)
			)

			this.logger.log(`Invoice payment failed processed: ${invoice.id}`)
		} catch (error) {
			this.logger.error('Failed to process invoice payment failed', {
				invoiceId: invoice.id,
				error
			})
			throw error
		}
	}

	/**
	 * Handle checkout session completed events
	 */
	@OnEvent('stripe.checkout.session.completed', { async: true })
	async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
		this.logger.log(`Processing checkout session completed: ${session.id}`)

		try {
			// Handle subscription checkout
			if (session.mode === 'subscription' && session.subscription) {
				this.logger.log('Checkout completed for subscription', {
					subscriptionId: session.subscription
				})
			}

			// Handle one-time payment checkout
			if (session.mode === 'payment' && session.payment_intent) {
				this.logger.log('Checkout completed for payment', {
					paymentIntentId: session.payment_intent
				})
			}

			this.logger.log(`Checkout session completed processed: ${session.id}`)
		} catch (error) {
			this.logger.error('Failed to process checkout session completed', {
				sessionId: session.id,
				error
			})
			throw error
		}
	}

	/**
	 * Helper: Get user by Stripe customer ID
	 */
	private async getUserByStripeCustomerId(customerId: string) {
		const supabase = this.supabaseService.getAdminClient()
		const { data, error } = await supabase
			.from('users')
			.select('id, email, name')
			.eq('stripeCustomerId', customerId)
			.single()

		if (error || !data) {
			this.logger.warn('User not found for Stripe customer', {
				customerId,
				error
			})
			return null
		}

		return data
	}

	/**
	 * Helper: Calculate next retry date
	 */
	private calculateNextRetryDate(attemptNumber: number): Date {
		const now = new Date()
		// Exponential backoff: 1 day, 3 days, 7 days
		const daysToAdd = Math.pow(2, attemptNumber) - 1
		now.setDate(now.getDate() + daysToAdd)
		return now
	}

	/**
	 * Helper: Generate update payment method URL
	 */
	private generateUpdatePaymentMethodUrl(): string {
		if (!process.env.NEXT_PUBLIC_APP_URL) {
			throw new Error(
				'NEXT_PUBLIC_APP_URL environment variable is required for payment method URLs'
			)
		}
		return `${process.env.NEXT_PUBLIC_APP_URL}/billing/payment-methods`
	}

	/**
	 * Helper: Generate retry payment URL
	 */
	private generateRetryPaymentUrl(): string {
		if (!process.env.NEXT_PUBLIC_APP_URL) {
			throw new Error(
				'NEXT_PUBLIC_APP_URL environment variable is required for retry payment URLs'
			)
		}
		return `${process.env.NEXT_PUBLIC_APP_URL}/billing/retry`
	}

	/**
	 * Helper: Suspend subscription access
	 */
	private async suspendSubscriptionAccess(
		subscriptionId: string
	): Promise<void> {
		const supabase = this.supabaseService.getAdminClient()

		// Update subscription status to SUSPENDED
		const { error } = await supabase
			.from('subscription')
			.update({
				status: 'PAST_DUE',
				suspendedAt: new Date().toISOString()
			})
			.eq('stripeSubscriptionId', subscriptionId)

		if (error) {
			this.logger.error('Failed to suspend subscription', {
				subscriptionId,
				error
			})
		}

		// Update user subscription status
		const { data: subRecord } = await supabase
			.from('subscription')
			.select('userId')
			.eq('stripeSubscriptionId', subscriptionId)
			.single()

		if (subRecord?.userId) {
			await supabase.from('user_access_log').insert({
				userId: subRecord.userId,
				subscriptionStatus: 'PAST_DUE',
				planType: 'LIMITED',
				reason: 'Subscription suspended due to payment failure',
				accessGranted: { basic_features_only: true }
			})
		}
	}
}
