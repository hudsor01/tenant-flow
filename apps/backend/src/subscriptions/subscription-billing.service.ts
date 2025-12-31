/**
 * Subscription Billing Service
 * Handles create and update subscription operations with Stripe integration
 * Extracted from SubscriptionsService for SRP compliance
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable
} from '@nestjs/common'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/api-contracts'
import type { Database } from '@repo/shared/types/supabase'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionCacheService } from './subscription-cache.service'
import { SubscriptionQueryService } from './subscription-query.service'
import { AppLogger } from '../logger/app-logger.service'

type LeaseRow = Database['public']['Tables']['leases']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']
type PropertyOwnerRow =
	Database['public']['Tables']['stripe_connected_accounts']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

@Injectable()
export class SubscriptionBillingService {
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly cache: SubscriptionCacheService,
		private readonly queryService: SubscriptionQueryService,
		private readonly logger: AppLogger
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Create a new rent subscription (one per lease)
	 */
	async createSubscription(
		userId: string,
		request: CreateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		const adminClient = this.supabase.getAdminClient()
		const tenantContext = await this.requireTenantForUser(userId)
		const leaseContext = await this.queryService.loadLeaseContext(
			request.leaseId
		)

		if (leaseContext.tenant.id !== tenantContext.tenant.id) {
			throw new BadRequestException('Lease does not belong to tenant')
		}

		if (leaseContext.lease.stripe_subscription_id) {
			throw new BadRequestException('Autopay is already enabled for this lease')
		}

		const paymentMethod = await this.queryService.getPaymentMethod(
			request.paymentMethodId
		)
		if (paymentMethod.tenant_id !== leaseContext.tenant.id) {
			throw new BadRequestException('Payment method does not belong to tenant')
		}

		this.assertTenantUser(userId, leaseContext.tenantUser.id)
		this.assertOwnerReady(leaseContext.owner)

		const stripeCustomerId = await this.ensureStripeCustomerId(
			leaseContext.tenant,
			leaseContext.tenantUser
		)

		const billingDay = this.validateBillingDay(request.billingDayOfMonth)
		const amountInCents = this.normalizeStripeAmount(request.amount)
		const currency = (
			request.currency ??
			leaseContext.lease.rent_currency ??
			'usd'
		).toLowerCase()
		const billingCycleAnchor = this.computeBillingCycleAnchor(billingDay)

		const price = await this.stripe.prices.create({
			currency,
			unit_amount: amountInCents,
			recurring: { interval: 'month' },
			product_data: {
				name: `Monthly Rent - Lease ${leaseContext.lease.id.slice(0, 8)}`,
				metadata: {
					lease_id: leaseContext.lease.id,
					tenant_id: leaseContext.tenant.id,
					owner_id: leaseContext.owner.user_id
				}
			}
		})

		const subscription = await this.stripe.subscriptions.create({
			customer: stripeCustomerId,
			items: [
				{
					price: price.id
				}
			],
			default_payment_method: paymentMethod.stripe_payment_method_id,
			transfer_data: {
				destination: leaseContext.owner.stripe_account_id
			},
			// Platform fee: use owner's configured rate or default to 1%
			application_fee_percent:
				leaseContext.owner.default_platform_fee_percent ?? 1.0,
			proration_behavior: 'none',
			billing_cycle_anchor: billingCycleAnchor,
			metadata: {
				lease_id: leaseContext.lease.id,
				tenant_id: leaseContext.tenant.id,
				owner_id: leaseContext.owner.user_id,
				payment_method_id: paymentMethod.id
			}
		})

		const { error } = await adminClient
			.from('leases')
			.update({
				stripe_subscription_id: subscription.id,
				auto_pay_enabled: true,
				payment_day: billingDay,
				rent_amount: request.amount,
				rent_currency: currency
			})
			.eq('id', leaseContext.lease.id)

		if (error) {
			this.logger.error(
				'Failed to persist subscription metadata, cancelling Stripe subscription',
				{
					leaseId: leaseContext.lease.id,
					subscriptionId: subscription.id,
					error: error.message
				}
			)
			await this.safeCancelStripeSubscription(subscription.id)
			throw new BadRequestException(
				'Failed to persist subscription configuration'
			)
		}

		leaseContext.lease.stripe_subscription_id = subscription.id
		leaseContext.lease.auto_pay_enabled = true
		leaseContext.lease.payment_day = billingDay
		leaseContext.lease.rent_amount = request.amount
		leaseContext.lease.rent_currency = currency

		// Invalidate lease cache
		await this.cache.invalidateLeaseCache(leaseContext.lease.id)
		await this.cache.invalidatePaymentMethodCache(
			leaseContext.tenant.id,
			paymentMethod.id
		)

		return this.queryService.mapLeaseContextToResponse(leaseContext, {
			stripeSubscription: subscription,
			paymentMethodId: paymentMethod.id
		})
	}

	/**
	 * Update subscription amount / payment method / billing day
	 */
	async updateSubscription(
		leaseId: string,
		userId: string,
		update: UpdateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		const leaseContext = await this.queryService.loadLeaseContext(leaseId)
		this.assertTenantUser(userId, leaseContext.tenantUser.id)
		this.ensureActiveSubscription(leaseContext.lease)

		const stripeUpdates: Stripe.SubscriptionUpdateParams = {}
		const adminUpdates: Partial<LeaseRow> = {}
		let nextPaymentMethodId: string | undefined

		if (typeof update.amount === 'number') {
			if (update.amount <= 0) {
				throw new BadRequestException('Amount must be greater than zero')
			}
			const normalizedAmount = this.normalizeStripeAmount(update.amount)
			const existingSubscription = await this.stripe.subscriptions.retrieve(
				leaseContext.lease.stripe_subscription_id!
			)
			const currentItem = existingSubscription.items.data[0]

			if (!currentItem?.price) {
				throw new BadRequestException(
					'Subscription price configuration missing'
				)
			}

			const productId =
				typeof currentItem.price.product === 'string'
					? currentItem.price.product
					: currentItem.price.product?.id

			if (!productId) {
				throw new BadRequestException('Subscription product missing')
			}

			const newPrice = await this.stripe.prices.create({
				product: productId,
				currency: currentItem.price.currency ?? 'usd',
				unit_amount: normalizedAmount,
				recurring: { interval: 'month' }
			})

			stripeUpdates.items = [
				{
					id: currentItem.id,
					price: newPrice.id
				}
			]

			leaseContext.lease.rent_amount = update.amount
			adminUpdates.rent_amount = update.amount
		}

		if (typeof update.billingDayOfMonth === 'number') {
			const billingDay = this.validateBillingDay(update.billingDayOfMonth)
			stripeUpdates.billing_cycle_anchor =
				'now' as Stripe.SubscriptionUpdateParams.BillingCycleAnchor
			stripeUpdates.proration_behavior = 'none'
			leaseContext.lease.payment_day = billingDay
			adminUpdates.payment_day = billingDay
		}

		if (update.paymentMethodId) {
			const paymentMethod = await this.queryService.getPaymentMethod(
				update.paymentMethodId
			)
			if (paymentMethod.tenant_id !== leaseContext.tenant.id) {
				throw new BadRequestException(
					'Payment method does not belong to tenant'
				)
			}
			stripeUpdates.default_payment_method =
				paymentMethod.stripe_payment_method_id
			nextPaymentMethodId = paymentMethod.id
		}

		let latestStripeSubscription: Stripe.Subscription | null = null

		if (Object.keys(stripeUpdates).length > 0) {
			latestStripeSubscription = await this.stripe.subscriptions.update(
				leaseContext.lease.stripe_subscription_id!,
				stripeUpdates
			)
		}

		if (Object.keys(adminUpdates).length > 0) {
			const { error } = await this.supabase
				.getAdminClient()
				.from('leases')
				.update(adminUpdates)
				.eq('id', leaseContext.lease.id)

			if (error) {
				this.logger.error('Failed to persist lease updates', {
					leaseId,
					error: error.message
				})
				throw new BadRequestException('Failed to update subscription')
			}
		}

		if (!latestStripeSubscription && Object.keys(stripeUpdates).length === 0) {
			// Nothing changed
			return this.queryService.mapLeaseContextToResponse(leaseContext)
		}

		// Invalidate lease cache
		await this.cache.invalidateLeaseCache(leaseContext.lease.id)
		if (nextPaymentMethodId) {
			await this.cache.invalidatePaymentMethodCache(
				leaseContext.tenant.id,
				nextPaymentMethodId
			)
		}

		return this.queryService.mapLeaseContextToResponse(leaseContext, {
			paymentMethodId: nextPaymentMethodId,
			stripeSubscription: latestStripeSubscription ?? undefined
		})
	}

	// Private helper methods

	private async requireTenantForUser(userId: string): Promise<{
		tenant: TenantRow
		user: UserRow
	}> {
		const tenantRecord = await this.queryService.findTenantByUserId(userId)
		if (!tenantRecord) {
			throw new BadRequestException('Tenant profile not found for user')
		}
		return tenantRecord
	}

	private assertTenantUser(
		requestingUserId: string,
		tenantUserId: string
	): void {
		if (requestingUserId !== tenantUserId) {
			throw new ForbiddenException(
				'You do not have access to this subscription'
			)
		}
	}

	private assertOwnerReady(owner: PropertyOwnerRow): void {
		if (!owner.stripe_account_id || owner.charges_enabled !== true) {
			throw new BadRequestException(
				'Owner has not completed Stripe Connect onboarding'
			)
		}
	}

	private ensureActiveSubscription(lease: LeaseRow): void {
		if (!lease.stripe_subscription_id) {
			throw new BadRequestException('Autopay is not enabled for this lease')
		}
	}

	private validateBillingDay(day: number): number {
		if (!Number.isInteger(day) || day < 1 || day > 28) {
			throw new BadRequestException('Billing day must be between 1 and 28')
		}
		return day
	}

	private normalizeStripeAmount(amount: number): number {
		const numericAmount = Number(amount)
		if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
			throw new BadRequestException('Amount must be greater than zero')
		}

		if (numericAmount < 1000000) {
			return Math.round(numericAmount * 100)
		}

		const rounded = Math.round(numericAmount)
		if (!Number.isInteger(rounded)) {
			throw new BadRequestException('Amount in cents must be an integer')
		}
		return rounded
	}

	private computeBillingCycleAnchor(dayOfMonth: number): number {
		const now = new Date()
		const anchor = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, 0, 0, 0, 0)
		)

		if (anchor.getTime() <= now.getTime()) {
			anchor.setUTCMonth(anchor.getUTCMonth() + 1)
		}

		return Math.floor(anchor.getTime() / 1000)
	}

	private async ensureStripeCustomerId(
		tenant: TenantRow,
		tenantUser: UserRow
	): Promise<string> {
		if (tenant.stripe_customer_id) {
			return tenant.stripe_customer_id
		}

		const customerPayload: Stripe.CustomerCreateParams = {
			email: tenantUser.email,
			metadata: {
				tenant_id: tenant.id,
				user_id: tenantUser.id
			}
		}
		const displayName = [tenantUser.first_name, tenantUser.last_name]
			.filter(Boolean)
			.join(' ')
			.trim()
		if (displayName) {
			customerPayload.name = displayName
		}

		const customer = await this.stripe.customers.create(customerPayload)

		const { error } = await this.supabase
			.getAdminClient()
			.from('tenants')
			.update({ stripe_customer_id: customer.id })
			.eq('id', tenant.id)

		if (error) {
			this.logger.error('Failed to persist new Stripe customer id', {
				tenantId: tenant.id,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to persist Stripe customer reference'
			)
		}

		return customer.id
	}

	private async safeCancelStripeSubscription(
		subscriptionId: string
	): Promise<void> {
		try {
			await this.stripe.subscriptions.cancel(subscriptionId)
		} catch (error) {
			this.logger.error('Failed to roll back Stripe subscription', {
				subscriptionId,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}
}
