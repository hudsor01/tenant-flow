import { Injectable } from '@nestjs/common'
import type { PrismaService } from 'nestjs-prisma'
import type { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

// Plan definitions - this should be the source of truth
export const PLANS = {
	free: {
		id: 'free',
		name: 'Free',
		price: 0,
		billingPeriod: 'monthly',
		stripePriceId: undefined,
		limits: {
			properties: 1,
			tenants: 2,
			storage: 100, // MB
			leaseGeneration: 1,
			support: 'email'
		},
		features: [
			'Up to 1 property',
			'Up to 2 tenants',
			'100MB storage',
			'1 lease generation per month',
			'Email support'
		]
	},
	basic: {
		id: 'basic',
		name: 'Basic',
		price: 9.99,
		billingPeriod: 'monthly',
		stripePriceId: 'price_basic_monthly',
		limits: {
			properties: 5,
			tenants: 20,
			storage: 1000, // MB
			leaseGeneration: 10,
			support: 'email'
		},
		features: [
			'Up to 5 properties',
			'Up to 20 tenants',
			'1GB storage',
			'10 lease generations per month',
			'Email support',
			'Maintenance tracking'
		]
	},
	professional: {
		id: 'professional',
		name: 'Professional',
		price: 29.99,
		billingPeriod: 'monthly',
		stripePriceId: 'price_professional_monthly',
		limits: {
			properties: 25,
			tenants: 100,
			storage: 5000, // MB
			leaseGeneration: 50,
			support: 'priority'
		},
		features: [
			'Up to 25 properties',
			'Up to 100 tenants',
			'5GB storage',
			'50 lease generations per month',
			'Priority support',
			'Maintenance tracking',
			'Financial reporting',
			'Automation features'
		]
	},
	enterprise: {
		id: 'enterprise',
		name: 'Enterprise',
		price: 99.99,
		billingPeriod: 'monthly',
		stripePriceId: 'price_enterprise_monthly',
		limits: {
			properties: -1, // unlimited
			tenants: -1, // unlimited
			storage: -1, // unlimited
			leaseGeneration: -1, // unlimited
			support: '24/7'
		},
		features: [
			'Unlimited properties',
			'Unlimited tenants',
			'Unlimited storage',
			'Unlimited lease generations',
			'24/7 phone support',
			'All features included',
			'Custom integrations',
			'Dedicated account manager'
		]
	}
} as const

export type PlanId = keyof typeof PLANS

export interface UsageMetrics {
	properties: number
	tenants: number
	leases: number
	documents: number
	storage: number // in MB
	leaseGeneration: number // current month
}

export interface SubscriptionWithPlan {
	id: string
	userId: string
	plan: (typeof PLANS)[PlanId]
	status: string
	currentPeriodStart: Date | null
	currentPeriodEnd: Date | null
	trialStart: Date | null
	trialEnd: Date | null
	cancelAtPeriodEnd: boolean | null
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	usage: UsageMetrics
	isOverLimit: boolean
	limitsExceeded: string[]
}

@Injectable()
export class SubscriptionsService {
	private stripe: Stripe

	constructor(
		private prisma: PrismaService,
		private configService: ConfigService
	) {
		const stripeSecretKey =
			this.configService.get<string>('STRIPE_SECRET_KEY')
		if (!stripeSecretKey) {
			throw new Error('STRIPE_SECRET_KEY is required')
		}
		this.stripe = new Stripe(stripeSecretKey, {
			apiVersion: '2025-06-30.basil'
		})
	}

	/**
	 * Get user's current subscription with plan details and usage
	 */
	async getUserSubscription(userId: string): Promise<SubscriptionWithPlan> {
		// Get subscription from database
		const subscription = await this.prisma.subscription.findFirst({
			where: {
				userId,
				status: {
					in: ['active', 'trialing', 'past_due']
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		})

		// Get plan details
		const planId = (subscription?.planId as PlanId) || 'free'
		const plan = PLANS[planId]

		if (!plan) {
			throw new Error(`Plan ${planId} not found`)
		}

		// Calculate usage metrics
		const usage = await this.calculateUsageMetrics(userId)

		// Check limits
		const { isOverLimit, limitsExceeded } = this.checkLimitsExceeded(
			usage,
			plan
		)

		return {
			id: subscription?.id || 'free',
			userId,
			plan,
			status: subscription?.status || 'active',
			currentPeriodStart: subscription?.currentPeriodStart || null,
			currentPeriodEnd: subscription?.currentPeriodEnd || null,
			trialStart: subscription?.trialStart || null,
			trialEnd: subscription?.trialEnd || null,
			cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
			stripeCustomerId: subscription?.stripeCustomerId || null,
			stripeSubscriptionId: subscription?.stripeSubscriptionId || null,
			usage,
			isOverLimit,
			limitsExceeded
		}
	}

	/**
	 * Calculate user's current usage across all metrics
	 */
	async calculateUsageMetrics(userId: string): Promise<UsageMetrics> {
		const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

		const [
			propertiesCount,
			tenantsCount,
			leasesCount,
			documentsCount,
			leaseGenCount
		] = await Promise.all([
			// Properties count
			this.prisma.property.count({
				where: { ownerId: userId }
			}),

			// Tenants count (invited by this user)
			this.prisma.tenant.count({
				where: { invitedBy: userId }
			}),

			// Leases count (for user's properties)
			this.prisma.lease.count({
				where: {
					Unit: {
						Property: {
							ownerId: userId
						}
					}
				}
			}),

			// Documents count
			this.prisma.document.count({
				where: {
					Property: {
						ownerId: userId
					}
				}
			}),

			// Lease generation usage for current month
			this.prisma.leaseGeneratorUsage.count({
				where: {
					userId,
					createdAt: {
						gte: new Date(`${currentMonth}-01`),
						lt: new Date(this.getNextMonth(currentMonth))
					}
				}
			})
		])

		// For now, estimate based on document count
		const estimatedStorage = documentsCount * 2 // 2MB per document estimate

		return {
			properties: propertiesCount,
			tenants: tenantsCount,
			leases: leasesCount,
			documents: documentsCount,
			storage: estimatedStorage,
			leaseGeneration: leaseGenCount
		}
	}

	/**
	 * Check if user has exceeded any plan limits
	 */
	private checkLimitsExceeded(
		usage: UsageMetrics,
		plan: (typeof PLANS)[PlanId]
	): { isOverLimit: boolean; limitsExceeded: string[] } {
		const limitsExceeded: string[] = []

		// Check each limit (unlimited = -1)
		if (
			plan.limits.properties !== -1 &&
			usage.properties > plan.limits.properties
		) {
			limitsExceeded.push('properties')
		}
		if (plan.limits.tenants !== -1 && usage.tenants > plan.limits.tenants) {
			limitsExceeded.push('tenants')
		}
		if (plan.limits.storage !== -1 && usage.storage > plan.limits.storage) {
			limitsExceeded.push('storage')
		}
		if (
			plan.limits.leaseGeneration !== -1 &&
			usage.leaseGeneration > plan.limits.leaseGeneration
		) {
			limitsExceeded.push('leaseGeneration')
		}

		return {
			isOverLimit: limitsExceeded.length > 0,
			limitsExceeded
		}
	}

	/**
	 * Create a new subscription via Stripe
	 */
	async createSubscription(
		userId: string,
		planId: PlanId,
		billingPeriod: 'monthly' | 'annual' = 'monthly'
	): Promise<{ clientSecret: string; subscriptionId: string }> {
		const plan = PLANS[planId]
		if (!plan || planId === 'free') {
			throw new Error('Invalid plan for subscription creation')
		}

		// Get user details
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		})

		if (!user) {
			throw new Error('User not found')
		}

		// Get existing subscription to check for Stripe customer ID
		const existingSubscription = await this.prisma.subscription.findFirst({
			where: { userId }
		})

		// Create or get Stripe customer
		let stripeCustomerId = existingSubscription?.stripeCustomerId
		if (!stripeCustomerId) {
			const customer = await this.stripe.customers.create({
				email: user.email,
				name: user.name || undefined,
				metadata: {
					userId
				}
			})
			stripeCustomerId = customer.id
		}

		// Create subscription in Stripe
		const stripePriceId =
			billingPeriod === 'annual'
				? plan.stripePriceId?.replace('monthly', 'annual')
				: plan.stripePriceId

		if (!stripePriceId) {
			throw new Error(`No Stripe price ID for plan ${planId}`)
		}

		const stripeSubscription = await this.stripe.subscriptions.create({
			customer: stripeCustomerId,
			items: [{ price: stripePriceId }],
			payment_behavior: 'default_incomplete',
			payment_settings: {
				save_default_payment_method: 'on_subscription'
			},
			expand: ['latest_invoice.payment_intent'],
			metadata: {
				userId,
				planId,
				billingPeriod
			}
		})

		// Save subscription to database
		await this.prisma.subscription.create({
			data: {
				userId,
				plan: planId,
				planId,
				status: stripeSubscription.status,
				stripeCustomerId,
				stripeSubscriptionId: stripeSubscription.id,
				stripePriceId,
				billingPeriod,
				currentPeriodStart: new Date(
					(
						stripeSubscription as unknown as {
							current_period_start: number
						}
					).current_period_start * 1000
				),
				currentPeriodEnd: new Date(
					(
						stripeSubscription as unknown as {
							current_period_end: number
						}
					).current_period_end * 1000
				)
			}
		})

		const invoice = stripeSubscription.latest_invoice as Stripe.Invoice
		const paymentIntent = (
			invoice as Stripe.Invoice & { payment_intent: Stripe.PaymentIntent }
		).payment_intent

		return {
			clientSecret: paymentIntent.client_secret!,
			subscriptionId: stripeSubscription.id
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(userId: string): Promise<void> {
		const subscription = await this.prisma.subscription.findFirst({
			where: {
				userId,
				status: {
					in: ['active', 'trialing']
				}
			}
		})

		if (!subscription || !subscription.stripeSubscriptionId) {
			throw new Error('No active subscription found')
		}

		// Cancel in Stripe (at period end)
		await this.stripe.subscriptions.update(
			subscription.stripeSubscriptionId,
			{
				cancel_at_period_end: true
			}
		)

		// Update database
		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				cancelAtPeriodEnd: true
			}
		})
	}

	/**
	 * Create Stripe customer portal session
	 */
	async createCustomerPortalSession(
		userId: string,
		returnUrl: string
	): Promise<{ url: string }> {
		// Get subscription to find Stripe customer ID
		const subscription = await this.prisma.subscription.findFirst({
			where: { userId }
		})

		if (!subscription?.stripeCustomerId) {
			throw new Error('No Stripe customer found for user')
		}

		const session = await this.stripe.billingPortal.sessions.create({
			customer: subscription.stripeCustomerId,
			return_url: returnUrl
		})

		return { url: session.url }
	}

	/**
	 * Helper to get next month for date calculations
	 */
	private getNextMonth(currentMonth: string): string {
		const [year, month] = currentMonth.split('-').map(Number)
		if (!year || !month) {
			throw new Error('Invalid month format')
		}
		const nextMonth = month === 12 ? 1 : month + 1
		const nextYear = month === 12 ? year + 1 : year
		return `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
	}

	/**
	 * Get all available plans
	 */
	getAvailablePlans() {
		return Object.values(PLANS)
	}

	/**
	 * Get specific plan by ID
	 */
	getPlanById(planId: string) {
		return PLANS[planId as PlanId] || null
	}
}
