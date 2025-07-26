import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from './stripe.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import type { CreateCheckoutSessionParams } from '@tenantflow/types-core'
import { BILLING_PLANS, getPlanById } from '../shared/constants/billing-plans'
import type { PlanType, SubStatus } from '@prisma/client'
import type Stripe from 'stripe'

/**
 * SubscriptionService - Direct subscription creation following Stripe sample pattern
 * Based on: https://github.com/stripe-samples/subscription-use-cases/tree/main/fixed-price-subscriptions
 */
@Injectable()
export class SubscriptionService {
	private readonly logger = new Logger(SubscriptionService.name)

	constructor(
		private readonly stripeService: StripeService,
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
		private readonly errorHandler: ErrorHandlerService
	) {}

	/**
	 * Create subscription directly (replacing checkout session approach)
	 * Uses payment_behavior: 'default_incomplete' pattern from Stripe sample
	 */
	async createSubscription(params: {
		userId: string
		planType: PlanType
		billingInterval: 'monthly' | 'annual'
		paymentMethodId?: string
	}): Promise<{ 
		subscriptionId: string
		clientSecret?: string
		status: string
	}> {
		try {
			const user = await this.prismaService.user.findUnique({
				where: { id: params.userId },
				include: { Subscription: true }
			})

			if (!user) {
				throw this.errorHandler.createNotFoundError('User', params.userId)
			}

			// Get or create Stripe customer
			let stripeCustomerId = user.Subscription?.[0]?.stripeCustomerId

			if (!stripeCustomerId) {
				const customer = await this.stripeService.createCustomer({
					email: user.email,
					name: user.name || undefined,
					metadata: { userId: user.id }
				})
				stripeCustomerId = customer.id

				// Create or update subscription record
				await this.prismaService.subscription.upsert({
					where: { userId: user.id },
					update: { stripeCustomerId },
					create: {
						userId: user.id,
						stripeCustomerId,
						planType: 'FREE',
						status: 'ACTIVE'
					}
				})
			}

			// Get the price ID
			const plan = getPlanById(params.planType)
			if (!plan) {
				throw new Error('Invalid plan type')
			}

			const priceId = params.billingInterval === 'annual' 
				? plan.stripeAnnualPriceId 
				: plan.stripeMonthlyPriceId

			if (!priceId) {
				throw new Error('Price ID not configured for this plan')
			}

			// Create subscription with payment_behavior: 'default_incomplete'
			const subscription = await this.stripeService.client.subscriptions.create({
				customer: stripeCustomerId,
				items: [{ price: priceId }],
				payment_behavior: 'default_incomplete',
				payment_settings: {
					save_default_payment_method: 'on_subscription'
				},
				expand: ['latest_invoice.payment_intent'],
				metadata: {
					userId: user.id,
					planType: params.planType
				}
			})

			// Get client secret from payment intent if payment is required
			let clientSecret: string | undefined
			const invoice = subscription.latest_invoice as Stripe.Invoice | null
			
			if (invoice && 'payment_intent' in invoice) {
				const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | string | null
				if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
					clientSecret = paymentIntent.client_secret || undefined
				}
			}

			this.logger.log(`Created subscription ${subscription.id} for user ${user.id}`)

			return {
				subscriptionId: subscription.id,
				clientSecret,
				status: subscription.status
			}
		} catch (error) {
			this.logger.error('Failed to create subscription', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'SubscriptionService.createSubscription',
				resource: 'subscription',
				metadata: { userId: params.userId, planType: params.planType }
			})
		}
	}

	/**
	 * Legacy method - kept for compatibility but delegates to createSubscription
	 * @deprecated Use createSubscription instead
	 */
	async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ url?: string; clientSecret?: string }> {
		this.logger.warn('createCheckoutSession is deprecated, using createSubscription instead')
		
		const result = await this.createSubscription({
			userId: params.userId,
			planType: params.planType,
			billingInterval: params.billingInterval === 'annual' ? 'annual' : 'monthly'
		})

		// For compatibility, return clientSecret if UI mode is embedded
		if (params.uiMode === 'embedded') {
			return { clientSecret: result.clientSecret }
		}

		// For hosted mode, create a portal session URL instead
		if (result.subscriptionId) {
			const portalUrl = await this.createPortalSession(params.userId, params.successUrl || '/billing')
			return { url: portalUrl }
		}

		return {}
	}

	async createPortalSession(userId: string, returnUrl: string): Promise<string> {
		const subscription = await this.prismaService.subscription.findUnique({
			where: { userId }
		})

		if (!subscription?.stripeCustomerId) {
			throw new Error('No Stripe customer found')
		}

		const session = await this.stripeService.createPortalSession({
			customerId: subscription.stripeCustomerId,
			returnUrl
		})

		return session.url
	}

	/**
	 * Start free trial using direct subscription creation
	 * Creates subscription with trial_period_days
	 */
	async startFreeTrial(userId: string): Promise<{ 
		subscriptionId: string
		status: string
		trialEnd: Date
	}> {
		try {
			const user = await this.prismaService.user.findUnique({
				where: { id: userId },
				include: { Subscription: true }
			})

			if (!user) {
				throw this.errorHandler.createNotFoundError('User', userId)
			}

			if (user.Subscription?.[0]?.stripeSubscriptionId) {
				throw new Error('User already has a subscription')
			}

			// Create or get Stripe customer
			let stripeCustomerId = user.Subscription?.[0]?.stripeCustomerId

			if (!stripeCustomerId) {
				const customer = await this.stripeService.createCustomer({
					email: user.email,
					name: user.name || undefined,
					metadata: { userId: user.id }
				})
				stripeCustomerId = customer.id

				// Create subscription record
				await this.prismaService.subscription.create({
					data: {
						userId: user.id,
						stripeCustomerId,
						planType: 'FREE',
						status: 'ACTIVE'
					}
				})
			}

			// Get Starter plan price for trial
			const starterPlan = getPlanById('STARTER')
			if (!starterPlan) {
				throw new Error('Starter plan not found')
			}
			const priceId = starterPlan.stripeMonthlyPriceId

			if (!priceId) {
				throw new Error('Starter plan price not configured')
			}

			// Create subscription with trial period
			const subscription = await this.stripeService.client.subscriptions.create({
				customer: stripeCustomerId,
				items: [{ price: priceId }],
				trial_period_days: 14,
				payment_settings: {
					save_default_payment_method: 'on_subscription'
				},
				trial_settings: {
					end_behavior: {
						missing_payment_method: 'pause' // Pause instead of cancel for better UX
					}
				},
				metadata: {
					userId: user.id,
					planType: 'STARTER'
				}
			})

			this.logger.log(`Created trial subscription ${subscription.id} for user ${user.id}`)

			return {
				subscriptionId: subscription.id,
				status: subscription.status,
				trialEnd: new Date(subscription.trial_end! * 1000)
			}
		} catch (error) {
			this.logger.error('Failed to start free trial', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'SubscriptionService.startFreeTrial',
				resource: 'subscription',
				metadata: { userId }
			})
		}
	}

	async syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> {
		// Find user by customer ID
		const subscription = await this.prismaService.subscription.findFirst({
			where: { stripeCustomerId: stripeSubscription.customer as string }
		})

		if (!subscription) {
			this.logger.warn(`No subscription found for customer ${stripeSubscription.customer}`)
			return
		}

		// Map Stripe status to our status
		const status = this.mapStripeStatus(stripeSubscription.status)

		// Determine plan type from price ID
		const priceId = stripeSubscription.items.data[0]?.price.id
		const planType = priceId ? this.getPlanTypeFromPriceId(priceId) : subscription.planType

		// Update subscription
		// Get current period from the first subscription item
		const subscriptionItem = stripeSubscription.items.data[0]
		const currentPeriodEnd = subscriptionItem ? new Date(subscriptionItem.current_period_end * 1000) : null
		
		await this.prismaService.subscription.update({
			where: { id: subscription.id },
			data: {
				stripeSubscriptionId: stripeSubscription.id,
				status,
				planType,
				trialEnd: stripeSubscription.trial_end 
					? new Date(stripeSubscription.trial_end * 1000) 
					: null,
				currentPeriodEnd,
				cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
			}
		})
	}

	async handleSubscriptionDeleted(stripeSubscriptionId: string): Promise<void> {
		await this.prismaService.subscription.update({
			where: { stripeSubscriptionId },
			data: {
				status: 'CANCELED',
				cancelAtPeriodEnd: false
			}
		})
	}

	private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubStatus {
		// Map Stripe statuses to our limited SubStatus enum
		const statusMap: Record<Stripe.Subscription.Status, SubStatus> = {
			trialing: 'ACTIVE',  // Trials are considered active
			active: 'ACTIVE',
			past_due: 'PAST_DUE',
			canceled: 'CANCELED',
			unpaid: 'PAST_DUE',  // Unpaid is treated as past due
			incomplete: 'ACTIVE',  // Incomplete subscriptions might become active
			incomplete_expired: 'CANCELED',
			paused: 'ACTIVE'  // Paused subscriptions are still active
		}

		return statusMap[stripeStatus] || 'CANCELED'
	}

	async previewSubscriptionChange(params: {
		userId: string
		newPriceId: string
		prorationDate?: Date
	}): Promise<Stripe.Invoice> {
		const subscription = await this.prismaService.subscription.findUnique({
			where: { userId: params.userId }
		})

		if (!subscription?.stripeSubscriptionId || !subscription.stripeCustomerId) {
			throw new Error('No active subscription found')
		}

		// Get current subscription to find the subscription item ID
		const stripeSubscription = await this.stripeService.getSubscription(subscription.stripeSubscriptionId)
		if (!stripeSubscription) {
			throw new Error('Subscription not found in Stripe')
		}

		const subscriptionItemId = stripeSubscription.items.data[0]?.id
		if (!subscriptionItemId) {
			throw new Error('No subscription items found')
		}

		return this.stripeService.createPreviewInvoice({
			customerId: subscription.stripeCustomerId,
			subscriptionId: subscription.stripeSubscriptionId,
			subscriptionItems: [{
				id: subscriptionItemId,
				price: params.newPriceId
			}],
			subscriptionProrationDate: params.prorationDate ? Math.floor(params.prorationDate.getTime() / 1000) : undefined
		})
	}

	/**
	 * Update subscription plan with direct API (following Stripe sample)
	 */
	async updateSubscriptionPlan(params: {
		userId: string
		newPriceId: string
		prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
	}): Promise<{
		subscriptionId: string
		clientSecret?: string
	}> {
		try {
			const subscription = await this.prismaService.subscription.findUnique({
				where: { userId: params.userId }
			})

			if (!subscription?.stripeSubscriptionId) {
				throw new Error('No active subscription found')
			}

			// Get current subscription
			const stripeSubscription = await this.stripeService.client.subscriptions.retrieve(
				subscription.stripeSubscriptionId,
				{ expand: ['items', 'latest_invoice.payment_intent'] }
			)

			const subscriptionItemId = stripeSubscription.items.data[0]?.id
			if (!subscriptionItemId) {
				throw new Error('No subscription items found')
			}

			// Update subscription
			const updatedSubscription = await this.stripeService.client.subscriptions.update(
				subscription.stripeSubscriptionId,
				{
					items: [{
						id: subscriptionItemId,
						price: params.newPriceId
					}],
					proration_behavior: params.prorationBehavior || 'create_prorations',
					expand: ['latest_invoice.payment_intent']
				}
			)

			// Check if payment is required for proration
			const invoice = updatedSubscription.latest_invoice as Stripe.Invoice | null
			let clientSecret: string | undefined
			
			if (invoice && 'payment_intent' in invoice) {
				const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | string | null
				if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
					clientSecret = paymentIntent.client_secret || undefined
				}
			}

			this.logger.log(`Updated subscription ${subscription.stripeSubscriptionId} for user ${params.userId}`)

			return {
				subscriptionId: updatedSubscription.id,
				clientSecret
			}
		} catch (error) {
			this.logger.error('Failed to update subscription plan', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'SubscriptionService.updateSubscriptionPlan',
				resource: 'subscription',
				metadata: { userId: params.userId, newPriceId: params.newPriceId }
			})
		}
	}

	/**
	 * Cancel subscription (following Stripe sample pattern)
	 */
	async cancelSubscription(params: {
		userId: string
		cancelAtPeriodEnd?: boolean
	}): Promise<{
		subscriptionId: string
		status: string
		cancelAt?: number
	}> {
		try {
			const subscription = await this.prismaService.subscription.findUnique({
				where: { userId: params.userId }
			})

			if (!subscription?.stripeSubscriptionId) {
				throw new Error('No active subscription found')
			}

			let canceledSubscription: Stripe.Subscription

			if (params.cancelAtPeriodEnd) {
				// Cancel at period end
				canceledSubscription = await this.stripeService.client.subscriptions.update(
					subscription.stripeSubscriptionId,
					{ cancel_at_period_end: true }
				)
			} else {
				// Cancel immediately
				canceledSubscription = await this.stripeService.client.subscriptions.cancel(
					subscription.stripeSubscriptionId
				)
			}

			this.logger.log(
				`Canceled subscription ${subscription.stripeSubscriptionId} ` +
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
				operation: 'SubscriptionService.cancelSubscription',
				resource: 'subscription',
				metadata: { userId: params.userId }
			})
		}
	}

	private getPlanTypeFromPriceId(priceId: string): PlanType | null {
		for (const [planType, plan] of Object.entries(BILLING_PLANS)) {
			if (plan.stripeMonthlyPriceId === priceId || plan.stripeAnnualPriceId === priceId) {
				return planType as PlanType
			}
		}
		return null
	}
}