import { Injectable, Logger } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { SupabaseService } from './supabase.service'
import { UsersService } from '../../users/users.service'
import { CreateSubscriptionDto } from '../dto/create-subscription.dto'

@Injectable()
export class SubscriptionService {
	private readonly logger = new Logger(SubscriptionService.name)

	constructor(
		private stripeService: StripeService,
		private supabaseService: SupabaseService,
		private usersService: UsersService,
	) {}

	async createSubscription(createSubscriptionDto: CreateSubscriptionDto) {
		const { planId, billingPeriod, userId, paymentMethodCollection } = createSubscriptionDto
		const stripe = this.stripeService.getStripeInstance()

		try {
			// Get price ID for the plan
			const priceId = this.stripeService.getPriceId(planId, billingPeriod)

			// Get or create Stripe customer
			const customer = await this.getOrCreateStripeCustomer(userId)

			this.logger.log(`Creating subscription for customer ${customer.id}, plan: ${planId}, period: ${billingPeriod}`)

			// Create subscription based on plan type
			if (planId === 'freeTrial') {
				// For free trial, handle payment method collection based on preference
				if (paymentMethodCollection === 'if_required') {
					// Create subscription without requiring payment method
					const subscription = await stripe.subscriptions.create({
						customer: customer.id,
						items: [{ price: priceId }],
						trial_period_days: 14,
						metadata: {
							userId,
							planId,
							billingPeriod,
							source: 'tenantflow',
							paymentMethodCollection,
						},
					})

					return {
						subscriptionId: subscription.id,
						status: subscription.status,
						trialEnd: subscription.trial_end,
						clientSecret: null,
					}
				} else {
					// Create setup intent to collect payment method for post-trial billing
					const setupIntent = await stripe.setupIntents.create({
						customer: customer.id,
						usage: 'off_session',
						metadata: {
							userId,
							planId,
							billingPeriod,
							source: 'tenantflow',
						},
					})

					// Create subscription that will use the setup intent's payment method
					const subscription = await stripe.subscriptions.create({
						customer: customer.id,
						items: [{ price: priceId }],
						trial_period_days: 14,
						payment_behavior: 'default_incomplete',
						payment_settings: {
							save_default_payment_method: 'on_subscription',
							payment_method_types: ['card'],
						},
						metadata: {
							userId,
							planId,
							billingPeriod,
							source: 'tenantflow',
							setupIntentId: setupIntent.id,
						},
					})

					return {
						subscriptionId: subscription.id,
						status: subscription.status,
						trialEnd: subscription.trial_end,
						clientSecret: setupIntent.client_secret,
						setupIntentId: setupIntent.id,
					}
				}
			} else {
				// For paid plans, create subscription with payment intent
				const subscription = await stripe.subscriptions.create({
					customer: customer.id,
					items: [{ price: priceId }],
					payment_behavior: 'default_incomplete',
					payment_settings: {
						save_default_payment_method: 'on_subscription',
						payment_method_types: ['card'],
					},
					expand: ['latest_invoice.payment_intent'],
					metadata: {
						userId,
						planId,
						billingPeriod,
						source: 'tenantflow',
					},
				})

				this.logger.log(`Created subscription ${subscription.id} with status: ${subscription.status}`)

				// For default_incomplete, we need to ensure the invoice can collect payment
				let paymentIntent = (subscription.latest_invoice as any)?.payment_intent

				if (!paymentIntent && subscription.latest_invoice) {
					// Create a manual payment intent for the invoice amount
					this.logger.log('Creating payment intent for incomplete subscription...')

					try {
						const invoice = subscription.latest_invoice as any

						paymentIntent = await stripe.paymentIntents.create({
							amount: invoice.amount_due,
							currency: invoice.currency || 'usd',
							customer: customer.id,
							payment_method_types: ['card'],
							metadata: {
								subscriptionId: subscription.id,
								invoiceId: invoice.id,
								userId,
								planId,
								billingPeriod,
								source: 'tenantflow',
							},
						})

						this.logger.log(`Created payment intent: ${paymentIntent.id}`)
					} catch (paymentIntentError) {
						this.logger.error('Failed to create payment intent:', paymentIntentError)
						throw new Error('Failed to create payment intent for subscription')
					}
				}

				if (!paymentIntent) {
					throw new Error('Failed to create payment intent for subscription')
				}

				return {
					subscriptionId: subscription.id,
					clientSecret: paymentIntent.client_secret,
					status: subscription.status,
				}
			}
		} catch (error) {
			this.logger.error('Subscription creation failed:', error)

			// Return appropriate error messages
			if (error instanceof Error) {
				if ('type' in error && error.type === 'StripeCardError') {
					throw new Error(error.message)
				} else if ('type' in error && error.type === 'StripeInvalidRequestError') {
					throw new Error('Invalid request to Stripe')
				} else if (error.message?.includes('Invalid plan ID') || error.message?.includes('Invalid billing period')) {
					throw new Error(error.message)
				} else {
					// Temporarily return detailed error for debugging
					const errorType = 'type' in error ? error.type : 'unknown'
					throw new Error(`Subscription creation failed: ${error.message} | Type: ${errorType}`)
				}
			} else {
				throw new Error('Subscription creation failed: Unknown error')
			}
		}
	}

	private async getOrCreateStripeCustomer(userId: string) {
		const stripe = this.stripeService.getStripeInstance()

		// Get user info using Prisma (unified approach)
		const user = await this.usersService.getUserById(userId)
		
		if (!user) {
			throw new Error(`User not found: ${userId}`)
		}

		// First, try to find existing customer in database via subscription
		const subscription = await this.supabaseService.getSubscriptionByUserId(userId)

		// If user already has a subscription with Stripe customer ID, return it
		if (subscription?.stripeCustomerId) {
			try {
				const customer = await stripe.customers.retrieve(subscription.stripeCustomerId)
				return customer
			} catch {
				this.logger.warn(`Stripe customer ${subscription.stripeCustomerId} not found, creating new one`)
			}
		}

		// Create new Stripe customer
		const customer = await stripe.customers.create({
			email: user.email,
			name: user.name || undefined,
			metadata: {
				userId: userId,
				source: 'tenantflow',
			},
		})

		this.logger.log(`Created new Stripe customer: ${customer.id}`)

		return customer
	}
}