/**
 * Rent Payment Autopay Service
 * Handles autopay setup, cancellation, and status
 * Extracted from RentPaymentsService for SRP compliance
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type {
	CancelTenantAutopayParams,
	CancelTenantAutopayResponse,
	CreateTenantCustomerParams,
	GetAutopayStatusParams,
	SetupTenantAutopayParams,
	SetupTenantAutopayResponse,
	TenantAutopayStatusResponse
} from '@repo/shared/types/stripe'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { StripeTenantService } from '../billing/stripe-tenant.service'
import { RentPaymentContextService } from './rent-payment-context.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class RentPaymentAutopayService {
	private readonly stripe: Stripe

	constructor(private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly stripeTenantService: StripeTenantService,
		private readonly contextService: RentPaymentContextService, private readonly logger: AppLogger) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Setup autopay for tenant
	 */
	async setupTenantAutopay(
		params: SetupTenantAutopayParams,
		requestingUserId: string
	): Promise<SetupTenantAutopayResponse> {
		const { tenant_id, lease_id, paymentMethodId } = params
		const adminClient = this.supabase.getAdminClient()

		const { tenant, tenantUser } = await this.contextService.getTenantContext(tenant_id)
		const { lease, stripeAccountId } = await this.contextService.getLeaseContext(
			lease_id,
			tenant_id,
			requestingUserId
		)

		if (lease.stripe_subscription_id) {
			throw new BadRequestException('Autopay already enabled for this lease')
		}

		let stripeCustomer =
			await this.stripeTenantService.getStripeCustomerForTenant(tenant.id)
		if (!stripeCustomer) {
			const customerParams: CreateTenantCustomerParams = {
				tenant_id: tenant.id,
				email: tenantUser.email
			}
			if (tenantUser.full_name) {
				customerParams.name = tenantUser.full_name
			}
			if (tenantUser.phone) {
				customerParams.phone = tenantUser.phone
			}

			stripeCustomer =
				await this.stripeTenantService.createStripeCustomerForTenant(
					customerParams
				)
		}

		if (paymentMethodId) {
			await this.stripeTenantService.attachPaymentMethod({
				tenant_id,
				paymentMethodId,
				setAsDefault: true
			})
		}

		const amountInCents = lease.rent_amount
		const priceData =
			{
				currency: 'usd',
				product_data: {
					name: `Monthly Rent - Lease ${lease.id.slice(0, 8)}`
				},
				unit_amount: amountInCents,
				recurring: {
					interval: 'month'
				}
			} as unknown as Stripe.SubscriptionCreateParams.Item.PriceData

		const subscriptionPayload: Stripe.SubscriptionCreateParams = {
			customer: stripeCustomer.id,
			items: [
				{
					price_data: priceData
				}
			],
			metadata: {
				tenant_id,
				lease_id,
				paymentType: 'autopay'
			},
			expand: ['latest_invoice.payment_intent']
		}

		if (stripeAccountId) {
			subscriptionPayload.transfer_data = {
				destination: stripeAccountId
			}
		}

		const subscription = await this.stripe.subscriptions.create(
			subscriptionPayload,
			{
				idempotencyKey: `subscription-${tenant_id}-${lease_id}`
			}
		)

		const { error: updateError } = await adminClient
			.from('leases')
			.update({ stripe_subscription_id: subscription.id })
			.eq('id', lease_id)

		if (updateError) {
			this.logger.error('Failed to update lease with subscription_id', {
				lease_id,
				subscriptionId: subscription.id,
				error: updateError
			})
			await this.stripe.subscriptions
				.cancel(subscription.id)
				.catch(err =>
					this.logger.error('Failed to cancel orphaned subscription', {
						subscriptionId: subscription.id,
						error: err
					})
				)
			throw new BadRequestException('Failed to enable autopay')
		}

		return {
			subscriptionId: subscription.id,
			status: subscription.status
		}
	}

	/**
	 * Cancel autopay for tenant
	 */
	async cancelTenantAutopay(
		params: CancelTenantAutopayParams,
		requestingUserId: string
	): Promise<CancelTenantAutopayResponse> {
		const { tenant_id, lease_id } = params
		const adminClient = this.supabase.getAdminClient()

		await this.contextService.getLeaseContext(lease_id, tenant_id, requestingUserId)

		const { data: lease, error: leaseError } = await adminClient
			.from('leases')
			.select('stripe_subscription_id')
			.eq('id', lease_id)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		const subscriptionId = (
			lease as { stripe_subscription_id: string | null }
		).stripe_subscription_id

		if (!subscriptionId) {
			throw new BadRequestException('Autopay not enabled for this lease')
		}

		await this.stripe.subscriptions.cancel(subscriptionId)

		const { error: updateError } = await adminClient
			.from('leases')
			.update({ stripe_subscription_id: null })
			.eq('id', lease_id)

		if (updateError) {
			this.logger.error('Failed to remove subscription_id from lease', {
				lease_id,
				error: updateError
			})
			throw new BadRequestException('Failed to cancel autopay')
		}

		return { success: true }
	}

	/**
	 * Get autopay status for tenant
	 */
	async getAutopayStatus(
		params: GetAutopayStatusParams,
		requestingUserId: string
	): Promise<TenantAutopayStatusResponse> {
		const { tenant_id, lease_id } = params
		const adminClient = this.supabase.getAdminClient()

		await this.contextService.getLeaseContext(lease_id, tenant_id, requestingUserId)

		const { data: lease, error: leaseError } = await adminClient
			.from('leases')
			.select('stripe_subscription_id')
			.eq('id', lease_id)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		const subscriptionId = (
			lease as { stripe_subscription_id: string | null }
		).stripe_subscription_id

		if (!subscriptionId) {
			return {
				enabled: false,
				subscriptionId: null,
				status: null,
				nextPaymentDate: null
			}
		}

		const subscription =
			await this.stripe.subscriptions.retrieve(subscriptionId)
		const currentPeriodEnd =
			'current_period_end' in subscription
				? (subscription.current_period_end as number)
				: undefined
		const nextPaymentDate = currentPeriodEnd
			? new Date(currentPeriodEnd * 1000).toISOString()
			: null

		return {
			enabled: true,
			subscriptionId: subscription.id,
			status: subscription.status,
			nextPaymentDate
		}
	}
}