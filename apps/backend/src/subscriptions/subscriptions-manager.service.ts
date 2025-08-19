import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../common/supabase/supabase.service'
import { StripeBillingService } from '../stripe/stripe-billing.service'
import { PropertiesSupabaseRepository } from '../properties/properties-supabase.repository'
import { SubscriptionSupabaseRepository } from './subscription-supabase.repository'
import type { Database } from '@repo/shared/types/supabase-generated'
import { Plan, PLAN_TYPE } from '@repo/shared'

export type Subscription = Database['public']['Tables']['Subscription']['Row']

@Injectable()
export class SubscriptionsManagerService {
	private readonly logger = new Logger(SubscriptionsManagerService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		@Inject(forwardRef(() => StripeBillingService))
		private readonly stripeBillingService: StripeBillingService,
		@Inject(forwardRef(() => PropertiesSupabaseRepository))
		private readonly propertiesRepository: PropertiesSupabaseRepository,
		private readonly subscriptionsRepository: SubscriptionSupabaseRepository
	) {}

	async calculateUsageMetrics(
		userId: string
	): Promise<{ properties: number }> {
		try {
			// Get actual property count for the user's organization
			const propertyCount = await this.propertiesRepository.count(
				[{ column: 'userId', operator: 'eq', value: userId }],
				userId
			)
			return { properties: propertyCount }
		} catch (error) {
			this.logger.error(
				`Failed to calculate usage metrics for user ${userId}:`,
				error
			)
			return { properties: 0 }
		}
	}

	async getUsageLimits(
		userId: string
	): Promise<{ properties: number | { limit: number } }> {
		try {
			// Get user's subscription to determine plan limits
			const subscription =
				await this.subscriptionsRepository.findByUserId(userId)

			if (!subscription) {
				// Default free tier limits
				return { properties: { limit: 1 } }
			}

			// Map plan types to property limits
			const planLimits = {
				HOBBY: { limit: 5 },
				STARTER: { limit: 25 },
				PROFESSIONAL: { limit: 100 },
				ENTERPRISE: { limit: -1 } // Unlimited
			}

			const planType = subscription.planType as keyof typeof planLimits
			return {
				properties: planLimits[planType] || { limit: 1 }
			}
		} catch (error) {
			this.logger.error(
				`Failed to get usage limits for user ${userId}:`,
				error
			)
			return { properties: { limit: 1 } }
		}
	}

	getPlanById(_planType: string): Promise<Plan | null> {
		return Promise.resolve(null)
	}

	getSubscription(_userId: string): Promise<Subscription | null> {
		return Promise.resolve(null)
	}

	async getUserSubscription(userId: string): Promise<Subscription | null> {
		try {
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('Subscription')
				.select('*')
				.eq('userId', userId)
				.single()

			if (error) {
				this.logger.error('Error fetching subscription:', error)
				return null
			}

			return data
		} catch (error) {
			this.logger.error('Failed to get user subscription:', error)
			return null
		}
	}

	async createOrUpdateSubscription(
		userId: string,
		subscriptionData: Partial<Subscription>
	): Promise<Subscription | null> {
		try {
			if (
				subscriptionData.startDate &&
				typeof subscriptionData.startDate !== 'string' &&
				Object.prototype.toString.call(subscriptionData.startDate) ===
					'[object Date]'
			) {
				subscriptionData.startDate = (
					subscriptionData.startDate as Date
				).toISOString()
			}
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('Subscription')
				.upsert(
					{
						...subscriptionData,
						status: subscriptionData.status ?? 'ACTIVE',
						userId,
						updatedAt: new Date().toISOString()
					},
					{ onConflict: 'userId' }
				)
				.select()
				.single()

			if (error) {
				this.logger.error(
					'Error creating/updating subscription:',
					error
				)
				return null
			}

			return data
		} catch (error) {
			this.logger.error('Failed to create/update subscription:', error)
			return null
		}
	}

	async cancelSubscription(userId: string): Promise<boolean> {
		try {
			const subscription = await this.getUserSubscription(userId)
			if (!subscription?.stripeSubscriptionId) {
				return false
			}

			// Cancel in Stripe
			await this.stripeBillingService.cancelSubscription({
				subscriptionId: subscription.stripeSubscriptionId,
				userId
			})

			// Update local record
			await this.createOrUpdateSubscription(userId, {
				status: 'CANCELED',
				canceledAt: new Date().toISOString()
			})

			return true
		} catch (error) {
			this.logger.error('Failed to cancel subscription:', error)
			return false
		}
	}

	async canAddProperty(userId: string): Promise<boolean> {
		try {
			const usage = await this.calculateUsageMetrics(userId)
			const limits = await this.getUsageLimits(userId)

			// If limits is unlimited (-1), always return true
			if (
				typeof limits.properties === 'object' &&
				limits.properties.limit === -1
			) {
				return true
			}

			// Check if current usage is below limit
			const currentProperties = usage.properties
			const propertyLimit =
				typeof limits.properties === 'object'
					? limits.properties.limit
					: limits.properties

			return currentProperties < propertyLimit
		} catch (error) {
			this.logger.error(
				`Failed to check property limit for user ${userId}:`,
				error
			)
			return false
		}
	}

	async getAvailablePlans(): Promise<Plan[]> {
		// Return available subscription plans
		const plans: Plan[] = [
			{
				id: PLAN_TYPE.FREETRIAL,
				uiId: 'free',
				name: 'Free',
				description: 'Perfect for getting started',
				price: {
					monthly: 0,
					annual: 0
				},
				features: ['1 property', 'Basic features', 'Community support'],
				propertyLimit: 1,
				storageLimit: 100,
				apiCallLimit: 1000,
				priority: false,
				stripePriceIds: {
					monthly: null,
					annual: null
				}
			},
			{
				id: PLAN_TYPE.STARTER,
				uiId: 'starter',
				name: 'Starter',
				description: 'Ideal for growing property portfolios',
				price: {
					monthly: 29,
					annual: 290
				},
				features: [
					'Up to 25 properties',
					'Advanced reporting',
					'Priority support'
				],
				propertyLimit: 25,
				storageLimit: 1000,
				apiCallLimit: 10000,
				priority: true,
				stripePriceIds: {
					monthly: 'price_starter_monthly',
					annual: 'price_starter_annual'
				}
			},
			{
				id: PLAN_TYPE.GROWTH,
				uiId: 'growth',
				name: 'Growth',
				description: 'For professional property managers',
				price: {
					monthly: 99,
					annual: 990
				},
				features: [
					'Up to 100 properties',
					'Full analytics',
					'Phone & email support'
				],
				propertyLimit: 100,
				storageLimit: 5000,
				apiCallLimit: 50000,
				priority: true,
				stripePriceIds: {
					monthly: 'price_growth_monthly',
					annual: 'price_growth_annual'
				}
			},
			{
				id: PLAN_TYPE.TENANTFLOW_MAX,
				uiId: 'tenantflow-max',
				name: 'TenantFlow Max',
				description: 'For large property management companies',
				price: {
					monthly: 299,
					annual: 2990
				},
				features: [
					'Unlimited properties',
					'Custom features',
					'Dedicated support'
				],
				propertyLimit: -1,
				storageLimit: -1,
				apiCallLimit: -1,
				priority: true,
				stripePriceIds: {
					monthly: 'price_tenantflow_max_monthly',
					annual: 'price_tenantflow_max_annual'
				}
			}
		]

		return plans
	}
}
