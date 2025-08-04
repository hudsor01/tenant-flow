import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { BILLING_PLANS, getPlanById } from '../shared/constants/billing-plans'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import type { Subscription, PlanType } from '@repo/database'
import type { Plan } from '@repo/shared'



/**
 * SubscriptionsManagerService - Handles local database operations for subscriptions
 * 
 * This service manages subscription data in the local database.
 * For Stripe-specific operations (checkout, payments, etc.), see StripeBillingService.
 * 
 * Responsibilities:
 * - Local subscription CRUD operations
 * - Usage limit calculations
 * - Plan information retrieval
 * - Property count validation
 */
@Injectable()
export class SubscriptionsManagerService {
	private readonly logger = new Logger(SubscriptionsManagerService.name)

	constructor(
		private readonly prismaService: PrismaService,
		private readonly errorHandler: ErrorHandlerService
	) {}

	/**
	 * Get user's subscription, creating a free one if none exists
	 */
	async getSubscription(userId: string): Promise<Subscription | null> {
		try {
			const subscription = await this.prismaService.subscription.findUnique({
				where: { userId }
			})

			// If no subscription exists, create a free one
			if (!subscription) {
				this.logger.debug(`No subscription found for user ${userId}, creating free subscription`)
				return await this.createFreeSubscription(userId)
			}

			return subscription
		} catch (error) {
			this.logger.error(`Failed to get subscription for user ${userId}`, error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'SubscriptionsService.getSubscription',
				resource: 'subscription',
				metadata: { userId }
			})
		}
	}

	/**
	 * Create a free subscription for new users
	 * Note: This only creates a local database record, not a Stripe subscription
	 */
	private async createFreeSubscription(userId: string): Promise<Subscription> {
		try {
			const subscription = await this.prismaService.subscription.create({
				data: {
					userId,
					planType: 'FREE',
					status: 'ACTIVE'
				}
			})

			this.logger.log(`Created free subscription for user ${userId}`)
			return subscription
		} catch (error) {
			this.logger.error(`Failed to create free subscription for user ${userId}`, error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'SubscriptionsService.createFreeSubscription',
				resource: 'subscription',
				metadata: { userId }
			})
		}
	}

	async getAvailablePlans(): Promise<Plan[]> {
		return Object.values(BILLING_PLANS)
			.filter(plan => plan.id !== 'FREE') // Exclude free plan from purchase options
			.map(plan => ({
				id: plan.id as PlanType,
				uiId: plan.id,
				name: plan.name,
				description: `${plan.name} plan with ${plan.propertyLimit === -1 ? 'unlimited' : plan.propertyLimit} properties`,
				price: {
					monthly: plan.price,
					annual: plan.price * 10 // Simplified annual pricing
				},
				features: [
					`${plan.propertyLimit === -1 ? 'Unlimited' : plan.propertyLimit} properties`,
					'Email support',
					plan.id === 'ENTERPRISE' ? 'Priority support' : 'Standard support'
				],
				propertyLimit: plan.propertyLimit,
				storageLimit: plan.id === 'ENTERPRISE' ? -1 : plan.propertyLimit * 10,
				apiCallLimit: plan.id === 'ENTERPRISE' ? -1 : plan.propertyLimit * 1000,
				priority: plan.id === 'ENTERPRISE'
			}))
	}

	async getPropertyCount(userId: string): Promise<number> {
		return this.prismaService.property.count({
			where: { ownerId: userId }
		})
	}

	async canAddProperty(userId: string): Promise<boolean> {
		const subscription = await this.getSubscription(userId)
		if (!subscription) {
			return false
		}

		// Check if subscription is active
		if (!['ACTIVE', 'TRIALING'].includes(subscription.status)) {
			return false
		}

		if (!subscription.planType) {
			return false
		}
		
		const plan = getPlanById(subscription.planType)
		if (!plan) {
			return false
		}

		// Unlimited properties for enterprise
		if (plan.propertyLimit === -1) {
			return true
		}

		const propertyCount = await this.getPropertyCount(userId)
		return propertyCount < plan.propertyLimit
	}

	async getUsageLimits(userId: string): Promise<{
		properties: { used: number; limit: number }
		planName: string
		canUpgrade: boolean
	}> {
		const subscription = await this.getSubscription(userId)
		if (!subscription) {
			throw new Error('No subscription found')
		}

		if (!subscription.planType) {
			throw new Error('No plan type found')
		}
		
		const plan = getPlanById(subscription.planType)
		if (!plan) {
			throw new Error('Invalid plan type')
		}

		const propertyCount = await this.getPropertyCount(userId)

		return {
			properties: {
				used: propertyCount,
				limit: plan.propertyLimit === -1 ? 999 : plan.propertyLimit
			},
			planName: plan.name,
			canUpgrade: subscription.planType !== 'ENTERPRISE'
		}
	}

	async updateSubscriptionStatus(
		userId: string,
		status: Subscription['status']
	): Promise<Subscription> {
		return this.prismaService.subscription.update({
			where: { userId },
			data: { status }
		})
	}

	async getUserSubscriptionWithPlan(userId: string): Promise<{
		subscription: Subscription | null
		plan: Plan | null
	}> {
		const subscription = await this.getSubscription(userId)
		if (!subscription || !subscription.planType) {
			return { subscription, plan: null }
		}

		const billingPlan = getPlanById(subscription.planType)
		if (!billingPlan) {
			return { subscription, plan: null }
		}

		const plan: Plan = {
			id: billingPlan.id as PlanType,
			uiId: billingPlan.id,
			name: billingPlan.name,
			description: `${billingPlan.name} plan with ${billingPlan.propertyLimit === -1 ? 'unlimited' : billingPlan.propertyLimit} properties`,
			price: {
				monthly: billingPlan.price,
				annual: billingPlan.price * 10
			},
			features: [
				`${billingPlan.propertyLimit === -1 ? 'Unlimited' : billingPlan.propertyLimit} properties`,
				'Email support',
				billingPlan.id === 'ENTERPRISE' ? 'Priority support' : 'Standard support'
			],
			propertyLimit: billingPlan.propertyLimit,
			storageLimit: billingPlan.id === 'ENTERPRISE' ? -1 : billingPlan.propertyLimit * 10,
			apiCallLimit: billingPlan.id === 'ENTERPRISE' ? -1 : billingPlan.propertyLimit * 1000,
			priority: billingPlan.id === 'ENTERPRISE'
		}

		return { subscription, plan }
	}

	async calculateUsageMetrics(userId: string): Promise<{
		properties: number
		tenants: number
	}> {
		const [properties, tenants] = await Promise.all([
			this.prismaService.property.count({
				where: { ownerId: userId }
			}),
			this.prismaService.tenant.count({
				where: {
					Lease: {
						some: {
							Unit: {
								Property: {
									ownerId: userId
								}
							}
						}
					}
				}
			})
		])

		return { properties, tenants }
	}

	async getPlanById(planId: PlanType): Promise<Plan | null> {
		const billingPlan = getPlanById(planId)
		if (!billingPlan) {
			return null
		}

		return {
			id: billingPlan.id as PlanType,
			uiId: billingPlan.id,
			name: billingPlan.name,
			description: `${billingPlan.name} plan with ${billingPlan.propertyLimit === -1 ? 'unlimited' : billingPlan.propertyLimit} properties`,
			price: {
				monthly: billingPlan.price,
				annual: billingPlan.price * 10
			},
			features: [
				`${billingPlan.propertyLimit === -1 ? 'Unlimited' : billingPlan.propertyLimit} properties`,
				'Email support',
				billingPlan.id === 'ENTERPRISE' ? 'Priority support' : 'Standard support'
			],
			propertyLimit: billingPlan.propertyLimit,
			storageLimit: billingPlan.id === 'ENTERPRISE' ? -1 : billingPlan.propertyLimit * 10,
			apiCallLimit: billingPlan.id === 'ENTERPRISE' ? -1 : billingPlan.propertyLimit * 1000,
			priority: billingPlan.id === 'ENTERPRISE',
			stripeMonthlyPriceId: billingPlan.stripeMonthlyPriceId,
			stripeAnnualPriceId: billingPlan.stripeAnnualPriceId
		}
	}

	/**
	 * Create or update a subscription record in the database
	 * Used by webhook handlers after Stripe confirms subscription creation
	 */
	async updateSubscriptionFromStripe(
		userId: string,
		planType: PlanType,
		stripeSubscriptionId: string,
		status: Subscription['status'] = 'ACTIVE'
	): Promise<Subscription> {
		try {
			// Upsert to handle both new and existing subscriptions
			const subscription = await this.prismaService.subscription.upsert({
				where: { userId },
				update: {
					planType,
					stripeSubscriptionId,
					status,
					updatedAt: new Date()
				},
				create: {
					userId,
					planType,
					stripeSubscriptionId,
					status
				}
			})

			this.logger.log(`Updated subscription for user ${userId} to plan ${planType}`)
			return subscription
		} catch (error) {
			this.logger.error(`Failed to update subscription from Stripe`, error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'SubscriptionsService.updateSubscriptionFromStripe',
				resource: 'subscription',
				metadata: { userId, planType, stripeSubscriptionId }
			})
		}
	}

	/**
	 * Update subscription cancellation status in the database
	 * Used by webhook handlers after Stripe confirms cancellation
	 */
	async updateSubscriptionCancellation(
		userId: string,
		cancelAtPeriodEnd: boolean,
		canceledAt?: Date
	): Promise<Subscription> {
		try {
			const subscription = await this.prismaService.subscription.update({
				where: { userId },
				data: { 
					status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELED',
					cancelAtPeriodEnd,
					canceledAt,
					updatedAt: new Date()
				}
			})

			this.logger.log(
				`Updated subscription cancellation for user ${userId}: ` +
				`cancelAtPeriodEnd=${cancelAtPeriodEnd}`
			)
			return subscription
		} catch (error) {
			this.logger.error(`Failed to update subscription cancellation`, error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'SubscriptionsService.updateSubscriptionCancellation',
				resource: 'subscription',
				metadata: { userId, cancelAtPeriodEnd: String(cancelAtPeriodEnd) }
			})
		}
	}
}