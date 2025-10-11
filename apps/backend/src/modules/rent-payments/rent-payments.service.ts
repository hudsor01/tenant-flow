import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import type {
	Lease,
	RentPayment,
	RentSubscription,
	Tenant,
	TenantPaymentMethod,
	User
} from './types'

type PaymentMethodType = 'card' | 'ach'

@Injectable()
export class RentPaymentsService {
	private readonly logger = new Logger(RentPaymentsService.name)
	private readonly stripe: Stripe

	constructor(private readonly supabase: SupabaseService) {
		this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2025-08-27' as Stripe.LatestApiVersion
		})
	}

	/**
	 * Calculate platform fee based on landlord subscription tier.
	 * STARTER: 3%, GROWTH: 2.5%, TENANTFLOW_MAX: 2%
	 */
	calculatePlatformFee(amount: number, landlordTier: string): number {
		const tierPercentages: Record<string, number> = {
			STARTER: 3,
			GROWTH: 2.5,
			TENANTFLOW_MAX: 2
		}

		const feePercent = tierPercentages[landlordTier] ?? 3
		return Math.round(amount * (feePercent / 100))
	}

	/**
	 * Calculate Stripe processing fee (card: 2.9% + $0.30, ACH: 0.8% capped at $5)
	 */
	calculateStripeFee(amount: number, type: PaymentMethodType): number {
		if (type === 'card') {
			return Math.round(amount * 0.029 + 30)
		}
		return Math.min(Math.round(amount * 0.008), 500)
	}

	/**
	 * Aggregate all fees for reporting.
	 */
	calculateFees(
		amount: number,
		paymentType: PaymentMethodType,
		landlordTier: string
	) {
		const platformFee = this.calculatePlatformFee(amount, landlordTier)
		const stripeFee = this.calculateStripeFee(amount, paymentType)

		return {
			platformFee,
			stripeFee,
			landlordReceives: Math.max(amount - platformFee - stripeFee, 0),
			total: amount
		}
	}

	/**
	 * Accept both dollar and cent inputs and return an integer amount in cents.
	 */
	private normalizeAmount(amount: number): number {
		const numericAmount = Number(amount)
		if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
			throw new BadRequestException('Payment amount must be greater than zero')
		}

		if (numericAmount < 100000) {
			return Math.round(numericAmount * 100)
		}

		return Math.round(numericAmount)
	}

	private async getTenantContext(tenantId: string) {
		const adminClient = this.supabase.getAdminClient()

		const { data: tenant, error: tenantError } = await adminClient
			.from('tenant')
			.select('id, userId, email, firstName, lastName')
			.eq('id', tenantId)
			.single<Tenant>()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found when creating rent payment', {
				tenantId,
				error: tenantError?.message
			})
			throw new NotFoundException('Tenant not found')
		}

		if (!tenant.userId) {
			throw new BadRequestException('Tenant missing associated user account')
		}

		const { data: tenantUser, error: userError } = await adminClient
			.from('users')
			.select('id, stripeCustomerId, firstName, lastName, email')
			.eq('id', tenant.userId)
			.single<User>()

		if (userError || !tenantUser) {
			this.logger.error('Tenant user not found', {
				tenantId,
				userId: tenant.userId,
				error: userError?.message
			})
			throw new NotFoundException('Tenant user not found')
		}

		return { tenant, tenantUser }
	}

	private async getLeaseContext(leaseId: string, tenantId: string) {
		const adminClient = this.supabase.getAdminClient()

		const { data: lease, error: leaseError } = await adminClient
			.from('lease')
			.select('id, tenantId, rentAmount, unitId')
			.eq('id', leaseId)
			.single<Lease>()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		if (lease.tenantId !== tenantId) {
			throw new BadRequestException('Lease does not belong to tenant')
		}

		const { data: unit, error: unitError } = await adminClient
			.from('unit')
			.select('propertyId')
			.eq('id', lease.unitId)
			.single()

		if (unitError || !unit) {
			throw new NotFoundException('Unit not found for lease')
		}

		const { data: property, error: propertyError } = await adminClient
			.from('property')
			.select('ownerId')
			.eq('id', unit.propertyId)
			.single()

		if (propertyError || !property) {
			throw new NotFoundException('Property not found for lease')
		}

		const { data: landlord, error: landlordError } = await adminClient
			.from('users')
			.select('id, stripeAccountId, subscriptionTier')
			.eq('id', property.ownerId)
			.single<User>()

		if (landlordError || !landlord) {
			throw new NotFoundException('Landlord not found')
		}

		if (!landlord.stripeAccountId) {
			throw new BadRequestException(
				'Landlord has not completed Stripe Connect onboarding'
			)
		}

		return { lease, landlord }
	}

	/**
	 * Create a one-time rent payment destination charge in Stripe and persist it.
	 */
	async createOneTimePayment(
		params: {
			tenantId: string
			leaseId: string
			amount: number
			paymentMethodId: string
		},
		requestingUserId: string
	) {
		const { tenantId, leaseId, amount, paymentMethodId } = params

		if (!tenantId || !leaseId || !paymentMethodId) {
			throw new BadRequestException('Missing required payment details')
		}

		const adminClient = this.supabase.getAdminClient()
		const { tenant, tenantUser } = await this.getTenantContext(tenantId)
		const { lease, landlord } = await this.getLeaseContext(leaseId, tenantId)

		if (
			requestingUserId &&
			requestingUserId !== tenantUser.id &&
			requestingUserId !== landlord.id
		) {
			throw new ForbiddenException('You are not allowed to create this payment')
		}

		const amountInCents = this.normalizeAmount(amount)

		const { data: paymentMethod, error: paymentMethodError } = await adminClient
			.from('tenant_payment_method')
			.select('stripePaymentMethodId, type, stripeCustomerId')
			.eq('id', paymentMethodId)
			.eq('tenantId', tenantUser.id)
			.single<TenantPaymentMethod>()

		if (paymentMethodError || !paymentMethod) {
			throw new NotFoundException('Payment method not found')
		}

		const paymentType: PaymentMethodType =
			paymentMethod.type === 'us_bank_account' ? 'ach' : 'card'

		let stripeCustomerId =
			tenantUser.stripeCustomerId || paymentMethod.stripeCustomerId || null

		if (!stripeCustomerId) {
			const customer = await this.stripe.customers.create({
				email: tenant.email,
				name:
					tenant.firstName && tenant.lastName
						? `${tenant.firstName} ${tenant.lastName}`
						: tenant.email,
				metadata: {
					tenantId,
					tenantUserId: tenantUser.id,
					leaseId
				}
			})

			stripeCustomerId = customer.id

			await adminClient
				.from('users')
				.update({
					stripeCustomerId,
					updatedAt: new Date().toISOString()
				})
				.eq('id', tenantUser.id)
		}

		const fees = this.calculateFees(
			amountInCents,
			paymentType,
			landlord.subscriptionTier || 'STARTER'
		)

		const paymentIntent = await this.stripe.paymentIntents.create({
			amount: amountInCents,
			currency: 'usd',
			customer: stripeCustomerId,
			payment_method: paymentMethod.stripePaymentMethodId,
			confirm: true,
			off_session: true,
			application_fee_amount: fees.platformFee,
			transfer_data: {
				destination: landlord.stripeAccountId as string
			},
			metadata: {
				tenantId,
				tenantUserId: tenantUser.id,
				landlordId: landlord.id,
				leaseId,
				paymentType
			},
			expand: ['latest_charge']
		})

		const status =
			paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending'
		const now = new Date().toISOString()

		const { data: rentPayment, error: paymentError } = await adminClient
			.from('rent_payment')
			.insert({
				tenantId: tenantUser.id,
				landlordId: landlord.id,
				leaseId: lease.id,
				amount: amountInCents,
				platformFee: fees.platformFee,
				stripeFee: fees.stripeFee,
				landlordReceives: fees.landlordReceives,
				status,
				paymentType,
				stripePaymentIntentId: paymentIntent.id,
				paidAt: status === 'succeeded' ? now : null,
				createdAt: now
			})
			.select()
			.single<RentPayment>()

		if (paymentError || !rentPayment) {
			this.logger.error('Failed to create rent payment record', {
				tenantId,
				leaseId,
				error: paymentError?.message
			})
			throw new BadRequestException('Failed to save payment record')
		}

		const receiptUrl =
			typeof paymentIntent.latest_charge === 'object' &&
			paymentIntent.latest_charge
				? paymentIntent.latest_charge.receipt_url
				: undefined

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

	async getPaymentHistory(landlordId: string) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('rent_payment')
			.select(
				'id, tenantId, leaseId, amount, status, stripePaymentIntentId, subscriptionId, paymentType, failureReason, paidAt, createdAt, platformFee, stripeFee, landlordReceives, dueDate'
			)
			.eq('landlordId', landlordId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to load payment history', {
				landlordId,
				error: error.message
			})
			throw new BadRequestException('Failed to load payment history')
		}

		return (data as RentPayment[]) ?? []
	}

	async getSubscriptionPaymentHistory(
		subscriptionId: string,
		landlordId: string
	) {
		const adminClient = this.supabase.getAdminClient()

		const { data: subscription, error: subscriptionError } = await adminClient
			.from('rent_subscription')
			.select('id, landlordId')
			.eq('id', subscriptionId)
			.single<RentSubscription>()

		if (subscriptionError || !subscription) {
			throw new NotFoundException('Subscription not found')
		}

		if (subscription.landlordId !== landlordId) {
			throw new ForbiddenException('Access denied for subscription history')
		}

		const { data, error } = await adminClient
			.from('rent_payment')
			.select(
				'id, tenantId, leaseId, amount, status, stripePaymentIntentId, subscriptionId, paymentType, failureReason, paidAt, createdAt, platformFee, stripeFee, landlordReceives, dueDate'
			)
			.eq('subscriptionId', subscriptionId)
			.order('createdAt', { ascending: false })

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

	async getFailedPaymentAttempts(landlordId: string) {
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('rent_payment')
			.select(
				'id, tenantId, leaseId, amount, status, stripePaymentIntentId, failureReason, createdAt, subscriptionId, paymentType'
			)
			.eq('landlordId', landlordId)
			.eq('status', 'failed')
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch failed payment attempts', {
				landlordId,
				error: error.message
			})
			throw new BadRequestException('Failed to load failed payment attempts')
		}

		return (data as RentPayment[]) ?? []
	}

	async getSubscriptionFailedAttempts(
		subscriptionId: string,
		landlordId: string
	) {
		const adminClient = this.supabase.getAdminClient()

		const { data: subscription, error: subscriptionError } = await adminClient
			.from('rent_subscription')
			.select('id, landlordId')
			.eq('id', subscriptionId)
			.single<RentSubscription>()

		if (subscriptionError || !subscription) {
			throw new NotFoundException('Subscription not found')
		}

		if (subscription.landlordId !== landlordId) {
			throw new ForbiddenException('Access denied for subscription history')
		}

		const { data, error } = await adminClient
			.from('rent_payment')
			.select(
				'id, tenantId, leaseId, amount, status, stripePaymentIntentId, failureReason, createdAt, subscriptionId, paymentType'
			)
			.eq('subscriptionId', subscriptionId)
			.eq('status', 'failed')
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch subscription failed attempts', {
				subscriptionId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to load subscription failed attempts'
			)
		}

		return (data as RentPayment[]) ?? []
	}
}
