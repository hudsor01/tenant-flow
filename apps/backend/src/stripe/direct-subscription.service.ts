import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from './stripe.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import type Stripe from 'stripe'

/**
 * DirectSubscriptionService - Implements direct subscription creation pattern from Stripe samples
 * 
 * This provides an alternative to checkout sessions with more control over the subscription flow.
 * Based on: https://github.com/stripe-samples/subscription-use-cases/tree/main/fixed-price-subscriptions
 */
@Injectable()
export class DirectSubscriptionService {
	private readonly logger = new Logger(DirectSubscriptionService.name)

	constructor(
		private readonly stripeService: StripeService,
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
		private readonly errorHandler: ErrorHandlerService
	) {}

	/**
	 * Create a subscription directly without checkout session
	 * Returns client secret for payment confirmation on frontend
	 */
	async createDirectSubscription(params: {
		userId: string
		priceId: string
		paymentMethodId?: string
	}): Promise<{
		subscriptionId: string
		clientSecret?: string
		status: string
	}> {
		try {
			// Get user and ensure they have a Stripe customer
			const user = await this.prismaService.user.findUnique({
				where: { id: params.userId },
				include: { Subscription: true }
			})

			if (!user) {
				throw this.errorHandler.createNotFoundError('User', params.userId)
			}

			// Get or create Stripe customer
			let customerId = user.Subscription?.[0]?.stripeCustomerId
			
			if (!customerId) {
				const customer = await this.stripeService.createCustomer({
					email: user.email,
					name: user.name || undefined,
					metadata: { userId: user.id }
				})
				customerId = customer.id

				// Update subscription record with customer ID
				await this.prismaService.subscription.upsert({
					where: { userId: user.id },
					update: { stripeCustomerId: customerId },
					create: {
						userId: user.id,
						stripeCustomerId: customerId,
						planType: 'FREE',
						status: 'ACTIVE'
					}
				})
			}

			// Create subscription with payment_behavior: 'default_incomplete'
			const subscription = await this.stripeService.client.subscriptions.create({
				customer: customerId,
				items: [{ price: params.priceId }],
				payment_behavior: 'default_incomplete',
				payment_settings: {
					save_default_payment_method: 'on_subscription'
				},
				expand: ['latest_invoice.payment_intent'],
				metadata: {
					userId: user.id
				}
			})

			// Get the client secret from the payment intent
			const invoice = subscription.latest_invoice as Stripe.Invoice | null
			let clientSecret: string | undefined
			
			if (invoice && 'payment_intent' in invoice) {
				const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | string | null
				if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
					clientSecret = paymentIntent.client_secret || undefined
				}
			}

			this.logger.log(`Created direct subscription ${subscription.id} for user ${user.id}`)

			return {
				subscriptionId: subscription.id,
				clientSecret,
				status: subscription.status
			}
		} catch (error) {
			this.logger.error('Failed to create direct subscription', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'DirectSubscriptionService.createDirectSubscription',
				resource: 'subscription',
				metadata: { userId: params.userId, priceId: params.priceId }
			})
		}
	}

	/**
	 * Update subscription with new price (plan change)
	 */
	async updateSubscription(params: {
		subscriptionId: string
		newPriceId: string
	}): Promise<{
		subscriptionId: string
		invoiceId?: string
		clientSecret?: string
	}> {
		try {
			// Get current subscription
			const subscription = await this.stripeService.client.subscriptions.retrieve(
				params.subscriptionId,
				{ expand: ['items'] }
			)

			if (!subscription) {
				throw this.errorHandler.createNotFoundError('Subscription', params.subscriptionId)
			}

			// Update subscription item with new price
			const subscriptionItem = subscription.items.data[0]
			if (!subscriptionItem) {
				throw new Error('No subscription items found')
			}

			const updatedSubscription = await this.stripeService.client.subscriptions.update(
				params.subscriptionId,
				{
					items: [
						{
							id: subscriptionItem.id,
							price: params.newPriceId
						}
					],
					proration_behavior: 'create_prorations',
					expand: ['latest_invoice.payment_intent']
				}
			)

			// Check if payment is required for the update
			const invoice = updatedSubscription.latest_invoice as Stripe.Invoice | null
			let clientSecret: string | undefined
			
			if (invoice && 'payment_intent' in invoice) {
				const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | string | null
				if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
					clientSecret = paymentIntent.client_secret || undefined
				}
			}

			this.logger.log(`Updated subscription ${params.subscriptionId} to price ${params.newPriceId}`)

			return {
				subscriptionId: updatedSubscription.id,
				invoiceId: invoice?.id,
				clientSecret
			}
		} catch (error) {
			this.logger.error('Failed to update subscription', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'DirectSubscriptionService.updateSubscription',
				resource: 'subscription',
				metadata: { 
					subscriptionId: params.subscriptionId, 
					newPriceId: params.newPriceId 
				}
			})
		}
	}

	/**
	 * Preview subscription update (for displaying prorated amounts)
	 */
	async previewSubscriptionUpdate(params: {
		subscriptionId: string
		newPriceId: string
	}): Promise<{
		proratedAmount: number
		immediatePayment: number
		nextInvoiceAmount: number
	}> {
		try {
			const subscription = await this.stripeService.client.subscriptions.retrieve(
				params.subscriptionId
			)

			// Get subscription item
			const subscriptionItem = subscription.items.data[0]
			if (!subscriptionItem) {
				throw new Error('No subscription items found')
			}

			// Create preview of upcoming invoice
			const upcomingInvoice = await this.stripeService.createPreviewInvoice({
				customerId: subscription.customer as string,
				subscriptionId: params.subscriptionId,
				subscriptionItems: [
					{
						id: subscriptionItem.id,
						price: params.newPriceId
					}
				]
			})

			// Calculate prorated amounts
			const proratedAmount = upcomingInvoice.lines.data
				.filter((line: Stripe.InvoiceLineItem) => {
					// Check if line has proration property
					return 'proration' in line && line.proration === true
				})
				.reduce((sum: number, line: Stripe.InvoiceLineItem) => sum + line.amount, 0)

			return {
				proratedAmount: proratedAmount / 100, // Convert from cents
				immediatePayment: upcomingInvoice.amount_due / 100,
				nextInvoiceAmount: upcomingInvoice.total / 100
			}
		} catch (error) {
			this.logger.error('Failed to preview subscription update', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'DirectSubscriptionService.previewSubscriptionUpdate',
				resource: 'subscription',
				metadata: { 
					subscriptionId: params.subscriptionId, 
					newPriceId: params.newPriceId 
				}
			})
		}
	}

	/**
	 * Cancel subscription immediately or at period end
	 */
	async cancelSubscription(params: {
		subscriptionId: string
		cancelAtPeriodEnd?: boolean
	}): Promise<{
		subscriptionId: string
		status: string
		cancelAt?: number
	}> {
		try {
			let canceledSubscription: Stripe.Subscription

			if (params.cancelAtPeriodEnd) {
				// Cancel at period end
				canceledSubscription = await this.stripeService.client.subscriptions.update(
					params.subscriptionId,
					{ cancel_at_period_end: true }
				)
			} else {
				// Cancel immediately
				canceledSubscription = await this.stripeService.client.subscriptions.cancel(
					params.subscriptionId
				)
			}

			this.logger.log(
				`Canceled subscription ${params.subscriptionId} ` +
				`${params.cancelAtPeriodEnd ? 'at period end' : 'immediately'}`
			)

			return {
				subscriptionId: canceledSubscription.id,
				status: canceledSubscription.status,
				cancelAt: canceledSubscription.cancel_at || undefined
			}
		} catch (error) {
			this.logger.error('Failed to cancel subscription', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'DirectSubscriptionService.cancelSubscription',
				resource: 'subscription',
				metadata: { 
					subscriptionId: params.subscriptionId,
					cancelAtPeriodEnd: String(params.cancelAtPeriodEnd)
				}
			})
		}
	}

	/**
	 * Reactivate a canceled subscription (if still within period)
	 */
	async reactivateSubscription(subscriptionId: string): Promise<{
		subscriptionId: string
		status: string
	}> {
		try {
			const reactivatedSubscription = await this.stripeService.client.subscriptions.update(
				subscriptionId,
				{ cancel_at_period_end: false }
			)

			this.logger.log(`Reactivated subscription ${subscriptionId}`)

			return {
				subscriptionId: reactivatedSubscription.id,
				status: reactivatedSubscription.status
			}
		} catch (error) {
			this.logger.error('Failed to reactivate subscription', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'DirectSubscriptionService.reactivateSubscription',
				resource: 'subscription',
				metadata: { subscriptionId }
			})
		}
	}

	/**
	 * Attach payment method and set as default
	 */
	async attachPaymentMethod(params: {
		customerId: string
		paymentMethodId: string
		setAsDefault?: boolean
	}): Promise<void> {
		try {
			// Attach payment method to customer
			await this.stripeService.client.paymentMethods.attach(
				params.paymentMethodId,
				{ customer: params.customerId }
			)

			// Set as default if requested
			if (params.setAsDefault) {
				await this.stripeService.client.customers.update(
					params.customerId,
					{
						invoice_settings: {
							default_payment_method: params.paymentMethodId
						}
					}
				)
			}

			this.logger.log(
				`Attached payment method ${params.paymentMethodId} to customer ${params.customerId}`
			)
		} catch (error) {
			this.logger.error('Failed to attach payment method', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'DirectSubscriptionService.attachPaymentMethod',
				resource: 'payment_method',
				metadata: { 
					customerId: params.customerId,
					paymentMethodId: params.paymentMethodId
				}
			})
		}
	}
}