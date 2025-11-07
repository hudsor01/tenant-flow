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

/**
 * Current payment status for a tenant
 *
 * **All amounts in CENTS (Stripe standard)**
 */
export interface CurrentPaymentStatus {
	/** Payment status: PAID, DUE, OVERDUE, or PENDING */
	status: 'PAID' | 'DUE' | 'OVERDUE' | 'PENDING'
	/** Monthly rent amount in CENTS */
	rentAmount: number
	/** Next payment due date (ISO string) or null */
	nextDueDate: string | null
	/** Last payment date (ISO string) or null */
	lastPaymentDate: string | null
	/** Outstanding balance in CENTS */
	outstandingBalance: number
	/** Whether there are overdue payments */
	isOverdue: boolean
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

	/**
	 * ✅ RLS COMPLIANT: Uses admin client for cross-user tenant context
	 * (Tenants need to be accessible by both tenant and owner)
	 */
	private async getTenantContext(tenantId: string) {
		const adminClient = this.supabase.getAdminClient()

		const { data: tenant, error: tenantError } = await adminClient
			.from('tenant')
			.select('id, userId, auth_user_id, email, firstName, lastName, status')
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

	/**
	 * ✅ AUTHORIZATION ENFORCED: Validates requesting user has access to lease context
	 * Uses admin client for cross-user queries but enforces authorization checks
	 *
	 * @param leaseId - The lease ID to fetch context for
	 * @param tenantId - The tenant ID associated with the lease
	 * @param requestingUserId - The user making the request (for authorization)
	 * @throws ForbiddenException if user is not authorized
	 */
	private async getLeaseContext(
		leaseId: string,
		tenantId: string,
		requestingUserId?: string
	) {
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

		// Get propertyId either from unit or directly from lease
		let propertyId: string
		if (lease.unitId) {
			const { data: unit, error: unitError } = await adminClient
				.from('unit')
				.select('propertyId')
				.eq('id', lease.unitId)
				.single()

			if (unitError || !unit) {
				throw new NotFoundException('Unit not found for lease')
			}
			propertyId = unit.propertyId
		} else {
			// For single-family properties without units, fetch property directly from lease
			const { data: leaseWithProperty, error: leasePropertyError } =
				await adminClient
					.from('lease')
					.select('propertyId')
					.eq('id', leaseId)
					.single()

			if (
				leasePropertyError ||
				!leaseWithProperty ||
				!leaseWithProperty.propertyId
			) {
				throw new NotFoundException('Property not found for lease')
			}
			propertyId = leaseWithProperty.propertyId
		}

		const { data: property, error: propertyError } = await adminClient
			.from('property')
			.select('ownerId')
			.eq('id', propertyId)
			.single()

		if (propertyError || !property) {
			throw new NotFoundException('Property not found for lease')
		}

		const { data: owner, error: ownerError } = await adminClient
			.from('users')
			.select('id, stripeAccountId, subscriptionTier')
			.eq('id', property.ownerId)
			.single<User>()

		if (ownerError || !owner) {
			throw new NotFoundException('owner not found')
		}

		if (!owner.stripeAccountId) {
			throw new BadRequestException(
				'owner has not completed Stripe Connect onboarding'
			)
		}

		// Authorization check: verify requesting user has access to this lease context
		if (requestingUserId) {
			// Get tenant user to check authorization
			const { data: tenantRecord, error: tenantRecordError } = await adminClient
				.from('tenant')
				.select('userId, auth_user_id')
				.eq('id', tenantId)
				.single()

			if (tenantRecordError || !tenantRecord) {
				throw new NotFoundException('Tenant user not found')
			}

			const tenantAuthId = tenantRecord.auth_user_id
			const isAuthorized =
				requestingUserId === tenantAuthId || // User is the tenant
				requestingUserId === owner.id // User is the owner

			if (!isAuthorized) {
				throw new ForbiddenException(
					'You are not authorized to access this lease context'
				)
			}
		}

		return { lease, owner }
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
		// Authorization is now handled within getLeaseContext
		const { lease, owner } = await this.getLeaseContext(
			leaseId,
			tenantId,
			requestingUserId
		)

		const amountInCents = this.normalizeAmount(amount)

		const { data: paymentMethod, error: paymentMethodError } = await adminClient
			.from('tenant_payment_method')
			.select('tenantId, stripePaymentMethodId, type, stripeCustomerId')
			.eq('id', paymentMethodId)
			.single<TenantPaymentMethod>()

		if (paymentMethodError || !paymentMethod) {
			throw new NotFoundException('Payment method not found')
		}

		if (paymentMethod.tenantId !== tenant.id) {
			this.logger.warn('Payment method does not belong to tenant', {
				requestingUserId,
				tenantId,
				tenantRecordId: tenant.id,
				paymentMethodTenantId: paymentMethod.tenantId,
				paymentMethodId
			})
			throw new ForbiddenException('Payment method not accessible')
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

		// 🔐 BUG FIX #1: Add idempotency key to prevent duplicate charges
		const idempotencyKey = `payment-${tenantId}-${leaseId}-${paymentType}-${Date.now()}`
		const paymentIntent = await this.stripe.paymentIntents.create(
			{
				amount: amountInCents,
				currency: 'usd',
				customer: stripeCustomerId,
				payment_method: paymentMethod.stripePaymentMethodId,
				confirm: true,
				off_session: true,
				transfer_data: {
					destination: owner.stripeAccountId as string
				},
				metadata: {
					tenantId,
					tenantUserId: tenantUser.id,
					ownerId: owner.id,
					leaseId,
					paymentType
				},
				expand: ['latest_charge']
			},
			{
				idempotencyKey
			}
		)

		const status =
			paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending'
		const now = new Date().toISOString()

		const { data: rentPayment, error: paymentError } = await adminClient
			.from('rent_payment')
			.insert({
				tenantId: tenantUser.id,
				ownerId: owner.id,
				leaseId: lease.id,
				amount: amountInCents,
				// Platform fees removed - owner receives full amount minus Stripe fees
				platformFee: 0,
				stripeFee: 0,
				ownerReceives: amountInCents,
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

	/**
	 * Get payment history for authenticated user
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's payments
	 */
	async getPaymentHistory(token: string) {
		if (!token) {
			this.logger.warn('Payment history requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('rent_payment')
			.select(
				'id, tenantId, leaseId, amount, status, stripePaymentIntentId, subscriptionId, paymentType, failureReason, paidAt, createdAt, platformFee, stripeFee, ownerReceives, dueDate'
			)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to load payment history', {
				error: error.message
			})
			throw new BadRequestException('Failed to load payment history')
		}

		return (data as RentPayment[]) ?? []
	}

	/**
	 * Get subscription payment history for authenticated user
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's subscriptions
	 */
	async getSubscriptionPaymentHistory(subscriptionId: string, token: string) {
		if (!token) {
			this.logger.warn('Subscription payment history requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// ✅ RLS automatically validates subscription ownership
		const { data: subscription, error: subscriptionError } = await client
			.from('rent_subscription')
			.select('id, ownerId')
			.eq('id', subscriptionId)
			.single<RentSubscription>()

		if (subscriptionError || !subscription) {
			throw new NotFoundException('Subscription not found')
		}

		// ✅ RLS automatically filters payments to user's scope
		const { data, error } = await client
			.from('rent_payment')
			.select(
				'id, tenantId, leaseId, amount, status, stripePaymentIntentId, subscriptionId, paymentType, failureReason, paidAt, createdAt, platformFee, stripeFee, ownerReceives, dueDate'
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

	/**
	 * Get failed payment attempts for authenticated user
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's payments
	 */
	async getFailedPaymentAttempts(token: string) {
		if (!token) {
			this.logger.warn('Failed payment attempts requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('rent_payment')
			.select(
				'id, tenantId, leaseId, amount, status, stripePaymentIntentId, failureReason, createdAt, subscriptionId, paymentType'
			)
			.eq('status', 'failed')
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch failed payment attempts', {
				error: error.message
			})
			throw new BadRequestException('Failed to load failed payment attempts')
		}

		return (data as RentPayment[]) ?? []
	}

	/**
	 * Get subscription failed attempts for authenticated user
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's subscriptions
	 */
	async getSubscriptionFailedAttempts(subscriptionId: string, token: string) {
		if (!token) {
			this.logger.warn('Subscription failed attempts requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// ✅ RLS automatically validates subscription ownership
		const { data: subscription, error: subscriptionError } = await client
			.from('rent_subscription')
			.select('id, ownerId')
			.eq('id', subscriptionId)
			.single<RentSubscription>()

		if (subscriptionError || !subscription) {
			throw new NotFoundException('Subscription not found')
		}

		// ✅ RLS automatically filters payments to user's scope
		const { data, error } = await client
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
		params: SetupTenantAutopayParams,
		requestingUserId: string
	): Promise<SetupTenantAutopayResponse> {
		const { tenantId, leaseId, paymentMethodId } = params

		try {
			const adminClient = this.supabase.getAdminClient()

			// Get Tenant context
			const { tenant } = await this.getTenantContext(tenantId)

			// Get Lease context with authorization check
			const { lease, owner } = await this.getLeaseContext(
				leaseId,
				tenantId,
				requestingUserId
			)

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
				throw new BadRequestException('Autopay already enabled for this lease')
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

			// Create Stripe Subscription for recurring rent (no platform fee)
			const amountInCents = this.normalizeAmount(lease.rentAmount)

			// 🔐 BUG FIX #1: Add idempotency key to prevent duplicate subscriptions
			const subscriptionIdempotencyKey = `subscription-${tenantId}-${leaseId}-${Date.now()}`
			const subscription = await this.stripe.subscriptions.create(
				{
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
										ownerId: owner.id
									}
								},
								unit_amount: amountInCents,
								recurring: {
									interval: 'month'
								}
							} as unknown as Stripe.SubscriptionCreateParams.Item.PriceData
						}
					],
					transfer_data: {
						destination: owner.stripeAccountId as string
					},
					metadata: {
						tenantId,
						leaseId: lease.id,
						ownerId: owner.id,
						paymentType: 'autopay'
					},
					expand: ['latest_invoice.payment_intent']
				},
				{
					idempotencyKey: subscriptionIdempotencyKey
				}
			)

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
				await this.stripe.subscriptions.cancel(subscription.id).catch(err => {
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
		params: CancelTenantAutopayParams,
		requestingUserId: string
	): Promise<CancelTenantAutopayResponse> {
		const { tenantId, leaseId } = params

		try {
			const adminClient = this.supabase.getAdminClient()

			// Verify Tenant owns this lease with authorization check
			await this.getLeaseContext(leaseId, tenantId, requestingUserId)

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
		params: GetAutopayStatusParams,
		requestingUserId: string
	): Promise<TenantAutopayStatusResponse> {
		const { tenantId, leaseId } = params

		try {
			const adminClient = this.supabase.getAdminClient()

			// Verify Tenant owns this lease with authorization check
			await this.getLeaseContext(leaseId, tenantId, requestingUserId)

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

	/**
	 * Get current payment status for a tenant
	 * Returns the current balance, next due date, and payment status
	 *
	 * Task 2.4: Payment Status Tracking
	 *
	 * IMPORTANT: All amounts use Stripe standard (CENTS, not dollars)
	 * @returns outstandingBalance - Amount in CENTS (Stripe standard)
	 * @returns rentAmount - Monthly rent in CENTS (Stripe standard)
	 */
	async getCurrentPaymentStatus(tenantId: string): Promise<CurrentPaymentStatus> {
		try {
			const adminClient = this.supabase.getAdminClient()

			// Get tenant's active lease
			const { data: lease, error: leaseError } = await adminClient
				.from('lease')
				.select('id, rentAmount, startDate, endDate, status')
				.eq('tenantId', tenantId)
				.eq('status', 'ACTIVE')
				.single()

			if (leaseError || !lease) {
				throw new NotFoundException('Active lease not found for tenant')
			}

			const rentAmount = lease.rentAmount || 0

			// Get the most recent payment for this lease
			const { data: lastPayment } = await adminClient
				.from('rent_payment')
				.select('id, status, paidAt, dueDate, amount')
				.eq('leaseId', lease.id)
				.order('createdAt', { ascending: false })
				.limit(1)
				.maybeSingle()

			// Get any unpaid payments (PENDING, FAILED, REQUIRES_ACTION)
			// Note: SUCCEEDED and CANCELLED are considered "paid/resolved"
			const { data: unpaidPayments } = await adminClient
				.from('rent_payment')
				.select('id, status, dueDate, amount')
				.eq('leaseId', lease.id)
				.in('status', ['PENDING', 'FAILED', 'REQUIRES_ACTION'])
				.order('dueDate', { ascending: true })

			const now = new Date()

			// Calculate status based on unpaid payments
			let status: 'PAID' | 'DUE' | 'OVERDUE' | 'PENDING' = 'PAID'
			let outstandingBalance = 0
			let nextDueDate: string | null = null
			let isOverdue = false

			if (unpaidPayments && unpaidPayments.length > 0) {
				// Sum up all unpaid payments amounts (already in cents from database)
				outstandingBalance = unpaidPayments.reduce(
					(sum: number, payment: { amount: number | null }) =>
						sum + (payment.amount || 0),
					0
				)
				// Get the earliest due date
				const earliestDue = unpaidPayments[0]
				if (earliestDue) {
					nextDueDate = earliestDue.dueDate ?? null

							// Check if any payment is overdue using proper Date comparison
					const hasOverdue = unpaidPayments.some(
						(payment: { dueDate: string | null }) => {
							if (!payment.dueDate) return false
							const dueDate = new Date(payment.dueDate)
							return dueDate < now
						}
					)

					if (hasOverdue) {
						status = 'OVERDUE'
						isOverdue = true
					} else if (
						unpaidPayments.some(
							(p: { status: string | null }) => p.status === 'PENDING'
						)
					) {
						status = 'PENDING'
					} else {
						status = 'DUE'
					}
				}
			} else {
				// No unpaid payments - calculate next due date (1st of next month)
				const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
				nextDueDate = nextMonth.toISOString().split('T')[0] ?? null
			}

			const lastPaymentDate = lastPayment?.paidAt ?? null

			return {
				status,
				rentAmount,
				nextDueDate,
				lastPaymentDate,
				outstandingBalance,
				isOverdue
			}
		} catch (error) {
			this.logger.error('Failed to get current payment status', {
				tenantId,
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Verify that a user has access to a tenant
	 * Checks if the user is the tenant owner (tenant.auth_user_id matches userId)
	 */
	async verifyTenantAccess(userId: string, tenantId: string): Promise<void> {
		const adminClient = this.supabase.getAdminClient()

		const { data: tenant, error } = await adminClient
			.from('tenant')
			.select('auth_user_id')
			.eq('id', tenantId)
			.single()

		if (error || !tenant) {
			throw new NotFoundException('Tenant not found')
		}

		if (tenant.auth_user_id !== userId) {
			this.logger.warn('Unauthorized tenant access attempt', {
				userId,
				tenantId,
				tenantOwnerId: tenant.auth_user_id
			})
			throw new ForbiddenException('You do not have access to this tenant')
		}
	}
}
