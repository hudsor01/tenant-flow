import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import Stripe from 'stripe'
import type {
	CancelTenantAutopayParams,
	CancelTenantAutopayResponse,
	CreateTenantCustomerParams,
	GetAutopayStatusParams,
	SetupTenantAutopayParams,
	SetupTenantAutopayResponse,
	TenantAutopayStatusResponse
} from '@repo/shared/types/stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { StripeTenantService } from '../billing/stripe-tenant.service'
import type {
	Lease,
	RentPayment,
	Tenant,
	TenantPaymentMethod,
	User
} from './types'
import type { CreatePaymentInput } from './dto/create-payment.dto'

type PaymentMethodType = 'card' | 'ach'

export interface CurrentPaymentStatus {
	status: 'PAID' | 'DUE' | 'OVERDUE' | 'PENDING'
	rentAmount: number
	nextDueDate: string | null
	lastPaymentDate: string | null
	outstandingBalance: number
	isOverdue: boolean
}

interface TenantContext {
	tenant: Tenant
	tenantUser: User
}

interface LeaseContext {
	lease: Lease
	ownerUser: User
}

@Injectable()
export class RentPaymentsService {
	private readonly logger = new Logger(RentPaymentsService.name)
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly stripeTenantService: StripeTenantService
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	private normalizeAmount(amount: number): number {
		const numericAmount = Number(amount)
		if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
			throw new BadRequestException('Payment amount must be greater than zero')
		}

		if (numericAmount < 1000000) {
			return Math.round(numericAmount * 100)
		}

		const roundedAmount = Math.round(numericAmount)
		if (!Number.isInteger(roundedAmount)) {
			throw new BadRequestException('Amount in cents must be an integer')
		}

		return roundedAmount
	}

	async createOneTimePayment(
		params: CreatePaymentInput,
		requestinguser_id: string
	) {
		const { tenant_id, lease_id, amount, paymentMethodId } = params

		if (!tenant_id || !lease_id || !paymentMethodId) {
			throw new BadRequestException('Missing required payment details')
		}

		const adminClient = this.supabase.getAdminClient()
		const { tenant, tenantUser } = await this.getTenantContext(tenant_id)
		const { lease, ownerUser } = await this.getLeaseContext(
			lease_id,
			tenant_id,
			requestinguser_id
		)

		const { data: paymentMethod, error: paymentMethodError } = await adminClient
			.from('payment_methods')
			.select('tenant_id, stripe_payment_method_id, type')
			.eq('id', paymentMethodId)
			.single<TenantPaymentMethod>()

		if (paymentMethodError || !paymentMethod) {
			throw new NotFoundException('Payment method not found')
		}

		if (paymentMethod.tenant_id !== tenant.id) {
			throw new ForbiddenException('Payment method not accessible')
		}

		const paymentType: PaymentMethodType =
			paymentMethod.type === 'us_bank_account' ? 'ach' : 'card'

		let stripeCustomer =
			await this.stripeTenantService.getStripeCustomerForTenant(tenant_id)

		if (!stripeCustomer) {
			const customerParams: CreateTenantCustomerParams = {
				tenant_id,
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

		const amountInCents = this.normalizeAmount(amount)
		const paymentIntentPayload: Stripe.PaymentIntentCreateParams = {
			amount: amountInCents,
			currency: 'usd',
			customer: stripeCustomer.id,
			payment_method: paymentMethod.stripe_payment_method_id,
			confirm: true,
			off_session: true,
			metadata: {
				tenant_id,
				lease_id,
				paymentType
			},
			expand: ['latest_charge']
		}
		if (ownerUser.connected_account_id) {
			paymentIntentPayload.transfer_data = {
				destination: ownerUser.connected_account_id
			}
		}

		const paymentIntent = await this.stripe.paymentIntents.create(
			paymentIntentPayload,
			{
				idempotencyKey: `payment-${tenant_id}-${lease_id}-${paymentType}-${paymentMethodId}`
			}
		)

		const receiptUrl =
			typeof paymentIntent.latest_charge === 'object' &&
			paymentIntent.latest_charge
				? paymentIntent.latest_charge.receipt_url
				: null

		const rentPayment = await this.recordRentPayment({
			tenant_id: tenant.id,
			lease_id: lease.id,
			amount: amountInCents,
			payment_method_type: paymentType.toUpperCase(),
			status: paymentIntent.status === 'succeeded' ? 'PAID' : 'PENDING',
			stripe_payment_intent_id: paymentIntent.id,
			due_date: new Date().toISOString()
		})

		return {
			payment: rentPayment,
			paymentIntent: {
				id: paymentIntent.id,
				status: paymentIntent.status,
				amount: paymentIntent.amount,
				receiptUrl
			}
		}
	}

	async getPaymentHistory(token: string) {
		if (!token) {
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to load payment history', {
				error: error.message
			})
			throw new BadRequestException('Failed to load payment history')
		}

		return (data as RentPayment[]) ?? []
	}

	async getSubscriptionPaymentHistory(subscriptionId: string, token: string) {
		const lease = await this.findLeaseBySubscription(subscriptionId, token)
		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.eq('lease_id', lease.id)
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to load subscription payment history', {
				subscriptionId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to load subscription payment history'
			)
		}

		return (data as RentPayment[]) ?? []
	}

	async getFailedPaymentAttempts(token: string) {
		if (!token) {
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.eq('status', 'FAILED')
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch failed payment attempts', {
				error: error.message
			})
			throw new BadRequestException('Failed to load failed payment attempts')
		}

		return (data as RentPayment[]) ?? []
	}

	async getSubscriptionFailedAttempts(subscriptionId: string, token: string) {
		const lease = await this.findLeaseBySubscription(subscriptionId, token)
		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.eq('lease_id', lease.id)
			.eq('status', 'FAILED')
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to load subscription failed attempts', {
				subscriptionId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to load subscription failed attempts'
			)
		}

		return (data as RentPayment[]) ?? []
	}

	async setupTenantAutopay(
		params: SetupTenantAutopayParams,
		requestinguser_id: string
	): Promise<SetupTenantAutopayResponse> {
		const { tenant_id, lease_id, paymentMethodId } = params
		const adminClient = this.supabase.getAdminClient()

		const { tenant, tenantUser } = await this.getTenantContext(tenant_id)
		const { lease, ownerUser } = await this.getLeaseContext(
			lease_id,
			tenant_id,
			requestinguser_id
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

		if (ownerUser.connected_account_id) {
			subscriptionPayload.transfer_data = {
				destination: ownerUser.connected_account_id
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

	async cancelTenantAutopay(
		params: CancelTenantAutopayParams,
		requestinguser_id: string
	): Promise<CancelTenantAutopayResponse> {
		const { tenant_id, lease_id } = params
		const adminClient = this.supabase.getAdminClient()

		await this.getLeaseContext(lease_id, tenant_id, requestinguser_id)

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

	async getAutopayStatus(
		params: GetAutopayStatusParams,
		requestinguser_id: string
	): Promise<TenantAutopayStatusResponse> {
		const { tenant_id, lease_id } = params
		const adminClient = this.supabase.getAdminClient()

		await this.getLeaseContext(lease_id, tenant_id, requestinguser_id)

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

	async getCurrentPaymentStatus(
		tenant_id: string,
		requestinguser_id: string
	): Promise<CurrentPaymentStatus> {
		const adminClient = this.supabase.getAdminClient()
		await this.verifyTenantAccess(requestinguser_id, tenant_id)

		const { data: lease, error: leaseError } = await adminClient
			.from('leases')
			.select('id, rent_amount, lease_status, start_date, end_date')
			.eq('primary_tenant_id', tenant_id)
			.eq('lease_status', 'ACTIVE')
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Active lease not found for tenant')
		}

		const rentAmount = lease.rent_amount || 0

		const { data: lastPayment } = await adminClient
			.from('rent_payments')
			.select('status, paid_date, due_date, amount')
			.eq('lease_id', lease.id)
			.order('due_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		let status: CurrentPaymentStatus['status'] = 'DUE'
		let outstandingBalance = rentAmount
		let nextDueDate: string | null = null
		let lastPaymentDate: string | null = null

		if (lastPayment) {
			lastPaymentDate = lastPayment.paid_date ?? null
			nextDueDate = lastPayment.due_date ?? lease.end_date ?? null
			if (lastPayment.status === 'PAID') {
				status = 'PAID'
				outstandingBalance = 0
			} else if (lastPayment.status === 'PENDING') {
				status = 'PENDING'
				outstandingBalance = rentAmount
			} else if (lastPayment.status === 'FAILED') {
				status = 'OVERDUE'
			}
		} else {
			nextDueDate = lease.start_date ?? null
		}

		const isOverdue =
			nextDueDate !== null && new Date(nextDueDate).getTime() < Date.now()
		if (isOverdue && status === 'DUE') {
			status = 'OVERDUE'
		}

		return {
			status,
			rentAmount,
			nextDueDate,
			lastPaymentDate,
			outstandingBalance,
			isOverdue
		}
	}

	private async recordRentPayment(payload: {
		tenant_id: string
		lease_id: string
		amount: number
		status: string
		payment_method_type: string
		stripe_payment_intent_id: string
		due_date: string
	}): Promise<RentPayment> {
		const adminClient = this.supabase.getAdminClient()
		const insertPayload = {
			tenant_id: payload.tenant_id,
			lease_id: payload.lease_id,
			amount: payload.amount,
			application_fee_amount: 0,
			currency: 'usd',
			due_date: payload.due_date,
			late_fee_amount: null,
			paid_date:
				payload.status === 'PAID' ? new Date().toISOString() : null,
			payment_method_type: payload.payment_method_type,
			period_start: payload.due_date,
			period_end: payload.due_date,
			status: payload.status,
			stripe_payment_intent_id: payload.stripe_payment_intent_id
		}

		const { data, error } = await adminClient
			.from('rent_payments')
			.insert(insertPayload)
			.select('*')
			.single()

		if (error || !data) {
			this.logger.error('Failed to create rent payment record', {
				error: error?.message
			})
			throw new BadRequestException('Failed to save payment record')
		}

		return data as RentPayment
	}

	private async getTenantContext(tenant_id: string): Promise<TenantContext> {
		const adminClient = this.supabase.getAdminClient()
		const { data: tenant, error: tenantError } = await adminClient
			.from('tenants')
			.select('*, users!inner(*)')
			.eq('id', tenant_id)
			.single()

		if (tenantError || !tenant) {
			throw new NotFoundException('Tenant not found')
		}

		const tenantUser = (tenant as Tenant & { users: User }).users
		return { tenant: tenant as Tenant, tenantUser }
	}

	private async getLeaseContext(
		lease_id: string,
		tenant_id: string,
		requestinguser_id: string
	): Promise<LeaseContext> {
		const adminClient = this.supabase.getAdminClient()
		const { data: lease, error: leaseError } = await adminClient
			.from('leases')
			.select('*')
			.eq('id', lease_id)
			.single<Lease>()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		if (lease.primary_tenant_id !== tenant_id) {
			throw new ForbiddenException('Lease does not belong to tenant')
		}

		const { data: unit, error: unitError } = await adminClient
			.from('units')
			.select('id, property_id')
			.eq('id', lease.unit_id)
			.single()

		if (unitError || !unit) {
			throw new NotFoundException('Unit not found for lease')
		}

		const { data: property, error: propertyError } = await adminClient
			.from('properties')
			.select('property_owner_id')
			.eq('id', unit.property_id)
			.single()

		if (propertyError || !property) {
			throw new NotFoundException('Property not found for lease')
		}

		const { data: owner, error: ownerError } = await adminClient
			.from('property_owners')
			.select('user_id')
			.eq('id', property.property_owner_id)
			.single()

		if (ownerError || !owner) {
			throw new NotFoundException('Property owner not found')
		}

		const { data: ownerUser, error: ownerUserError } = await adminClient
			.from('users')
			.select('*')
			.eq('id', owner.user_id)
			.single<User>()

		if (ownerUserError || !ownerUser) {
			throw new NotFoundException('Owner user not found')
		}

		const { tenant } = await this.getTenantContext(tenant_id)
		const isOwner = ownerUser.id === requestinguser_id
		const isTenant = tenant.user_id === requestinguser_id

		if (!isOwner && !isTenant) {
			throw new ForbiddenException('You are not authorized to access this lease')
		}

		return { lease, ownerUser }
	}

	private async verifyTenantAccess(
		requestinguser_id: string,
		tenant_id: string
	) {
		const adminClient = this.supabase.getAdminClient()
		const { tenant } = await this.getTenantContext(tenant_id)

		if (tenant.user_id === requestinguser_id) {
			return
		}

		const { data: owner, error } = await adminClient
			.from('property_owners')
			.select('user_id')
			.eq('user_id', requestinguser_id)
			.single()

		if (error || !owner) {
			throw new ForbiddenException('You are not authorized to access this tenant')
		}
	}

	private async findLeaseBySubscription(
		subscriptionId: string,
		token: string
	): Promise<Lease> {
		if (!token) {
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('leases')
			.select('*')
			.eq('stripe_subscription_id', subscriptionId)
			.single()

		if (error || !data) {
			throw new NotFoundException('Subscription not found')
		}

		return data as Lease
	}
}
