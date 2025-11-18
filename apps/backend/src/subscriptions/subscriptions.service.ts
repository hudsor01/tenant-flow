/**
 * Subscriptions Service
 * Phase 4: Autopay Subscriptions
 *
 * Rewritten against the latest Supabase schema so every query maps to real tables.
 * All access is enforced through typed helpers to avoid the old wildcard selects.
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	SubscriptionActionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/api-contracts'
import type { SubscriptionStatus } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'

type LeaseRow = Database['public']['Tables']['leases']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']
type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row']
type UnitRow = Database['public']['Tables']['units']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type PropertyOwnerRow = Database['public']['Tables']['property_owners']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

interface LeaseContext {
	lease: LeaseRow
	tenant: TenantRow
	tenantUser: UserRow
	unit: UnitRow
	property: PropertyRow
	owner: PropertyOwnerRow
}

@Injectable()
export class SubscriptionsService {
	private readonly logger = new Logger(SubscriptionsService.name)
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService
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
		const leaseContext = await this.loadLeaseContext(request.leaseId)

		if (leaseContext.tenant.id !== tenantContext.tenant.id) {
			throw new BadRequestException('Lease does not belong to tenant')
		}

		if (leaseContext.lease.stripe_subscription_id) {
			throw new BadRequestException('Autopay is already enabled for this lease')
		}

		const paymentMethod = await this.getPaymentMethod(request.paymentMethodId)
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
		const currency = (request.currency ?? leaseContext.lease.rent_currency ?? 'usd').toLowerCase()
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
			...(leaseContext.owner.default_platform_fee_percent ? { application_fee_percent: leaseContext.owner.default_platform_fee_percent } : {}),
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
			this.logger.error('Failed to persist subscription metadata, cancelling Stripe subscription', {
				leaseId: leaseContext.lease.id,
				subscriptionId: subscription.id,
				error: error.message
			})
			await this.safeCancelStripeSubscription(subscription.id)
			throw new BadRequestException('Failed to persist subscription configuration')
		}

		leaseContext.lease.stripe_subscription_id = subscription.id
		leaseContext.lease.auto_pay_enabled = true
		leaseContext.lease.payment_day = billingDay
		leaseContext.lease.rent_amount = request.amount
		leaseContext.lease.rent_currency = currency

		return this.mapLeaseContextToResponse(leaseContext, {
			stripeSubscription: subscription,
			paymentMethodId: paymentMethod.id
		})
	}

	/**
	 * Get subscription by lease id
	 */
	async getSubscription(
		leaseId: string,
		userId: string
	): Promise<RentSubscriptionResponse> {
		const leaseContext = await this.loadLeaseContext(leaseId)
		this.assertLeaseAccess(leaseContext, userId)

		if (!leaseContext.lease.stripe_subscription_id) {
			throw new NotFoundException('Subscription not found for this lease')
		}

		return this.mapLeaseContextToResponse(leaseContext)
	}

	/**
	 * List subscriptions for current user (tenant or owner context)
	 */
	async listSubscriptions(userId: string): Promise<RentSubscriptionResponse[]> {
		const adminClient = this.supabase.getAdminClient()
		const [tenantRecord, ownerRecord] = await Promise.all([
			this.findTenantByUserId(userId),
			this.findOwnerByUserId(userId)
		])

		if (!tenantRecord && !ownerRecord) {
			return []
		}

		const leases = new Map<string, LeaseRow>()

		if (tenantRecord) {
			const tenantLeases = await this.getLeasesForTenant(
				tenantRecord.tenant.id,
				adminClient
			)
			tenantLeases.forEach(lease => leases.set(lease.id, lease))
		}

		if (ownerRecord) {
			const ownerLeases = await this.getLeasesForOwner(ownerRecord.owner.id, adminClient)
			ownerLeases.forEach(lease => leases.set(lease.id, lease))
		}

		if (leases.size === 0) {
			return []
		}

		const contexts = await Promise.all(
			Array.from(leases.values()).map(lease => this.loadLeaseContext(lease.id))
		)

		const responses: RentSubscriptionResponse[] = []
		for (const context of contexts) {
			if (!context.lease.stripe_subscription_id) {
				continue
			}
			responses.push(await this.mapLeaseContextToResponse(context))
		}

		return responses.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
	}

	/**
	 * Pause subscription
	 */
	async pauseSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const leaseContext = await this.loadLeaseContext(leaseId)
		this.assertTenantUser(userId, leaseContext.tenantUser.id)
		this.ensureActiveSubscription(leaseContext.lease)

		const stripeSubscription = await this.stripe.subscriptions.update(
			leaseContext.lease.stripe_subscription_id!,
			{
				pause_collection: { behavior: 'keep_as_draft' }
			}
		)

		const { error } = await this.supabase
			.getAdminClient()
			.from('leases')
			.update({ auto_pay_enabled: false })
			.eq('id', leaseContext.lease.id)

		if (error) {
			this.logger.error('Failed to update lease pause flag', {
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to update subscription status')
		}

		leaseContext.lease.auto_pay_enabled = false

		return {
			success: true,
			subscription: await this.mapLeaseContextToResponse(leaseContext, {
				stripeSubscription
			}),
			message: 'Subscription paused successfully'
		}
	}

	/**
	 * Resume subscription
	 */
	async resumeSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const leaseContext = await this.loadLeaseContext(leaseId)
		this.assertTenantUser(userId, leaseContext.tenantUser.id)
		this.ensureActiveSubscription(leaseContext.lease)

		const stripeSubscription = await this.stripe.subscriptions.update(
			leaseContext.lease.stripe_subscription_id!,
			{
				pause_collection: null
			}
		)

		const { error } = await this.supabase
			.getAdminClient()
			.from('leases')
			.update({ auto_pay_enabled: true })
			.eq('id', leaseContext.lease.id)

		if (error) {
			this.logger.error('Failed to update lease resume flag', {
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to update subscription status')
		}

		leaseContext.lease.auto_pay_enabled = true

		return {
			success: true,
			subscription: await this.mapLeaseContextToResponse(leaseContext, {
				stripeSubscription
			}),
			message: 'Subscription resumed successfully'
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const leaseContext = await this.loadLeaseContext(leaseId)
		this.assertTenantUser(userId, leaseContext.tenantUser.id)
		this.ensureActiveSubscription(leaseContext.lease)

		const stripeSubscription = await this.stripe.subscriptions.update(
			leaseContext.lease.stripe_subscription_id!,
			{ cancel_at_period_end: true }
		)

		const { error } = await this.supabase
			.getAdminClient()
			.from('leases')
			.update({
				auto_pay_enabled: false,
				stripe_subscription_id: null
			})
			.eq('id', leaseContext.lease.id)

		if (error) {
			this.logger.error('Failed to clear lease subscription id after cancel', {
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to update subscription status')
		}

		leaseContext.lease.auto_pay_enabled = false
		leaseContext.lease.stripe_subscription_id = null

		return {
			success: true,
			subscription: await this.mapLeaseContextToResponse(leaseContext, {
				stripeSubscription
			}),
			message: 'Subscription will be canceled at the end of the current period'
		}
	}

	/**
	 * Update subscription amount / payment method / billing day
	 */
	async updateSubscription(
		leaseId: string,
		userId: string,
		update: UpdateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		const leaseContext = await this.loadLeaseContext(leaseId)
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
				throw new BadRequestException('Subscription price configuration missing')
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
			stripeUpdates.billing_cycle_anchor = 'now' as Stripe.SubscriptionUpdateParams.BillingCycleAnchor
			stripeUpdates.proration_behavior = 'none'
			leaseContext.lease.payment_day = billingDay
			adminUpdates.payment_day = billingDay
		}

		if (update.paymentMethodId) {
			const paymentMethod = await this.getPaymentMethod(update.paymentMethodId)
			if (paymentMethod.tenant_id !== leaseContext.tenant.id) {
				throw new BadRequestException('Payment method does not belong to tenant')
			}
			stripeUpdates.default_payment_method = paymentMethod.stripe_payment_method_id
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
			return this.mapLeaseContextToResponse(leaseContext)
		}

		return this.mapLeaseContextToResponse(leaseContext, {
			paymentMethodId: nextPaymentMethodId,
			stripeSubscription: latestStripeSubscription ?? undefined
		})
	}

	private assertTenantUser(requestingUserId: string, tenantUserId: string): void {
		if (requestingUserId !== tenantUserId) {
			throw new ForbiddenException('You do not have access to this subscription')
		}
	}

	private assertOwnerReady(owner: PropertyOwnerRow): void {
		if (!owner.stripe_account_id || owner.charges_enabled !== true) {
			throw new BadRequestException('Owner has not completed Stripe Connect onboarding')
		}
	}

	private assertLeaseAccess(context: LeaseContext, userId: string): void {
		if (context.tenantUser.id === userId || context.owner.user_id === userId) {
			return
		}

		throw new ForbiddenException('You are not authorized to view this subscription')
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
			Date.UTC(
				now.getUTCFullYear(),
				now.getUTCMonth(),
				dayOfMonth,
				0,
				0,
				0,
				0
			)
		)

		if (anchor.getTime() <= now.getTime()) {
			anchor.setUTCMonth(anchor.getUTCMonth() + 1)
		}

		return Math.floor(anchor.getTime() / 1000)
	}

	private async requireTenantForUser(userId: string): Promise<{
		tenant: TenantRow
		user: UserRow
	}> {
		const tenantRecord = await this.findTenantByUserId(userId)
		if (!tenantRecord) {
			throw new BadRequestException('Tenant profile not found for user')
		}
		return tenantRecord
	}

	private async findTenantByUserId(userId: string): Promise<{
		tenant: TenantRow
		user: UserRow
	} | null> {
		const adminClient = this.supabase.getAdminClient()

		const { data: tenant, error } = await adminClient
			.from('tenants')
			.select('id, stripe_customer_id, user_id')
			.eq('user_id', userId)
			.maybeSingle<TenantRow>()

		if (error) {
			this.logger.error('Failed to fetch tenant by user id', { userId, error: error.message })
			throw new BadRequestException('Failed to load tenant profile')
		}

		if (!tenant) {
			return null
		}

		const tenantUser = await this.getUserById(tenant.user_id)
		return { tenant, user: tenantUser }
	}

	private async findOwnerByUserId(userId: string): Promise<{
		owner: PropertyOwnerRow
	} | null> {
		const adminClient = this.supabase.getAdminClient()
		const { data: owner, error } = await adminClient
			.from('property_owners')
			.select('id, user_id, stripe_account_id, charges_enabled, default_platform_fee_percent')
			.eq('user_id', userId)
			.maybeSingle<PropertyOwnerRow>()

		if (error) {
			this.logger.error('Failed to fetch property owner by user id', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to load owner profile')
		}

		return owner ? { owner } : null
	}

	private async getLeasesForTenant(
		tenantId: string,
		adminClient: ReturnType<SupabaseService['getAdminClient']>
	): Promise<LeaseRow[]> {
		const { data, error } = await adminClient
			.from('leases')
			.select(
				'id, primary_tenant_id, rent_amount, rent_currency, payment_day, auto_pay_enabled, stripe_subscription_id, unit_id, created_at, updated_at'
			)
			.eq('primary_tenant_id', tenantId)
			.not('stripe_subscription_id', 'is', null)

		if (error) {
			this.logger.error('Failed to load tenant leases', {
				tenantId,
				error: error.message
			})
			throw new BadRequestException('Failed to load subscriptions')
		}

		return (data as LeaseRow[]) ?? []
	}

	private async getLeasesForOwner(
		ownerId: string,
		adminClient: ReturnType<SupabaseService['getAdminClient']>
	): Promise<LeaseRow[]> {
		const { data: properties, error: propertiesError } = await adminClient
			.from('properties')
			.select('id')
			.eq('property_owner_id', ownerId)

		if (propertiesError) {
			this.logger.error('Failed to load owner properties', {
				ownerId,
				error: propertiesError.message
			})
			throw new BadRequestException('Failed to load owner subscriptions')
		}

		const propertyIds = (properties as Array<{ id: string }>).map(p => p.id)
		if (propertyIds.length === 0) {
			return []
		}

		const { data: units, error: unitsError } = await adminClient
			.from('units')
			.select('id')
			.in('property_id', propertyIds)

		if (unitsError) {
			this.logger.error('Failed to load units for owner properties', {
				ownerId,
				error: unitsError.message
			})
			throw new BadRequestException('Failed to load owner subscriptions')
		}

		const unitIds = (units as Array<{ id: string }>).map(u => u.id)
		if (unitIds.length === 0) {
			return []
		}

		const { data: leases, error: leasesError } = await adminClient
			.from('leases')
			.select(
				'id, primary_tenant_id, rent_amount, rent_currency, payment_day, auto_pay_enabled, stripe_subscription_id, unit_id, created_at, updated_at'
			)
			.in('unit_id', unitIds)
			.not('stripe_subscription_id', 'is', null)

		if (leasesError) {
			this.logger.error('Failed to load leases for owner units', {
				ownerId,
				error: leasesError.message
			})
			throw new BadRequestException('Failed to load owner subscriptions')
		}

		return (leases as LeaseRow[]) ?? []
	}

	private async loadLeaseContext(leaseId: string): Promise<LeaseContext> {
		const adminClient = this.supabase.getAdminClient()
		const { data: lease, error: leaseError } = await adminClient
			.from('leases')
			.select(
				'id, primary_tenant_id, rent_amount, rent_currency, payment_day, auto_pay_enabled, stripe_subscription_id, unit_id, created_at, updated_at'
			)
			.eq('id', leaseId)
			.single<LeaseRow>()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		const tenant = await this.getTenantById(lease.primary_tenant_id)
		const tenantUser = await this.getUserById(tenant.user_id)
		const unit = await this.getUnitById(lease.unit_id)
		const property = await this.getPropertyById(unit.property_id)
		const owner = await this.getPropertyOwnerById(property.property_owner_id)

		return {
			lease,
			tenant,
			tenantUser,
			unit,
			property,
			owner
		}
	}

	private async getTenantById(tenantId: string): Promise<TenantRow> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('tenants')
			.select('id, stripe_customer_id, user_id')
			.eq('id', tenantId)
			.single<TenantRow>()

		if (error || !data) {
			throw new NotFoundException('Tenant not found')
		}
		return data
	}

	private async getUserById(userId: string): Promise<UserRow> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('id, email, first_name, last_name')
			.eq('id', userId)
			.single<UserRow>()

		if (error || !data) {
			throw new NotFoundException('User profile not found')
		}

		return data
	}

	private async getUnitById(unitId: string): Promise<UnitRow> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('units')
			.select('id, unit_number, property_id')
			.eq('id', unitId)
			.single<UnitRow>()

		if (error || !data) {
			throw new NotFoundException('Unit not found for lease')
		}

		return data
	}

	private async getPropertyById(propertyId: string): Promise<PropertyRow> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('properties')
			.select('id, name, property_owner_id')
			.eq('id', propertyId)
			.single<PropertyRow>()

		if (error || !data) {
			throw new NotFoundException('Property not found for lease')
		}

		return data
	}

	private async getPropertyOwnerById(ownerId: string): Promise<PropertyOwnerRow> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('property_owners')
			.select(
				'id, user_id, stripe_account_id, charges_enabled, default_platform_fee_percent'
			)
			.eq('id', ownerId)
			.single<PropertyOwnerRow>()

		if (error || !data) {
			throw new NotFoundException('Property owner not found')
		}

		return data
	}

	private async getPaymentMethod(id: string): Promise<PaymentMethodRow> {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('payment_methods')
			.select('*')
			.eq('id', id)
			.single<PaymentMethodRow>()

		if (error || !data) {
			throw new NotFoundException('Payment method not found')
		}

		return data
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
		const displayName = [tenantUser.first_name, tenantUser.last_name].filter(Boolean).join(' ').trim()
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
			throw new BadRequestException('Failed to persist Stripe customer reference')
		}

		return customer.id
	}

	private async mapLeaseContextToResponse(
		context: LeaseContext,
		options: {
			paymentMethodId?: string | undefined
			stripeSubscription?: Stripe.Subscription | null | undefined
		} = {}
	): Promise<RentSubscriptionResponse> {
		const stripeSubscription =
			options.stripeSubscription ??
			(context.lease.stripe_subscription_id
				? await this.fetchStripeSubscription(context.lease.stripe_subscription_id)
				: null)

		const paymentMethodId =
			options.paymentMethodId ??
			(await this.resolvePaymentMethodId(context.tenant.id))

		const status: SubscriptionStatus =
			(stripeSubscription?.status as SubscriptionStatus | undefined) ??
			(context.lease.auto_pay_enabled ? 'active' : 'paused')

		const subscriptionWithPeriod = stripeSubscription as Stripe.Subscription & {
			current_period_end?: number
		}
		const nextChargeDate = subscriptionWithPeriod?.current_period_end
			? this.toIso(subscriptionWithPeriod.current_period_end)
			: null

		return {
			id: context.lease.id,
			leaseId: context.lease.id,
			tenantId: context.tenant.id,
			ownerId: context.owner.user_id,
			stripeSubscriptionId: context.lease.stripe_subscription_id ?? stripeSubscription?.id ?? '',
			stripeCustomerId:
				context.tenant.stripe_customer_id ??
				(stripeSubscription?.customer as string | undefined) ??
				'',
			paymentMethodId,
			amount: context.lease.rent_amount,
			currency: context.lease.rent_currency ?? 'usd',
			billingDayOfMonth: context.lease.payment_day ?? 1,
			nextChargeDate,
			status,
			platformFeePercentage: context.owner.default_platform_fee_percent ?? 0,
			pausedAt: stripeSubscription?.pause_collection ? new Date().toISOString() : null,
			canceledAt: this.toIso(stripeSubscription?.canceled_at),
			createdAt: context.lease.created_at ?? new Date().toISOString(),
			updatedAt: context.lease.updated_at ?? context.lease.created_at ?? new Date().toISOString()
		}
	}

	private async resolvePaymentMethodId(
		tenantId: string,
		preferred?: string
	): Promise<string> {
		if (preferred) return preferred

		const adminClient = this.supabase.getAdminClient()
		const { data: defaultMethod } = await adminClient
			.from('payment_methods')
			.select('id')
			.eq('tenant_id', tenantId)
			.eq('is_default', true)
			.maybeSingle<{ id: string }>()

		if (defaultMethod?.id) {
			return defaultMethod.id
		}

		const { data: fallback } = await adminClient
			.from('payment_methods')
			.select('id')
			.eq('tenant_id', tenantId)
			.order('created_at', { ascending: true })
			.limit(1)
			.maybeSingle<{ id: string }>()

		return fallback?.id ?? ''
	}

	private async fetchStripeSubscription(
		subscriptionId: string
	): Promise<Stripe.Subscription | null> {
		try {
			return await this.stripe.subscriptions.retrieve(subscriptionId)
		} catch (error) {
			this.logger.warn('Unable to fetch Stripe subscription', {
				subscriptionId,
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}

	private async safeCancelStripeSubscription(subscriptionId: string): Promise<void> {
		try {
			await this.stripe.subscriptions.cancel(subscriptionId)
		} catch (error) {
			this.logger.error('Failed to roll back Stripe subscription', {
				subscriptionId,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	private toIso(value?: number | null): string | null {
		if (!value) {
			return null
		}
		return new Date(value * 1000).toISOString()
	}
}
