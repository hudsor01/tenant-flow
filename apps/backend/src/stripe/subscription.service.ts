import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from './stripe.service'
import type { CreateCheckoutSessionParams, SubscriptionData } from './types/stripe.types'
import { BILLING_PLANS } from '../shared/constants/billing-plans'
import type { PlanType, SubStatus } from '@prisma/client'
import type Stripe from 'stripe'

@Injectable()
export class SubscriptionService {
	private readonly logger = new Logger(SubscriptionService.name)

	constructor(
		private readonly stripeService: StripeService,
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService
	) {}

	async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ url?: string; clientSecret?: string }> {
		const user = await this.prismaService.user.findUnique({
			where: { id: params.userId },
			include: { Subscription: true }
		})

		if (!user) {
			throw new Error('User not found')
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

			// Update subscription with customer ID
			await this.prismaService.subscription.updateMany({
				where: { userId: user.id },
				data: { stripeCustomerId }
			})
		}

		// Get the price ID
		const plan = BILLING_PLANS[params.planType]
		if (!plan) {
			throw new Error('Invalid plan type')
		}

		const priceId = params.billingInterval === 'annual' 
			? plan.stripeAnnualPriceId 
			: plan.stripeMonthlyPriceId

		if (!priceId) {
			throw new Error('Price ID not configured for this plan')
		}

		// Create checkout session
		const session = await this.stripeService.createCheckoutSession({
			customerId: stripeCustomerId,
			priceId,
			mode: 'subscription',
			successUrl: params.successUrl,
			cancelUrl: params.cancelUrl,
			metadata: {
				userId: user.id,
				planType: params.planType
			},
			subscriptionData: {
				trialPeriodDays: params.collectPaymentMethod ? undefined : 14,
				metadata: {
					userId: user.id,
					planType: params.planType
				}
			},
			paymentMethodCollection: params.collectPaymentMethod ? 'always' : 'if_required',
			allowPromotionCodes: true,
			uiMode: params.uiMode
		})

		// Return appropriate response based on ui_mode
		if (params.uiMode === 'embedded') {
			return { clientSecret: session.client_secret || undefined }
		}
		
		return { url: session.url || undefined }
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

	async startFreeTrial(userId: string): Promise<{ url: string }> {
		const user = await this.prismaService.user.findUnique({
			where: { id: userId },
			include: { Subscription: true }
		})

		if (!user) {
			throw new Error('User not found')
		}

		if (user.Subscription?.[0]?.stripeSubscriptionId) {
			throw new Error('User already has a subscription')
		}

		// Create or get Stripe customer
		let stripeCustomerId = user.stripeCustomerId

		if (!stripeCustomerId) {
			const customer = await this.stripeService.createCustomer({
				email: user.email,
				name: user.name || undefined,
				metadata: { userId: user.id }
			})
			stripeCustomerId = customer.id
			
			// Update user with Stripe customer ID
			await this.prismaService.user.update({
				where: { id: userId },
				data: { stripeCustomerId }
			})
		}

		// Get Starter plan price for trial
		const starterPlan = BILLING_PLANS['STARTER']
		const priceId = starterPlan.stripeMonthlyPriceId

		if (!priceId) {
			throw new Error('Starter plan price not configured')
		}

		// Create checkout session following Stripe's exact pattern
		const session = await this.stripeService.createCheckoutSession({
			mode: 'subscription',
			customerId: stripeCustomerId,
			priceId,
			successUrl: `${process.env.FRONTEND_URL}/dashboard?trial=started&session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: `${process.env.FRONTEND_URL}/pricing?trial=cancelled`,
			subscriptionData: {
				trialPeriodDays: 14,
				trialSettings: {
					endBehavior: {
						missingPaymentMethod: 'pause' // Pause instead of cancel for better UX
					}
				},
				metadata: {
					userId: user.id,
					planType: 'STARTER'
				}
			},
			paymentMethodCollection: 'if_required', // Critical: Don't require payment for trial
			metadata: {
				userId: user.id
			}
		})

		if (!session.url) {
			throw new Error('Failed to create checkout session URL')
		}

		return { url: session.url }
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

	async updateSubscriptionPlan(params: {
		userId: string
		newPriceId: string
		prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
		prorationDate?: Date
	}): Promise<void> {
		const subscription = await this.prismaService.subscription.findUnique({
			where: { userId: params.userId }
		})

		if (!subscription?.stripeSubscriptionId) {
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

		// Update subscription with proration handling
		await this.stripeService.updateSubscriptionWithProration(subscription.stripeSubscriptionId, {
			items: [{
				id: subscriptionItemId,
				price: params.newPriceId
			}],
			prorationBehavior: params.prorationBehavior,
			prorationDate: params.prorationDate ? Math.floor(params.prorationDate.getTime() / 1000) : undefined
		})

		// Update local subscription record will be handled by webhook
		this.logger.log(`Subscription plan updated for user ${params.userId}`)
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