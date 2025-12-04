import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	InternalServerErrorException,
	Logger,
	Post,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { JwtToken } from '../../../shared/decorators/jwt-token.decorator'
import { User } from '../../../shared/decorators/user.decorator'
import type { AuthUser } from '@repo/shared/types/auth'
import { SupabaseService } from '../../../database/supabase.service'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'

const PayRentSchema = z.object({
	payment_method_id: z.string().min(1),
	amount_cents: z.number().int().positive()
})

class PayRentDto extends createZodDto(PayRentSchema) {}

/**
 * Tenant Payments Controller
 *
 * Handles payment history, upcoming payments, and payment method management
 * for tenants. Enforces TENANT user_type via TenantAuthGuard.
 *
 * Routes: /tenant/payments/*
 */
@Controller()
@UseGuards(TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantPaymentsController {
	private readonly logger = new Logger(TenantPaymentsController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get payment history and upcoming payments
	 *
	 * @returns Payment list with metadata
	 */
	@Get()
	async getPayments(
		@JwtToken() token: string,
		@User() user: AuthUser
	): Promise<{ payments: Array<Record<string, unknown>>; methodsEndpoint: string }> {
		const tenant = await this.resolveTenant(token, user)
		const payments = await this.fetchPayments(token, tenant.id)

		return {
			payments,
			methodsEndpoint: '/api/v1/stripe/tenant-payment-methods'
		}
	}

	/**
	 * Get amount due for current billing period
	 * Calculates base rent + late fee if applicable
	 */
	@Get('amount-due')
	async getAmountDue(@JwtToken() token: string, @User() user: AuthUser) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant.id)

		if (!lease) {
			throw new BadRequestException('No active lease found')
		}

		const now = new Date()
		const paymentDay = lease.payment_day || 1
		const gracePeriodDays = lease.grace_period_days || 5
		const lateFeeAmount = lease.late_fee_amount || 0

		// Calculate due date for current period
		const dueDate = new Date(now.getFullYear(), now.getMonth(), paymentDay)
		if (dueDate > now) {
			dueDate.setMonth(dueDate.getMonth() - 1)
		}

		// Calculate days late (after grace period)
		const gracePeriodEnd = new Date(dueDate)
		gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays)

		const daysLate =
			now > gracePeriodEnd
				? Math.floor(
						(now.getTime() - gracePeriodEnd.getTime()) / (1000 * 60 * 60 * 24)
					)
				: 0

		// Calculate late fee (capped at 10% of rent)
		const baseRentCents = lease.rent_amount || 0
		const maxLateFee = Math.floor(baseRentCents * 0.1)
		const calculatedLateFee =
			daysLate > 0 ? Math.min(lateFeeAmount * daysLate, maxLateFee) : 0

		// Check if already paid for current period
		const { data: existingPayment } = await this.supabase
			.getUserClient(token)
			.from('rent_payments')
			.select('id, status')
			.eq('lease_id', lease.id)
			.eq('status', 'succeeded')
			.gte('period_start', dueDate.toISOString())
			.limit(1)
			.maybeSingle()

		const alreadyPaid = !!existingPayment

		return {
			base_rent_cents: baseRentCents,
			late_fee_cents: calculatedLateFee,
			total_due_cents: alreadyPaid ? 0 : baseRentCents + calculatedLateFee,
			due_date: dueDate.toISOString(),
			days_late: daysLate,
			grace_period_days: gracePeriodDays,
			already_paid: alreadyPaid,
			breakdown: alreadyPaid
				? [{ description: 'Paid for current period', amount_cents: 0 }]
				: [
						{ description: 'Monthly rent', amount_cents: baseRentCents },
						...(calculatedLateFee > 0
							? [
									{
										description: `Late fee (${daysLate} days)`,
										amount_cents: calculatedLateFee
									}
								]
							: [])
					]
		}
	}

	/**
	 * Process rent payment
	 * Creates payment intent and records payment in database
	 */
	@Post('pay-rent')
	@HttpCode(HttpStatus.OK)
	async payRent(
		@JwtToken() token: string,
		@User() user: AuthUser,
		@Body() dto: PayRentDto
	) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant.id)

		if (!lease) {
			throw new BadRequestException('No active lease found')
		}

		// Validate amount matches expected
		const amountDue = await this.getAmountDue(token, user)
		if (amountDue.already_paid) {
			throw new BadRequestException('Rent already paid for this period')
		}

		if (dto.amount_cents !== amountDue.total_due_cents) {
			throw new BadRequestException(
				`Payment amount (${dto.amount_cents}) does not match amount due (${amountDue.total_due_cents})`
			)
		}

		// Record the payment intent (actual Stripe processing would happen here)
		const periodStart = new Date(amountDue.due_date)
		const periodEnd = new Date(periodStart)
		periodEnd.setMonth(periodEnd.getMonth() + 1)

		const { data: payment, error: paymentError } = await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.insert({
				lease_id: lease.id,
				tenant_id: tenant.id,
				amount: dto.amount_cents,
				late_fee_amount: amountDue.late_fee_cents,
				status: 'pending',
				due_date: amountDue.due_date,
				period_start: periodStart.toISOString(),
				period_end: periodEnd.toISOString(),
				application_fee_amount: 0,
				payment_method_type: 'card',
				stripe_payment_intent_id: `pi_pending_${Date.now()}`
			})
			.select()
			.single()

		if (paymentError) {
			this.logger.error('Failed to record payment', { error: paymentError.message })
			throw new InternalServerErrorException('Failed to process payment')
		}

		this.logger.log('Rent payment initiated', {
			payment_id: payment.id,
			tenant_id: tenant.id,
			amount_cents: dto.amount_cents
		})

		return {
			success: true,
			payment_id: payment.id,
			status: 'pending',
			message: 'Payment submitted successfully'
		}
	}

	private async resolveTenant(token: string, user: AuthUser) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
			.eq('user_id', user.id)
			.single()

		if (error || !data) {
			throw new InternalServerErrorException('Tenant account not found')
		}

		return data
	}

	private async fetchPayments(token: string, tenant_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('rent_payments')
			.select(
				'id, amount, status, created_at, lease_id, tenant_id, stripe_payment_intent_id, due_date, application_fee_amount, paid_date, period_end, period_start'
			)
			.eq('tenant_id', tenant_id)
			.order('created_at', { ascending: false })
			.limit(50)

		if (error) {
			this.logger.error('Failed to load rent payments', {
				tenant_id,
				error: error.message
			})
			throw new InternalServerErrorException('Failed to load payment history')
		}

		return data ?? []
	}

	private async fetchActiveLease(token: string, tenant_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('leases')
			.select(
				'id, rent_amount, payment_day, grace_period_days, late_fee_amount, stripe_subscription_id'
			)
			.eq('primary_tenant_id', tenant_id)
			.eq('lease_status', 'active')
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load active lease', {
				tenant_id,
				error: error.message
			})
			return null
		}

		return data
	}
}
