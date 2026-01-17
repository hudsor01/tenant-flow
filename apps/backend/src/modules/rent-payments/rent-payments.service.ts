/**
 * Rent Payments Service (Facade)
 * Delegates to specialized services while maintaining backwards-compatible API
 *
 * Decomposed Services:
 * - RentPaymentQueryService: Payment history queries
 * - RentPaymentAutopayService: Autopay setup, cancel, status
 * - RentPaymentContextService: Tenant and lease context loading
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import type Stripe from 'stripe'
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
import { getCanonicalPaymentDate } from '@repo/shared/utils/payment-dates'
import type { RentPayment, TenantPaymentMethod } from './types'
import type { PaymentStatus } from '@repo/shared/types/core'
import type { CreatePaymentInput } from './dto/create-payment.dto'
import { RentPaymentQueryService } from './rent-payment-query.service'
import { RentPaymentAutopayService } from './rent-payment-autopay.service'
import { RentPaymentContextService } from './rent-payment-context.service'
import { AppLogger } from '../../logger/app-logger.service'

type PaymentMethodType = 'card' | 'ach'

export interface CurrentPaymentStatus {
	status: 'succeeded' | 'pending' | 'OVERDUE' | 'pending'
	rentAmount: number
	nextDueDate: string | null
	lastPaymentDate: string | null
	outstandingBalance: number
	isOverdue: boolean
}

export interface ManualPaymentInput {
	lease_id: string
	tenant_id: string
	amount: number
	payment_method: 'cash' | 'check' | 'money_order' | 'other'
	paid_date: string
	notes?: string | undefined
}

@Injectable()
export class RentPaymentsService {
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly stripeTenantService: StripeTenantService,
		private readonly queryService: RentPaymentQueryService,
		private readonly autopayService: RentPaymentAutopayService,
		private readonly contextService: RentPaymentContextService,
		private readonly logger: AppLogger
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	// ==================
	// DELEGATED TO QUERY SERVICE
	// ==================

	async getPaymentHistory(token: string): Promise<RentPayment[]> {
		return this.queryService.getPaymentHistory(token)
	}

	async getSubscriptionPaymentHistory(
		subscriptionId: string,
		token: string
	): Promise<RentPayment[]> {
		return this.queryService.getSubscriptionPaymentHistory(
			subscriptionId,
			token
		)
	}

	async getFailedPaymentAttempts(token: string): Promise<RentPayment[]> {
		return this.queryService.getFailedPaymentAttempts(token)
	}

	async getSubscriptionFailedAttempts(
		subscriptionId: string,
		token: string
	): Promise<RentPayment[]> {
		return this.queryService.getSubscriptionFailedAttempts(
			subscriptionId,
			token
		)
	}

	// ==================
	// DELEGATED TO AUTOPAY SERVICE
	// ==================

	async setupTenantAutopay(
		params: SetupTenantAutopayParams,
		requestingUserId: string
	): Promise<SetupTenantAutopayResponse> {
		return this.autopayService.setupTenantAutopay(params, requestingUserId)
	}

	async cancelTenantAutopay(
		params: CancelTenantAutopayParams,
		requestingUserId: string
	): Promise<CancelTenantAutopayResponse> {
		return this.autopayService.cancelTenantAutopay(params, requestingUserId)
	}

	async getAutopayStatus(
		params: GetAutopayStatusParams,
		requestingUserId: string
	): Promise<TenantAutopayStatusResponse> {
		return this.autopayService.getAutopayStatus(params, requestingUserId)
	}

	// ==================
	// MANUAL PAYMENT RECORDING
	// ==================

	/**
	 * Record a manual payment (cash, check, money order, etc.)
	 * This creates a rent payment record without going through Stripe
	 */
	async recordManualPayment(
		params: ManualPaymentInput,
		token: string
	): Promise<RentPayment> {
		const { lease_id, tenant_id, amount, payment_method, paid_date, notes } =
			params

		// Use user client for RLS-protected access
		const client = this.supabase.getUserClient(token)

		// Verify the lease exists and user has access
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('id, rent_amount, primary_tenant_id')
			.eq('id', lease_id)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found or access denied')
		}

		// Verify tenant matches
		if (lease.primary_tenant_id !== tenant_id) {
			throw new ForbiddenException('Tenant does not match lease')
		}

		// Convert amount to cents
		const amountInCents = Math.round(amount * 100)

		// Map payment method to the expected format
		const paymentMethodType = this.mapManualPaymentMethod(payment_method)

		// Calculate due date (use paid date for manual payments)
		const dueDate = new Date(paid_date)

		// Insert the payment record using admin client
		// Note: stripe_payment_intent_id is nullable after migration 20251226164649
		// and notes column is added by the same migration
		// We use a placeholder ID for manual payments since the column is required in current schema
		const adminClient = this.supabase.getAdminClient()
		const manualPaymentId = `MANUAL_${Date.now()}_${Math.random().toString(36).substring(7)}`
		const insertPayload = {
			tenant_id,
			lease_id,
			amount: amountInCents,
			application_fee_amount: 0,
			currency: 'usd',
			due_date: dueDate.toISOString(),
			late_fee_amount: null,
			paid_date: new Date(paid_date).toISOString(),
			payment_method_type: paymentMethodType,
			period_start: dueDate.toISOString(),
			period_end: new Date(
				dueDate.getFullYear(),
				dueDate.getMonth() + 1,
				0
			).toISOString(),
			status: 'succeeded' as PaymentStatus,
			// Use placeholder ID until migration makes this column nullable
			stripe_payment_intent_id: manualPaymentId
		}

		const { data: payment, error: insertError } = await adminClient
			.from('rent_payments')
			.insert(insertPayload)
			.select('*')
			.single()

		if (insertError || !payment) {
			this.logger.error('Failed to record manual payment', {
				error: insertError?.message,
				lease_id,
				tenant_id
			})
			throw new BadRequestException('Failed to record payment')
		}

		this.logger.log('Manual payment recorded successfully', {
			payment_id: payment.id,
			amount: amountInCents,
			payment_method,
			notes: notes ?? undefined
		})

		return payment as RentPayment
	}

	private mapManualPaymentMethod(
		method: 'cash' | 'check' | 'money_order' | 'other'
	): string {
		const methodMap: Record<string, string> = {
			cash: 'CASH',
			check: 'CHECK',
			money_order: 'MONEY_ORDER',
			other: 'OTHER'
		}
		return methodMap[method] || 'OTHER'
	}

	// ==================
	// REMAINING METHODS (Payment processing - could be further decomposed)
	// ==================

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
		requestingUserId: string
	) {
		const { tenant_id, lease_id, amount, paymentMethodId } = params

		if (!tenant_id || !lease_id || !paymentMethodId) {
			throw new BadRequestException('Missing required payment details')
		}

		const adminClient = this.supabase.getAdminClient()
		const { tenant, tenantUser } =
			await this.contextService.getTenantContext(tenant_id)
		const { lease, stripeAccountId } =
			await this.contextService.getLeaseContext(
				lease_id,
				tenant_id,
				requestingUserId
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

		// Generate payment period (YYYY-MM format) for reconciliation
		const now = new Date()
		const paymentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

		const paymentIntentPayload: Stripe.PaymentIntentCreateParams = {
			amount: amountInCents,
			currency: 'usd',
			customer: stripeCustomer.id,
			payment_method: paymentMethod.stripe_payment_method_id,
			confirm: true,
			off_session: true,
			metadata: {
				platform: 'tenantflow',
				payment_type: 'rent',
				tenant_id,
				tenant_name: tenantUser.full_name || `${tenantUser.first_name || ''} ${tenantUser.last_name || ''}`.trim() || tenantUser.email,
				lease_id,
				unit_id: lease.unit_id,
				payment_method_type: paymentType,
				payment_period: paymentPeriod
			},
			expand: ['latest_charge']
		}
		if (stripeAccountId) {
			paymentIntentPayload.transfer_data = {
				destination: stripeAccountId
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
			status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
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

	async getCurrentPaymentStatus(
		tenant_id: string,
		requestingUserId: string
	): Promise<CurrentPaymentStatus> {
		const adminClient = this.supabase.getAdminClient()
		await this.contextService.verifyTenantAccess(requestingUserId, tenant_id)

		const { data: lease, error: leaseError } = await adminClient
			.from('leases')
			.select('id, rent_amount, lease_status, start_date, end_date')
			.eq('primary_tenant_id', tenant_id)
			.eq('lease_status', 'active')
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Active lease not found for tenant')
		}

		const rentAmount = lease.rent_amount || 0

		const { data: lastPayment } = await adminClient
			.from('rent_payments')
			.select('status, paid_date, due_date, amount, created_at')
			.eq('lease_id', lease.id)
			.order('due_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		let status: CurrentPaymentStatus['status'] = 'pending'
		let outstandingBalance = rentAmount
		let nextDueDate: string | null = null
		let lastPaymentDate: string | null = null

		if (lastPayment) {
			lastPaymentDate = getCanonicalPaymentDate(
				lastPayment.paid_date,
				lastPayment.created_at!,
				lastPayment.status!
			)
			nextDueDate = lastPayment.due_date ?? lease.end_date ?? null
			if (lastPayment.status === 'succeeded') {
				status = 'succeeded'
				outstandingBalance = 0
			} else if (lastPayment.status === 'pending') {
				status = 'pending'
				outstandingBalance = rentAmount
			} else if (lastPayment.status === 'failed') {
				status = 'OVERDUE'
			}
		} else {
			nextDueDate = lease.start_date ?? null
		}

		const isOverdue =
			nextDueDate !== null && new Date(nextDueDate).getTime() < Date.now()
		if (isOverdue && status === 'pending') {
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
		status: PaymentStatus
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
				payload.status === 'succeeded' ? new Date().toISOString() : null,
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
}
