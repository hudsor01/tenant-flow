import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { BILLING_PLANS } from '../shared/constants/billing-plans'
import type { Subscription, PlanType } from '@prisma/client'

export interface Plan {
	id: PlanType
	name: string
	price: number
	propertyLimit: number
	stripeMonthlyPriceId: string | null
	stripeAnnualPriceId: string | null
}

@Injectable()
export class SubscriptionsService {
	private readonly logger = new Logger(SubscriptionsService.name)

	constructor(private readonly prismaService: PrismaService) {}

	async getSubscription(userId: string): Promise<Subscription | null> {
		try {
			const subscription = await this.prismaService.subscription.findUnique({
				where: { userId }
			})

			// If no subscription exists, create a free one
			if (!subscription) {
				return await this.createFreeSubscription(userId)
			}

			return subscription
		} catch (error) {
			this.logger.error('Failed to get subscription', error)
			throw error
		}
	}

	async createFreeSubscription(userId: string): Promise<Subscription> {
		try {
			return await this.prismaService.subscription.create({
				data: {
					userId,
					planType: 'FREE',
					status: 'ACTIVE'
				}
			})
		} catch (error) {
			this.logger.error('Failed to create free subscription', error)
			throw error
		}
	}

	async getAvailablePlans(): Promise<Plan[]> {
		return Object.values(BILLING_PLANS)
			.filter(plan => plan.id !== 'FREE') // Exclude free plan from purchase options
			.map(plan => ({
				id: plan.id as PlanType,
				name: plan.name,
				price: plan.price,
				propertyLimit: plan.propertyLimit,
				stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
				stripeAnnualPriceId: plan.stripeAnnualPriceId
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
		
		const plan = BILLING_PLANS[subscription.planType as keyof typeof BILLING_PLANS]
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
		
		const plan = BILLING_PLANS[subscription.planType as keyof typeof BILLING_PLANS]
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

		const billingPlan = BILLING_PLANS[subscription.planType as keyof typeof BILLING_PLANS]
		if (!billingPlan) {
			return { subscription, plan: null }
		}

		const plan: Plan = {
			id: billingPlan.id as PlanType,
			name: billingPlan.name,
			price: billingPlan.price,
			propertyLimit: billingPlan.propertyLimit,
			stripeMonthlyPriceId: billingPlan.stripeMonthlyPriceId,
			stripeAnnualPriceId: billingPlan.stripeAnnualPriceId
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
		const billingPlan = BILLING_PLANS[planId]
		if (!billingPlan) {
			return null
		}

		return {
			id: billingPlan.id as PlanType,
			name: billingPlan.name,
			price: billingPlan.price,
			propertyLimit: billingPlan.propertyLimit,
			stripeMonthlyPriceId: billingPlan.stripeMonthlyPriceId,
			stripeAnnualPriceId: billingPlan.stripeAnnualPriceId
		}
	}

	async createSubscription(userId: string, planType: PlanType): Promise<Subscription> {
		// This is a placeholder - actual Stripe integration happens in StripeService
		return this.prismaService.subscription.create({
			data: {
				userId,
				planType,
				status: 'ACTIVE'
			}
		})
	}

	async cancelSubscription(userId: string): Promise<Subscription> {
		return this.prismaService.subscription.update({
			where: { userId },
			data: { 
				status: 'CANCELED',
				cancelAtPeriodEnd: true
			}
		})
	}
}