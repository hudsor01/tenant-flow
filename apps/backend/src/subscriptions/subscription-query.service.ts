/**
 * Subscription Query Service
 * Handles read operations + data loading + response mapping
 * Extracted from SubscriptionsService for SRP compliance
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type { RentSubscriptionResponse } from '@repo/shared/types/api-contracts'
import type { SubscriptionStatus } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionCacheService } from './subscription-cache.service'

type LeaseRow = Database['public']['Tables']['leases']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']
type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row']
type UnitRow = Database['public']['Tables']['units']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type PropertyOwnerRow = Database['public']['Tables']['property_owners']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

export interface LeaseContext {
	lease: LeaseRow
	tenant: TenantRow
	tenantUser: UserRow
	unit: UnitRow
	property: PropertyRow
	owner: PropertyOwnerRow
}

@Injectable()
export class SubscriptionQueryService {
	private readonly logger = new Logger(SubscriptionQueryService.name)
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly cache: SubscriptionCacheService
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Get subscription by lease ID
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

		return responses.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
	}

	/**
	 * Load full lease context with all relationships
	 */
	async loadLeaseContext(leaseId: string): Promise<LeaseContext> {
		return this.cache.getLeaseContext(leaseId, async () => {
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
		})
	}

	/**
	 * Map lease context to API response format
	 */
	async mapLeaseContextToResponse(
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
			nextChargeDate: nextChargeDate ?? undefined,
			status,
			platformFeePercentage: context.owner.default_platform_fee_percent ?? 0,
			pausedAt: stripeSubscription?.pause_collection ? new Date().toISOString() : undefined,
			canceledAt: this.toIso(stripeSubscription?.canceled_at) ?? undefined,
			createdAt: context.lease.created_at ?? new Date().toISOString(),
			updatedAt: context.lease.updated_at ?? context.lease.created_at ?? new Date().toISOString()
		}
	}

	/**
	 * Get payment method by ID
	 */
	async getPaymentMethod(id: string): Promise<PaymentMethodRow> {
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

	/**
	 * Find tenant by user ID
	 */
	async findTenantByUserId(userId: string): Promise<{
		tenant: TenantRow
		user: UserRow
	} | null> {
		return this.cache.getTenantByUserId(userId, async () => {
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
		})
	}

	/**
	 * Find owner by user ID
	 */
	async findOwnerByUserId(userId: string): Promise<{
		owner: PropertyOwnerRow
	} | null> {
		const owner = await this.cache.getOwnerByUserId(userId, async () => {
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

			return owner
		})

		return owner ? { owner } : null
	}

	// Private helper methods

	private assertLeaseAccess(context: LeaseContext, userId: string): void {
		if (context.tenantUser.id === userId || context.owner.user_id === userId) {
			return
		}

		throw new ForbiddenException('You are not authorized to view this subscription')
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

	private async getTenantById(tenantId: string): Promise<TenantRow> {
		return this.cache.getTenantById(tenantId, async () => {
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
		})
	}

	private async getUserById(userId: string): Promise<UserRow> {
		return this.cache.getUserById(userId, async () => {
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
		})
	}

	private async getUnitById(unitId: string): Promise<UnitRow> {
		return this.cache.getUnitById(unitId, async () => {
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
		})
	}

	private async getPropertyById(propertyId: string): Promise<PropertyRow> {
		return this.cache.getPropertyById(propertyId, async () => {
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
		})
	}

	private async getPropertyOwnerById(ownerId: string): Promise<PropertyOwnerRow> {
		return this.cache.getPropertyOwnerById(ownerId, async () => {
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
		})
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

	private toIso(value?: number | null): string | null {
		if (!value) {
			return null
		}
		return new Date(value * 1000).toISOString()
	}
}
