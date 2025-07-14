import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ConfigService } from '@nestjs/config'
import { PlanType } from '@prisma/client'

// Since the database stores subscription status and billing period as strings, 
// we define them as string literal types
type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'TRIALING' | 'PAST_DUE' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'UNPAID'
type BillingPeriod = 'MONTHLY' | 'ANNUAL'
import Stripe from 'stripe'

// Plan definitions - this should be the source of truth
export const PLANS = {
	[PlanType.FREE]: {
		id: PlanType.FREE,
		name: 'Free Trial',
		price: 0,
		billingPeriod: 'MONTHLY' as BillingPeriod,
		stripePriceId: process.env.VITE_STRIPE_FREE_TRIAL,
		limits: {
			properties: 3,
			tenants: 10,
			storage: 500, // MB
			leaseGeneration: 5,
			support: 'email'
		},
		features: [
			'Up to 3 properties',
			'Up to 10 tenants',
			'500MB storage',
			'5 lease generations',
			'14-day free trial',
			'Email support'
		]
	},
	[PlanType.BASIC]: {
		id: PlanType.BASIC,
		name: 'Starter',
		price: 29,
		billingPeriod: 'MONTHLY' as BillingPeriod,
		stripePriceId: {
			['MONTHLY']: process.env.VITE_STRIPE_STARTER_MONTHLY,
			['ANNUAL']: process.env.VITE_STRIPE_STARTER_ANNUAL
		},
		limits: {
			properties: 10,
			tenants: 50,
			storage: 2000, // MB
			leaseGeneration: 25,
			support: 'email'
		},
		features: [
			'Up to 10 properties',
			'Up to 50 tenants',
			'2GB storage',
			'25 lease generations per month',
			'Email support',
			'Maintenance tracking',
			'Basic reporting'
		]
	},
	[PlanType.PROFESSIONAL]: {
		id: PlanType.PROFESSIONAL,
		name: 'Growth',
		price: 79,
		billingPeriod: 'MONTHLY' as BillingPeriod,
		stripePriceId: {
			['MONTHLY']: process.env.VITE_STRIPE_GROWTH_MONTHLY,
			['ANNUAL']: process.env.VITE_STRIPE_GROWTH_ANNUAL
		},
		limits: {
			properties: 50,
			tenants: 200,
			storage: 10000, // MB
			leaseGeneration: 100,
			support: 'priority'
		},
		features: [
			'Up to 50 properties',
			'Up to 200 tenants',
			'10GB storage',
			'100 lease generations per month',
			'Priority support',
			'Maintenance tracking',
			'Financial reporting',
			'Automation features',
			'Advanced analytics'
		]
	},
	[PlanType.ENTERPRISE]: {
		id: PlanType.ENTERPRISE,
		name: 'Enterprise',
		price: 199,
		billingPeriod: 'MONTHLY' as BillingPeriod,
		stripePriceId: {
			['MONTHLY']: process.env.VITE_STRIPE_ENTERPRISE_MONTHLY,
			['ANNUAL']: process.env.VITE_STRIPE_ENTERPRISE_ANNUAL
		},
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
			'Dedicated account manager',
			'White-label options'
		]
	}
} as const

export type PlanId = PlanType

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
					in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		})

		// Get plan details
		const planId = subscription?.planId || PlanType.FREE
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
		planId: PlanType,
		billingPeriod: BillingPeriod = 'MONTHLY'
	): Promise<{ clientSecret?: string; subscriptionId: string; status: string }> {
		const plan = PLANS[planId]
		if (!plan) {
			throw new Error('Invalid plan for subscription creation')
		}

		// Handle free trial separately (no payment required)
		if (planId === PlanType.FREE) {
			return this.createFreeTrialSubscription(userId, plan)
		}

		// Get user details
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		})

		if (!user) {
			throw new Error('User not found')
		}

		// Create or get Stripe customer
		const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, user)

		// Get the correct Stripe price ID based on billing period
		const priceIds = plan.stripePriceId as { ['MONTHLY']: string; ['ANNUAL']: string }
		const stripePriceId = billingPeriod === 'ANNUAL' ? priceIds['ANNUAL'] : priceIds['MONTHLY']

		if (!stripePriceId) {
			throw new Error(`No Stripe price ID for plan ${planId} with billing period ${billingPeriod}`)
		}

		const stripeSubscription = await this.stripe.subscriptions.create({
			customer: stripeCustomerId,
			items: [{ price: stripePriceId }],
			payment_behavior: 'default_incomplete',
			payment_settings: {
				save_default_payment_method: 'on_subscription',
				payment_method_types: ['card']
			},
			expand: ['latest_invoice.payment_intent'],
			metadata: {
				userId,
				planId,
				billingPeriod,
				source: 'tenantflow'
			}
		})

		console.log(`Created subscription ${stripeSubscription.id} with status: ${stripeSubscription.status}`)

		// CRITICAL FIX: Manual payment intent creation for paid subscriptions
		const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice
		let paymentIntent = (latestInvoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent })?.payment_intent

		if (!paymentIntent && latestInvoice) {
			// For default_incomplete behavior, this is expected
			// We need to create a payment intent manually for the invoice amount
			console.log('Creating payment intent for incomplete subscription...')
			
			try {
				// Create a manual payment intent for the invoice
				paymentIntent = await this.stripe.paymentIntents.create({
					amount: latestInvoice.amount_due || 0,
					currency: latestInvoice.currency || 'usd',
					customer: stripeCustomerId,
					payment_method_types: ['card'],
					metadata: {
						subscriptionId: stripeSubscription.id,
						invoiceId: latestInvoice.id || '',
						userId,
						planId,
						billingPeriod,
						source: 'tenantflow'
					}
				})
				
				console.log(`Created payment intent: ${paymentIntent.id}`)
				
			} catch (paymentIntentError) {
				console.error('Failed to create payment intent:', paymentIntentError)
				throw new Error('Failed to create payment intent for subscription')
			}
		}

		if (!paymentIntent) {
			throw new Error('Failed to create payment intent for subscription')
		}

		// Save subscription to database
		await this.prisma.subscription.create({
			data: {
				userId,
				plan: planId,
				planId,
				status: stripeSubscription.status as SubscriptionStatus,
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

		return {
			clientSecret: paymentIntent.client_secret!,
			subscriptionId: stripeSubscription.id,
			status: stripeSubscription.status
		}
	}

	/**
	 * Create a free trial subscription (no payment required)
	 */
	private async createFreeTrialSubscription(
		userId: string,
		plan: (typeof PLANS)[PlanType]
	): Promise<{ subscriptionId: string; status: string }> {
		// Get user details
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		})

		if (!user) {
			throw new Error('User not found')
		}

		// Create subscription in Stripe with trial
		const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, user)
		
		const stripePriceId = plan.stripePriceId as string
		if (!stripePriceId) {
			throw new Error('No Stripe price ID for free trial')
		}

		const stripeSubscription = await this.stripe.subscriptions.create({
			customer: stripeCustomerId,
			items: [{ price: stripePriceId }],
			trial_period_days: 14,
			metadata: {
				userId,
				planId: PlanType.FREE,
				billingPeriod: 'MONTHLY' as BillingPeriod,
				source: 'tenantflow'
			}
		})

		// Save subscription to database
		await this.prisma.subscription.create({
			data: {
				userId,
				plan: PlanType.FREE,
				planId: PlanType.FREE,
				status: stripeSubscription.status as SubscriptionStatus,
				stripeCustomerId,
				stripeSubscriptionId: stripeSubscription.id,
				stripePriceId,
				billingPeriod: 'MONTHLY' as BillingPeriod,
				currentPeriodStart: new Date((stripeSubscription as unknown as { current_period_start: number }).current_period_start * 1000),
				currentPeriodEnd: new Date((stripeSubscription as unknown as { current_period_end: number }).current_period_end * 1000),
				trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
				trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
			}
		})

		return {
			subscriptionId: stripeSubscription.id,
			status: stripeSubscription.status
		}
	}

	/**
	 * Get or create Stripe customer
	 */
	private async getOrCreateStripeCustomer(userId: string, user: { email: string; name?: string | null }): Promise<string> {
		// Check if user already has a Stripe customer ID
		const existingSubscription = await this.prisma.subscription.findFirst({
			where: { userId }
		})

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

		return stripeCustomerId
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(userId: string): Promise<void> {
		const subscription = await this.prisma.subscription.findFirst({
			where: {
				userId,
				status: {
					in: ['ACTIVE', 'TRIALING']
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
		return PLANS[planId as PlanType] || null
	}

	/**
	 * Update subscription plan or billing period
	 */
	async updateSubscription(
		userId: string,
		updateData: {
			planId?: PlanType
			billingPeriod?: BillingPeriod
		}
	): Promise<SubscriptionWithPlan> {
		const { planId, billingPeriod } = updateData

		// Get current subscription
		const currentSubscription = await this.prisma.subscription.findFirst({
			where: {
				userId,
				status: {
					in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		})

		if (!currentSubscription || !currentSubscription.stripeSubscriptionId) {
			throw new Error('No active subscription found to update')
		}

		// If changing plan, validate the new plan
		const targetPlanId = planId || currentSubscription.planId as PlanType
		const targetPlan = PLANS[targetPlanId]
		if (!targetPlan) {
			throw new Error(`Invalid plan: ${targetPlanId}`)
		}

		// If changing billing period, get the new price ID
		const targetBillingPeriod = billingPeriod || (currentSubscription.billingPeriod as BillingPeriod)
		
		// Get the correct Stripe price ID for the target plan and billing period
		let stripePriceId: string

		if (targetPlanId === PlanType.FREE) {
			stripePriceId = targetPlan.stripePriceId as string
		} else {
			const priceIds = targetPlan.stripePriceId as { ['MONTHLY']: string; ['ANNUAL']: string }
			stripePriceId = targetBillingPeriod === 'ANNUAL' ? priceIds['ANNUAL'] : priceIds['MONTHLY']
		}

		if (!stripePriceId) {
			throw new Error(`No Stripe price ID for plan ${targetPlanId} with billing period ${targetBillingPeriod}`)
		}

		// Update subscription in Stripe
		const stripeSubscription = await this.stripe.subscriptions.update(
			currentSubscription.stripeSubscriptionId,
			{
				items: [
					{
						id: (await this.stripe.subscriptions.retrieve(currentSubscription.stripeSubscriptionId)).items.data[0].id,
						price: stripePriceId
					}
				],
				metadata: {
					userId,
					planId: targetPlanId,
					billingPeriod: targetBillingPeriod,
					source: 'tenantflow',
					updated: new Date().toISOString()
				},
				proration_behavior: 'create_prorations'
			}
		)

		// Update subscription in database
		await this.prisma.subscription.update({
			where: { id: currentSubscription.id },
			data: {
				planId: targetPlanId,
				plan: targetPlanId,
				billingPeriod: targetBillingPeriod,
				stripePriceId,
				currentPeriodStart: new Date(
					(stripeSubscription as unknown as { current_period_start: number }).current_period_start * 1000
				),
				currentPeriodEnd: new Date(
					(stripeSubscription as unknown as { current_period_end: number }).current_period_end * 1000
				),
				updatedAt: new Date()
			}
		})

		// Return updated subscription with plan details
		return this.getUserSubscription(userId)
	}
}
