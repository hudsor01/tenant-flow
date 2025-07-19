import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ResponseUtil, ApiResponse } from '../common/response.util'
import type { Subscription } from '@prisma/client'

export type PlanId = 'FREE' | 'GROWTH'
export type BillingPeriod = 'MONTHLY' | 'ANNUAL'

export interface Plan {
	id: PlanId
	name: string
	description: string
	price: number
	billingPeriod: BillingPeriod
	features: string[]
	limits: {
		properties: number
		tenants: number
		storage: number
	}
	stripeMonthlyPriceId: string | null
	stripeAnnualPriceId: string | null
}

export interface SubscriptionWithPlan extends Subscription {
	plan: Plan
	limitsExceeded: string[]
	usage: { properties: number; tenants: number; limit: number; planName: string; };
}

/**
 * Simplified Subscription Service for MVP
 * Basic CRUD operations only, no complex billing logic for 0 users
 */
@Injectable()
export class SubscriptionsService {
	private readonly logger = new Logger(SubscriptionsService.name)

	constructor(private prisma: PrismaService) {}

	// Available plans configuration
	private readonly plans: Plan[] = [
		{
			id: 'FREE',
			name: 'Free',
			description: 'Basic property management',
			price: 0,
			billingPeriod: 'MONTHLY',
			features: ['Up to 3 properties', 'Basic tenant management', 'Document storage'],
			limits: { properties: 3, tenants: 5, storage: 10 },
			stripeMonthlyPriceId: null,
			stripeAnnualPriceId: null,
		},
		{
			id: 'GROWTH',
			name: 'Growth',
			description: 'Advanced property management',
			price: 29,
			billingPeriod: 'MONTHLY',
			features: ['Up to 50 properties', 'Advanced analytics', 'Priority support'],
			limits: { properties: 50, tenants: 100, storage: 500 },
			stripeMonthlyPriceId: 'price_monthly_growth',
			stripeAnnualPriceId: 'price_annual_growth',
		}
	]

	// Create a basic subscription record
	async create(params: {
		userId: string
		planId: string
		billingPeriod?: string
		status?: string
		stripeSubscriptionId?: string
		stripeCustomerId?: string
	}): Promise<ApiResponse<Subscription | null>> {
		try {
			const subscription = await this.prisma.subscription.create({
				data: {
					userId: params.userId,
					planId: params.planId,
					status: params.status || 'ACTIVE',
					stripeSubscriptionId: params.stripeSubscriptionId,
					stripeCustomerId: params.stripeCustomerId,
					billingPeriod: params.billingPeriod || 'MONTHLY', // Default to monthly
					startDate: new Date(),
					endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
				}
			})

			this.logger.log(`Created subscription ${subscription.id} for user ${params.userId}`)
			
			return ResponseUtil.success(subscription)
		} catch (error: unknown) {
			this.logger.error('Failed to create subscription:', error)
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
			const errorStack = error instanceof Error ? error.stack : undefined
			return ResponseUtil.error(errorMessage, errorStack || '')
		}
	}

	// Get user's subscription
	async getUserSubscription(userId: string): Promise<ApiResponse<Subscription | null>> {
		try {
			const subscription = await this.prisma.subscription.findFirst({
				where: { userId },
				orderBy: { createdAt: 'desc' }

			})

			if (!subscription) {
				return ResponseUtil.success(null)
			}

			return ResponseUtil.success(subscription)
		} catch (error: unknown) {
			this.logger.error('Failed to get subscription:', error)
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
			const errorStack = error instanceof Error ? error.stack : undefined
			return ResponseUtil.error(errorMessage, errorStack || '')
		}
	}

	// Update subscription
	async update(subscriptionId: string, updates: {
		status?: string
		planId?: string
		endDate?: Date
	}): Promise<ApiResponse<Subscription | null>> {
		try {
			const subscription = await this.prisma.subscription.update({
				where: { id: subscriptionId },
				data: {
					...updates,
					updatedAt: new Date()
				}
			})

			this.logger.log(`Updated subscription ${subscriptionId}`)
			
			return ResponseUtil.success(subscription)
		} catch (error: unknown) {
			this.logger.error('Failed to update subscription:', error)
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
			const errorStack = error instanceof Error ? error.stack : undefined
			return ResponseUtil.error(errorMessage, errorStack || '')
		}
	}

	// Cancel subscription
	async cancel(subscriptionId: string): Promise<ApiResponse<Subscription | null>> {
		try {
			const subscription = await this.prisma.subscription.update({
				where: { id: subscriptionId },
				data: {
					status: 'CANCELED',
					endDate: new Date(), // End immediately for MVP
					updatedAt: new Date()
				}
			})

			this.logger.log(`Canceled subscription ${subscriptionId}`)
			
			return ResponseUtil.success(subscription)
		} catch (error: unknown) {
			this.logger.error('Failed to cancel subscription:', error)
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
			const errorStack = error instanceof Error ? error.stack : undefined
			return ResponseUtil.error(errorMessage, errorStack || '')
		}
	}

	// Simple usage tracking - just count properties for now
	async getUsage(userId: string): Promise<ApiResponse<{
		properties: number
		tenants: number
		limit: number
		planName: string
	} | null>> {
		try {
			const subscription = await this.prisma.subscription.findFirst({
				where: { userId },
				orderBy: { createdAt: 'desc' }

			})

			const properties = await this.prisma.property.count({
				where: { ownerId: userId }
			})

			const tenants = await this.prisma.tenant.count({
				where: { invitedBy: userId }
			})

			// Simple limits based on plan
			const limits = {
				'FREE': 2,
				'STARTER': 10,
				'GROWTH': 50,
				'ENTERPRISE': 999
			}

			const planId = subscription?.planId || 'FREE'
			const limit = limits[planId as keyof typeof limits] || 3

			return ResponseUtil.success({
				properties,
				tenants,
				limit,
				planName: planId
			})
		} catch (error: unknown) {
			this.logger.error('Failed to get usage:', error)
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
			const errorStack = error instanceof Error ? error.stack : undefined
			return ResponseUtil.error(errorMessage, errorStack || '')
		}
	}

	// Create subscription (router expects this method)
	async createSubscription(params: {
		userId: string
		planId: string
		billingPeriod?: string
		paymentMethodCollection?: string
	}): Promise<ApiResponse<Subscription | null>> {
		return this.create({
			userId: params.userId,
			planId: params.planId,
			billingPeriod: params.billingPeriod || 'MONTHLY',
			status: 'ACTIVE'
		})
	}

	// Update subscription (router expects this method)
	async updateSubscription(userId: string, params: {
		planId?: string
		billingPeriod?: string
	}): Promise<ApiResponse<Subscription | null>> {
		const subscription = await this.prisma.subscription.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		})

		if (!subscription) {
			throw new Error('No active subscription found')
		}

		const updated = await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				...(params.planId && { planId: params.planId }),
				...(params.billingPeriod && { billingPeriod: params.billingPeriod }),
				updatedAt: new Date()
			}
		})

		// Return with plan details
		return ResponseUtil.success(updated)
	}

	// Cancel subscription (router expects this method)
	async cancelSubscription(userId: string): Promise<void> {
		const subscription = await this.prisma.subscription.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		})

		if (!subscription) {
			throw new Error('No active subscription found')
		}

		await this.cancel(subscription.id)
	}

	// Calculate usage metrics (router expects this method)
	async calculateUsageMetrics(userId: string): Promise<{
		properties: number
		tenants: number
		planName: string
		limit: number
	}> {
		const usage = await this.getUsage(userId)
		return usage.data || { properties: 0, tenants: 0, limit: 0, planName: 'free' }
	}

	// Get available plans (router expects this method)
	getAvailablePlans() {
		return this.plans
	}

	// Get plan by ID (router expects this method)
	getPlanById(planId: string) {
		return this.plans.find(p => p.id === planId) || null
	}

	// Get user subscription with plan details (router expects this format)
	async getUserSubscriptionWithPlan(userId: string): Promise<SubscriptionWithPlan> {
		const subscription = await this.prisma.subscription.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		})

		if (!subscription) {
			// Return default free plan
			return {
				id: 'default',
				userId,
				planId: 'FREE',
				status: 'ACTIVE',
				billingPeriod: 'MONTHLY',
				startDate: new Date(),
				endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				currentPeriodStart: new Date(),
				currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				trialStart: null,
				trialEnd: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				plan: { 
					...this.plans[0], 
					billingPeriod: 'MONTHLY' as BillingPeriod, 
					limits: { properties: 3, tenants: 5, storage: 10 } 
				} as Plan, // Add missing properties
				limitsExceeded: [],
				// Add missing properties for SubscriptionWithPlan
				cancelledAt: null,
				stripeCustomerId: null,
				stripeSubscriptionId: null,
				stripePriceId: null,
				// Billing-related properties removed for current release
				cancelAtPeriodEnd: false,
				canceledAt: null,
				// meta removed for current release
				usage: { properties: 0, tenants: 0, limit: 0, planName: 'FREE' },
			}
		}

		// Get plan details
		const plan = this.plans.find(p => p.id === subscription.planId) || this.plans[0]!
		// Assert that plan is defined since we always have at least one plan
		
		// Check limits
		const usage = await this.getUsage(userId)
		const limitsExceeded = (usage.data?.properties || 0) > (usage.data?.limit || 0) ? ['property'] : []

		return {
			...subscription,
			currentPeriodStart: subscription.currentPeriodStart || subscription.startDate,
			currentPeriodEnd: subscription.currentPeriodEnd || subscription.endDate,
			trialStart: subscription.trialStart,
			trialEnd: subscription.trialEnd,
			plan: { 
				...plan, 
				billingPeriod: (plan.billingPeriod as BillingPeriod) || 'MONTHLY', 
				limits: plan.limits || { properties: 3, tenants: 5, storage: 10 } 
			} as Plan, // Add missing properties
			limitsExceeded,
			// Add missing properties for SubscriptionWithPlan
			cancelledAt: subscription.cancelledAt,
			stripeCustomerId: subscription.stripeCustomerId,
			stripeSubscriptionId: subscription.stripeSubscriptionId,
			stripePriceId: subscription.stripePriceId,
			// Billing-related properties removed for current release
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
			canceledAt: subscription.canceledAt,
			// meta removed for current release
			usage: usage.data || { properties: 0, tenants: 0, limit: 0, planName: 'free' },
		}
	}

	// Health check
	async getStats(): Promise<{ totalSubscriptions: number; activeSubscriptions: number }> {
		try {
			const [total, active] = await Promise.all([
				this.prisma.subscription.count(),
				this.prisma.subscription.count({ where: { status: 'ACTIVE' } })
			])

			return { totalSubscriptions: total, activeSubscriptions: active }
		} catch {
			return { totalSubscriptions: 0, activeSubscriptions: 0 }
		}
	}
}