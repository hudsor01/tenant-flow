/**
 * Subscriptions Service
 * Phase 4: Autopay Subscriptions
 *
 * Handles recurring rent payment subscriptions with Stripe Billing.
 * Uses destination charges to route payments to landlord Stripe Connect accounts.
 */

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	SubscriptionActionResponse,
	SubscriptionStatus,
	UpdateSubscriptionRequest
} from '@repo/shared/types/core'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class SubscriptionsService {
	private readonly logger = new Logger(SubscriptionsService.name)
	private readonly stripe: Stripe

	constructor(private readonly supabase: SupabaseService) {
		this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2025-08-27' as Stripe.LatestApiVersion
		})
	}

	/**
	 * Create a new rent subscription with destination charges
	 */
	async createSubscription(
		tenantId: string,
		request: CreateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		// 1. Validate lease belongs to tenant
		const { data: lease, error: leaseError } = await this.supabase
			.getAdminClient()
			.from('lease')
			.select('*, unit(*, property(*))')
			.eq('id', request.leaseId)
			.eq('tenantId', tenantId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		const landlordId = lease.unit.property.ownerId

		// Get landlord's Stripe Connect account
		const { data: connectedAccount, error: accountError } = await this.supabase
			.getAdminClient()
			.from('connected_account')
			.select('*')
			.eq('userId', landlordId)
			.single()

		if (accountError || !connectedAccount) {
			throw new BadRequestException(
				'Landlord has not completed Stripe Connect onboarding'
			)
		}

		if (!connectedAccount.chargesEnabled) {
			throw new BadRequestException(
				'Landlord Stripe account is not enabled for charges'
			)
		}

		const stripeAccountId = connectedAccount.stripeAccountId

		// 2. Get payment method and ensure it belongs to tenant
		const { data: paymentMethod, error: pmError } = await this.supabase
			.getAdminClient()
			.from('tenant_payment_method')
			.select('*')
			.eq('id', request.paymentMethodId)
			.eq('tenantId', tenantId)
			.single()

		if (pmError || !paymentMethod) {
			throw new NotFoundException('Payment method not found')
		}

		// 3. Get or create Stripe customer for tenant
		let stripeCustomerId = paymentMethod.stripeCustomerId

		if (!stripeCustomerId) {
			// Get tenant info separately
			const { data: tenant } = await this.supabase
				.getAdminClient()
				.from('tenant')
				.select('*')
				.eq('id', tenantId)
				.single()

			const customerParams: {
				metadata: { tenantId: string; leaseId: string }
				email?: string
				name?: string
			} = {
				metadata: {
					tenantId,
					leaseId: request.leaseId
				}
			}

			if (tenant?.email !== undefined && tenant.email !== null) {
				customerParams.email = tenant.email
			}
			if (tenant?.name !== undefined && tenant.name !== null) {
				customerParams.name = tenant.name
			}

			const customer = await this.stripe.customers.create(customerParams)
			stripeCustomerId = customer.id
		}

		// 4. Calculate billing cycle anchor (next occurrence of billing day)
		const now = new Date()
		const currentDay = now.getUTCDate()
		const anchorDate = new Date(
			Date.UTC(
				now.getUTCFullYear(),
				now.getUTCMonth(),
				request.billingDayOfMonth,
				0,
				0,
				0
			)
		)

		// If billing day has passed this month, set anchor to next month
		if (request.billingDayOfMonth <= currentDay) {
			anchorDate.setUTCMonth(anchorDate.getUTCMonth() + 1)
		}

		const billingCycleAnchor = Math.floor(anchorDate.getTime() / 1000)

		// 5. Create a product and price first for the subscription
		const product = await this.stripe.products.create({
			name: `Rent for Unit ${lease.unit.unitNumber} at ${lease.unit.property.name}`
		})

		const price = await this.stripe.prices.create({
			product: product.id,
			currency: request.currency || 'usd',
			unit_amount: Math.round(request.amount * 100), // Convert to cents
			recurring: {
				interval: 'month'
			}
		})

		// 6. Create Stripe subscription with destination charges
		const subscription = await this.stripe.subscriptions.create({
			customer: stripeCustomerId,
			items: [{ price: price.id }],
			default_payment_method: paymentMethod.stripePaymentMethodId,
			billing_cycle_anchor: billingCycleAnchor,
			proration_behavior: 'none',
			application_fee_percent: 2.9, // Platform fee percentage
			transfer_data: {
				destination: stripeAccountId
			},
			metadata: {
				tenantId,
				landlordId,
				leaseId: request.leaseId,
				paymentMethodId: request.paymentMethodId
			}
		})

		// 7. Store subscription in database with all metadata
		const { data: dbSubscription, error: dbError } = await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.insert({
				leaseId: request.leaseId,
				tenantId,
				landlordId,
				stripeSubscriptionId: subscription.id,
				stripeCustomerId,
				amount: Math.round(request.amount * 100), // Store in cents
				currency: request.currency || 'usd',
				dueDay: request.billingDayOfMonth,
				status: subscription.status === 'active' ? 'active' : 'paused',
				platformFeePercent: 2.9,
				pausedAt:
					subscription.status !== 'active' ? new Date().toISOString() : null
			})
			.select()
			.single()

		if (dbError || !dbSubscription) {
			// Rollback: Cancel Stripe subscription
			await this.stripe.subscriptions.cancel(subscription.id)
			throw new BadRequestException('Failed to create subscription record')
		}

		return this.mapToResponse(dbSubscription as Record<string, unknown>)
	}

	/**
	 * Get subscription by ID
	 */
	async getSubscription(
		subscriptionId: string,
		userId: string
	): Promise<RentSubscriptionResponse> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.select('*')
			.eq('id', subscriptionId)
			.or(`tenantId.eq.${userId},landlordId.eq.${userId}`)
			.single()

		if (error || !data) {
			throw new NotFoundException('Subscription not found')
		}

		return this.mapToResponse(data as Record<string, unknown>)
	}

	/**
	 * List subscriptions for a user (tenant or landlord)
	 */
	async listSubscriptions(userId: string): Promise<RentSubscriptionResponse[]> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.select('*')
			.or(`tenantId.eq.${userId},landlordId.eq.${userId}`)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to list subscriptions:', error)
			return []
		}

		return (data || []).map(item =>
			this.mapToResponse(item as Record<string, unknown>)
		)
	}

	/**
	 * Pause subscription
	 */
	async pauseSubscription(
		subscriptionId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const subscription = await this.getSubscription(subscriptionId, userId)

		if (subscription.status !== 'active') {
			throw new BadRequestException('Only active subscriptions can be paused')
		}

		// Pause in Stripe
		await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
			pause_collection: {
				behavior: 'keep_as_draft'
			}
		})

		// Update database with pausedAt timestamp
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.update({
				status: 'paused',
				pausedAt: new Date().toISOString()
			})
			.eq('id', subscriptionId)
			.select()
			.single()

		if (error || !data) {
			throw new BadRequestException('Failed to update subscription status')
		}

		return {
			success: true,
			subscription: this.mapToResponse(data as Record<string, unknown>),
			message: 'Subscription paused successfully'
		}
	}

	/**
	 * Resume subscription
	 */
	async resumeSubscription(
		subscriptionId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const subscription = await this.getSubscription(subscriptionId, userId)

		if (subscription.status !== 'paused') {
			throw new BadRequestException('Only paused subscriptions can be resumed')
		}

		// Resume in Stripe
		await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
			pause_collection: null
		})

		// Update database and clear pausedAt
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.update({
				status: 'active',
				pausedAt: null
			})
			.eq('id', subscriptionId)
			.select()
			.single()

		if (error || !data) {
			throw new BadRequestException('Failed to update subscription status')
		}

		return {
			success: true,
			subscription: this.mapToResponse(data as Record<string, unknown>),
			message: 'Subscription resumed successfully'
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(
		subscriptionId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const subscription = await this.getSubscription(subscriptionId, userId)

		// Cancel in Stripe (at period end to honor current billing cycle)
		await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
			cancel_at_period_end: true
		})

		// Update database with canceledAt timestamp
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('rent_subscription')
			.update({
				status: 'canceled',
				canceledAt: new Date().toISOString()
			})
			.eq('id', subscriptionId)
			.select()
			.single()

		if (error || !data) {
			throw new BadRequestException('Failed to update subscription status')
		}

		return {
			success: true,
			subscription: this.mapToResponse(data as Record<string, unknown>),
			message: 'Subscription will be canceled at the end of the current period'
		}
	}

	/**
	 * Update subscription amount or payment method
	 */
	async updateSubscription(
		subscriptionId: string,
		userId: string,
		update: UpdateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		const subscription = await this.getSubscription(subscriptionId, userId)

		const stripeUpdate: Stripe.SubscriptionUpdateParams = {}
		const dbUpdate: Record<string, unknown> = {}

		// Update amount
		if (update.amount !== undefined) {
			const stripeSubscription = await this.stripe.subscriptions.retrieve(
				subscription.stripeSubscriptionId
			)
			const itemId = stripeSubscription.items.data[0]?.id

			if (itemId && stripeSubscription.items.data[0]?.price) {
				const existingPrice = stripeSubscription.items.data[0].price
				const productId =
					typeof existingPrice.product === 'string'
						? existingPrice.product
						: existingPrice.product?.id

				if (!productId) {
					throw new BadRequestException(
						'Could not find product for subscription'
					)
				}

				// Create new price for updated amount
				const newPrice = await this.stripe.prices.create({
					product: productId,
					currency: 'usd',
					unit_amount: Math.round(update.amount * 100),
					recurring: {
						interval: 'month'
					}
				})

				stripeUpdate.items = [
					{
						id: itemId,
						price: newPrice.id
					}
				]
				dbUpdate.amount = Math.round(update.amount * 100) // Store in cents
			}
		}

		// Update payment method
		if (update.paymentMethodId) {
			const { data: newPM } = await this.supabase
				.getAdminClient()
				.from('tenant_payment_method')
				.select('stripePaymentMethodId')
				.eq('id', update.paymentMethodId)
				.eq('tenantId', subscription.tenantId)
				.single()

			if (newPM) {
				stripeUpdate.default_payment_method = newPM.stripePaymentMethodId
				dbUpdate.paymentMethodId = update.paymentMethodId
			}
		}

		// Apply Stripe updates
		if (Object.keys(stripeUpdate).length > 0) {
			await this.stripe.subscriptions.update(
				subscription.stripeSubscriptionId,
				stripeUpdate
			)
		}

		// Apply database updates
		if (Object.keys(dbUpdate).length > 0) {
			const { data, error } = await this.supabase
				.getAdminClient()
				.from('rent_subscription')
				.update(dbUpdate)
				.eq('id', subscriptionId)
				.select()
				.single()

			if (error || !data) {
				throw new BadRequestException('Failed to update subscription')
			}

			return this.mapToResponse(data as Record<string, unknown>)
		}

		return subscription
	}

	/**
	 * Map database record to response DTO
	 */
	private mapToResponse(
		data: Record<string, unknown>
	): RentSubscriptionResponse {
		return {
			id: data.id as string,
			leaseId: data.leaseId as string,
			tenantId: data.tenantId as string,
			landlordId: data.landlordId as string,
			stripeSubscriptionId: data.stripeSubscriptionId as string,
			stripeCustomerId: data.stripeCustomerId as string,
			paymentMethodId: '', // Not stored in database - would need to query Stripe
			amount: parseFloat(data.amount as string) / 100, // Convert from cents
			currency: (data.currency as string) || 'usd',
			billingDayOfMonth: data.dueDay as number,
			status: data.status as SubscriptionStatus,
			platformFeePercentage: parseFloat(data.platformFeePercent as string),
			pausedAt: (data.pausedAt as string) || null,
			canceledAt: (data.canceledAt as string) || null,
			createdAt: data.createdAt as string,
			updatedAt: data.updatedAt as string
		}
	}
}
