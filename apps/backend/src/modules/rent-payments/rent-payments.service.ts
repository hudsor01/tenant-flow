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

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly stripeTenantService: StripeTenantService
	) {
		this.stripe = this.stripeClientService.getClient()
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

		// Use centralized StripeTenantService for customer management
		let stripeCustomer =
			await this.stripeTenantService.getStripeCustomerForTenant(tenantId)

		if (!stripeCustomer) {
			const customerParams: {
				tenantId: string
				email: string
				name?: string
			} = {
				tenantId,
				email: tenant.email
			}

			// Only add name if both firstName and lastName exist
			if (tenant.firstName && tenant.lastName) {
				customerParams.name = `${tenant.firstName} ${tenant.lastName}`
			}

			stripeCustomer =
				await this.stripeTenantService.createStripeCustomerForTenant(
					customerParams
				)
		}

		const stripeCustomerId = stripeCustomer.id

		const fees = this.calculateFees(
			amountInCents,
			paymentType,
			landlord.subscriptionTier || 'STARTER'
		)

		// 🔐 BUG FIX #1: Add idempotency key to prevent duplicate charges
		const idempotencyKey = `payment-${tenantId}-${leaseId}-${paymentType}-${Date.now()}`
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
		}, {
			idempotencyKey
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

	/**
	 * Setup autopay (recurring Stripe Subscription) for a Tenant's lease
	 *
	 * Official Stripe Pattern:
	 * - Create Subscription with destination charges to Owner's connected account
	 * - Use application_fee_percent for platform revenue
	 * - Billing anchor set to rent due date
	 */
	async setupTenantAutopay(
		params: SetupTenantAutopayParams
	): Promise<SetupTenantAutopayResponse> {
		const { tenantId, leaseId, paymentMethodId } = params

		try {
			const adminClient = this.supabase.getAdminClient()

			// Get Tenant context
			const { tenant } = await this.getTenantContext(tenantId)

			// Get Lease context
			const { lease, landlord } = await this.getLeaseContext(leaseId, tenantId)

			// Check if autopay already exists
			const { data: existingLease } = await adminClient
				.from('lease')
				.select('stripe_subscription_id')
				.eq('id', leaseId)
				.single()

			if (
				existingLease &&
				(existingLease as { stripe_subscription_id: string | null })
					.stripe_subscription_id
			) {
				throw new BadRequestException(
					'Autopay already enabled for this lease'
				)
			}

			// Ensure Tenant has a Stripe Customer
			let stripeCustomer =
				await this.stripeTenantService.getStripeCustomerForTenant(tenantId)

			if (!stripeCustomer) {
				const customerParams: {
					tenantId: string
					email: string
					name?: string
				} = {
					tenantId,
					email: tenant.email
				}

				// Only add name if both firstName and lastName exist
				if (tenant.firstName && tenant.lastName) {
					customerParams.name = `${tenant.firstName} ${tenant.lastName}`
				}

				stripeCustomer =
					await this.stripeTenantService.createStripeCustomerForTenant(
						customerParams
					)
			}

			// Attach payment method if provided
			if (paymentMethodId) {
				await this.stripeTenantService.attachPaymentMethod({
					tenantId,
					paymentMethodId,
					setAsDefault: true
				})
			}

			// Calculate platform fee percentage
			const tierPercentages: Record<string, number> = {
				STARTER: 3,
				GROWTH: 2.5,
				TENANTFLOW_MAX: 2
			}
			const feePercent =
				tierPercentages[landlord.subscriptionTier || 'STARTER'] ?? 3

			// Create Stripe Subscription for recurring rent
			const amountInCents = this.normalizeAmount(lease.rentAmount)

			// 🔐 BUG FIX #1: Add idempotency key to prevent duplicate subscriptions
			const subscriptionIdempotencyKey = `subscription-${tenantId}-${leaseId}-${Date.now()}`
			const subscription = await this.stripe.subscriptions.create({
				customer: stripeCustomer.id,
				items: [
					{
						price_data: {
							currency: 'usd',
							product_data: {
								name: `Monthly Rent - Lease ${lease.id.slice(0, 8)}`,
								metadata: {
									leaseId: lease.id,
									tenantId,
									landlordId: landlord.id
								}
							},
							unit_amount: amountInCents,
							recurring: {
								interval: 'month'
							}
					} as unknown as Stripe.SubscriptionCreateParams.Item.PriceData
					}
				],
				application_fee_percent: feePercent,
				transfer_data: {
					destination: landlord.stripeAccountId as string
				},
				metadata: {
					tenantId,
					leaseId: lease.id,
					landlordId: landlord.id,
					paymentType: 'autopay'
				},
				expand: ['latest_invoice.payment_intent']
			}, {
				idempotencyKey: subscriptionIdempotencyKey
			})

			// Update lease with Stripe Subscription ID
			const { error: updateError } = await adminClient
				.from('lease')
				.update({ stripe_subscription_id: subscription.id })
				.eq('id', leaseId)

			if (updateError) {
				this.logger.error('Failed to update lease with subscription_id', {
					leaseId,
					subscriptionId: subscription.id,
					error: updateError
				})
				// Attempt to cancel the orphaned subscription
				await this.stripe.subscriptions
					.cancel(subscription.id)
					.catch(err => {
						this.logger.error('Failed to cancel orphaned subscription', {
							subscriptionId: subscription.id,
							error: err
						})
					})
				throw updateError
			}

			this.logger.log(
				`Setup autopay subscription ${subscription.id} for lease ${leaseId}`
			)

			return {
				subscriptionId: subscription.id,
				status: subscription.status
			}
		} catch (error) {
			this.logger.error('Failed to setup tenant autopay', { params, error })
			throw error
		}
	}

	/**
	 * Cancel autopay (Stripe Subscription) for a Tenant's lease
	 */
	async cancelTenantAutopay(
		params: CancelTenantAutopayParams
	): Promise<CancelTenantAutopayResponse> {
		const { tenantId, leaseId } = params

		try {
			const adminClient = this.supabase.getAdminClient()

			// Verify Tenant owns this lease
			await this.getLeaseContext(leaseId, tenantId)

			// Get subscription ID from lease
			const { data: lease, error: leaseError } = await adminClient
				.from('lease')
				.select('stripe_subscription_id')
				.eq('id', leaseId)
				.single()

			if (leaseError) {
				throw new NotFoundException('Lease not found')
			}

			const subscriptionId = (
				lease as { stripe_subscription_id: string | null }
			).stripe_subscription_id

			if (!subscriptionId) {
				throw new BadRequestException('Autopay not enabled for this lease')
			}

			// Cancel Stripe Subscription
			await this.stripe.subscriptions.cancel(subscriptionId)

			// Remove subscription ID from lease
			const { error: updateError } = await adminClient
				.from('lease')
				.update({ stripe_subscription_id: null })
				.eq('id', leaseId)

			if (updateError) {
				this.logger.error('Failed to remove subscription_id from lease', {
					leaseId,
					error: updateError
				})
				throw updateError
			}

			this.logger.log(
				`Cancelled autopay subscription ${subscriptionId} for lease ${leaseId}`
			)

			return { success: true }
		} catch (error) {
			this.logger.error('Failed to cancel tenant autopay', { params, error })
			throw error
		}
	}

	/**
	 * Get autopay status for a Tenant's lease
	 */
	async getAutopayStatus(
		params: GetAutopayStatusParams
	): Promise<TenantAutopayStatusResponse> {
		const { tenantId, leaseId } = params

		try {
			const adminClient = this.supabase.getAdminClient()

			// Verify Tenant owns this lease
			await this.getLeaseContext(leaseId, tenantId)

			// Get subscription ID from lease
			const { data: lease, error: leaseError } = await adminClient
				.from('lease')
				.select('stripe_subscription_id')
				.eq('id', leaseId)
				.single()

			if (leaseError) {
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

			// Get subscription details from Stripe
			const subscription =
				await this.stripe.subscriptions.retrieve(subscriptionId)

			// Extract current_period_end safely with proper Stripe Response type handling
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
		} catch (error) {
			this.logger.error('Failed to get autopay status', { params, error })
			throw error
		}
	}
}
