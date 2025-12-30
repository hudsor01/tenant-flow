import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Header,
	Param,
	Post,
	Query,
	Request,
	Res,
	UseGuards,
	ParseUUIDPipe
} from '@nestjs/common'
import { Response } from 'express'
import { LeaseOwnershipGuard } from '../../shared/guards/lease-ownership.guard'
import { TenantOwnershipGuard } from '../../shared/guards/tenant-ownership.guard'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { RentPaymentsService } from './rent-payments.service'
import { PaymentAnalyticsService } from './payment-analytics.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { AppLogger } from '../../logger/app-logger.service'

@Controller('rent-payments')
export class RentPaymentsController {
	constructor(
		private readonly rentPaymentsService: RentPaymentsService,
		private readonly paymentAnalyticsService: PaymentAnalyticsService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get payment analytics
	 * GET /api/v1/rent-payments/analytics
	 */
	@Get('analytics')
	async getPaymentAnalytics(@JwtToken() token: string) {
		this.logger.log('Getting payment analytics for authenticated user')
		const analytics =
			await this.paymentAnalyticsService.getPaymentAnalytics(token)
		return { success: true, analytics }
	}

	/**
	 * Get upcoming payments (next 30 days)
	 * GET /api/v1/rent-payments/upcoming
	 */
	@Get('upcoming')
	async getUpcomingPayments(@JwtToken() token: string) {
		this.logger.log('Getting upcoming payments for authenticated user')
		const payments =
			await this.paymentAnalyticsService.getUpcomingPayments(token)
		return { success: true, payments }
	}

	/**
	 * Get overdue payments
	 * GET /api/v1/rent-payments/overdue
	 */
	@Get('overdue')
	async getOverduePayments(@JwtToken() token: string) {
		this.logger.log('Getting overdue payments for authenticated user')
		const payments =
			await this.paymentAnalyticsService.getOverduePayments(token)
		return { success: true, payments }
	}

	/**
	 * Export payments as CSV
	 * GET /api/v1/rent-payments/export
	 */
	@Get('export')
	@Header('Content-Type', 'text/csv')
	@Header('Content-Disposition', 'attachment; filename="payments.csv"')
	async exportPayments(
		@JwtToken() token: string,
		@Query('status') status: string | undefined,
		@Query('startDate') startDate: string | undefined,
		@Query('endDate') endDate: string | undefined,
		@Res() res?: Response
	) {
		this.logger.log('Exporting payments to CSV')
		const filters: { status?: string; startDate?: string; endDate?: string } =
			{}
		if (status) filters.status = status
		if (startDate) filters.startDate = startDate
		if (endDate) filters.endDate = endDate

		const csv = await this.paymentAnalyticsService.exportPaymentsCSV(
			token,
			filters
		)

		if (res) {
			res.send(csv)
		}
		return csv
	}

	/**
	 * Record a manual payment (cash, check, etc.)
	 * POST /api/v1/rent-payments/manual
	 */
	@Post('manual')
	async recordManualPayment(
		@Body()
		body: {
			lease_id: string
			tenant_id: string
			amount: number
			payment_method: 'cash' | 'check' | 'money_order' | 'other'
			paid_date: string
			notes?: string
		},
		@JwtToken() token: string
	) {
		this.logger.log(`Recording manual payment for lease ${body.lease_id}`)

		// Validate required fields
		if (
			!body.lease_id ||
			!body.tenant_id ||
			!body.amount ||
			!body.payment_method ||
			!body.paid_date
		) {
			throw new BadRequestException('Missing required fields')
		}

		if (body.amount <= 0) {
			throw new BadRequestException('Amount must be greater than zero')
		}

		const result = await this.rentPaymentsService.recordManualPayment(
			{
				lease_id: body.lease_id,
				tenant_id: body.tenant_id,
				amount: body.amount,
				payment_method: body.payment_method,
				paid_date: body.paid_date,
				notes: body.notes ?? undefined
			},
			token
		)

		return {
			success: true,
			payment: result
		}
	}

	/**
	 * Create a one-time rent payment
	 * Phase 5: One-time Payments
	 *
	 * POST /api/v1/rent-payments
	 */
	@Post()
	async createPayment(
		@Body()
		body: CreatePaymentDto,
		@Request() req: AuthenticatedRequest
	) {
		const requestinguser_id = req.user.id

		this.logger.log(
			`Creating one-time payment for tenant ${body.tenant_id}, lease ${body.lease_id}`
		)

		const result = await this.rentPaymentsService.createOneTimePayment(
			body,
			requestinguser_id
		)

		return {
			success: true,
			payment: result.payment,
			paymentIntent: {
				...result.paymentIntent,
				receiptUrl: result.paymentIntent.receiptUrl
			}
		}
	}

	/**
	 * Get payment history for all subscriptions
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/rent-payments/history
	 * RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('history')
	async getPaymentHistory(@JwtToken() token: string) {
		this.logger.log('Getting payment history for authenticated user')

		const payments = await this.rentPaymentsService.getPaymentHistory(token)

		return {
			payments: payments.map(payment => ({
				id: payment.id,
				subscriptionId: payment.lease_id,
				tenant_id: payment.tenant_id,
				amount: payment.amount,
				status: payment.status,
				stripePaymentIntentId: payment.stripe_payment_intent_id,
				created_at: payment.created_at,
				dueDate: payment.due_date ?? null,
				formattedAmount: `$${(payment.amount / 100).toFixed(2)}`,
				formattedDate: payment.created_at
					? new Date(payment.created_at).toLocaleDateString()
					: null,
				isSuccessful: payment.status === 'succeeded',
				failureReason: null
			}))
		}
	}

	/**
	 * Get payment history for a specific subscription
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/rent-payments/history/subscription/:subscriptionId
	 * RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('history/subscription/:subscriptionId')
	async getSubscriptionPaymentHistory(
		@JwtToken() token: string,
		@Param('subscriptionId', ParseUUIDPipe) subscriptionId: string
	) {
		this.logger.log(
			`Getting payment history for subscription ${subscriptionId}`
		)

		const payments =
			await this.rentPaymentsService.getSubscriptionPaymentHistory(
				subscriptionId,
				token
			)

		return {
			payments: payments.map(payment => ({
				id: payment.id,
				subscriptionId: payment.lease_id,
				tenant_id: payment.tenant_id,
				amount: payment.amount,
				status: payment.status,
				stripePaymentIntentId: payment.stripe_payment_intent_id,
				created_at: payment.created_at,
				dueDate: payment.due_date ?? null,
				formattedAmount: `$${(payment.amount / 100).toFixed(2)}`,
				formattedDate: payment.created_at
					? new Date(payment.created_at).toLocaleDateString()
					: null,
				isSuccessful: payment.status === 'succeeded',
				failureReason: null
			}))
		}
	}

	/**
	 * Get failed payment attempts for all subscriptions
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/rent-payments/failed-attempts
	 * RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('failed-attempts')
	async getFailedPaymentAttempts(@JwtToken() token: string) {
		this.logger.log('Getting failed payment attempts for authenticated user')

		const failedAttempts =
			await this.rentPaymentsService.getFailedPaymentAttempts(token)

		return {
			failedAttempts: failedAttempts.map(attempt => ({
				id: attempt.id,
				subscriptionId: attempt.lease_id,
				tenant_id: attempt.tenant_id,
				amount: attempt.amount,
				failureReason: null,
				stripePaymentIntentId: attempt.stripe_payment_intent_id,
				created_at: attempt.created_at
			}))
		}
	}

	/**
	 * Get failed payment attempts for a specific subscription
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/rent-payments/failed-attempts/subscription/:subscriptionId
	 * RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('failed-attempts/subscription/:subscriptionId')
	async getSubscriptionFailedAttempts(
		@JwtToken() token: string,
		@Param('subscriptionId', ParseUUIDPipe) subscriptionId: string
	) {
		this.logger.log(
			`Getting failed payment attempts for subscription ${subscriptionId}`
		)

		const failedAttempts =
			await this.rentPaymentsService.getSubscriptionFailedAttempts(
				subscriptionId,
				token
			)

		return {
			failedAttempts: failedAttempts.map(attempt => ({
				id: attempt.id,
				subscriptionId: attempt.lease_id,
				tenant_id: attempt.tenant_id,
				amount: attempt.amount,
				failureReason: null,
				stripePaymentIntentId: attempt.stripe_payment_intent_id,
				created_at: attempt.created_at
			}))
		}
	}

	/**
	 * Setup autopay (recurring rent subscription) for a tenant
	 * POST /api/v1/rent-payments/autopay/setup
	 */
	@Post('autopay/setup')
	async setupAutopay(
		@Body()
		body: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		},
		@Request() req: AuthenticatedRequest
	) {
		this.logger.log(
			`Setting up autopay for tenant ${body.tenant_id}, lease ${body.lease_id}`
		)

		const params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		} = {
			tenant_id: body.tenant_id,
			lease_id: body.lease_id
		}
		if (body.paymentMethodId !== undefined) {
			params.paymentMethodId = body.paymentMethodId
		}

		const result = await this.rentPaymentsService.setupTenantAutopay(
			params,
			req.user.id
		)

		return {
			success: true,
			subscriptionId: result.subscriptionId,
			status: result.status
		}
	}

	/**
	 * Cancel autopay for a tenant
	 * POST /api/v1/rent-payments/autopay/cancel
	 */
	@Post('autopay/cancel')
	async cancelAutopay(
		@Body()
		body: {
			tenant_id: string
			lease_id: string
		},
		@Request() req: AuthenticatedRequest
	) {
		this.logger.log(
			`Canceling autopay for tenant ${body.tenant_id}, lease ${body.lease_id}`
		)

		await this.rentPaymentsService.cancelTenantAutopay(
			{
				tenant_id: body.tenant_id,
				lease_id: body.lease_id
			},
			req.user.id
		)

		return {
			success: true,
			message: 'Autopay cancelled successfully'
		}
	}

	/**
	 * Get autopay status for a tenant
	 * GET /api/v1/rent-payments/autopay/status/:tenant_id/:lease_id
	 */
	@Get('autopay/status/:tenant_id/:lease_id')
	@UseGuards(LeaseOwnershipGuard)
	async getAutopayStatus(
		@Param('tenant_id', ParseUUIDPipe) tenant_id: string,
		@Param('lease_id', ParseUUIDPipe) lease_id: string,
		@Request() req: AuthenticatedRequest
	) {
		this.logger.log(
			`Getting autopay status for tenant ${tenant_id}, lease ${lease_id}`
		)

		const status = await this.rentPaymentsService.getAutopayStatus(
			{
				tenant_id,
				lease_id
			},
			req.user.id
		)

		return {
			enabled: status.enabled,
			subscriptionId: status.subscriptionId,
			status: status.status,
			nextPaymentDate: status.nextPaymentDate
		}
	}

	/**
	 * Get current payment status for a tenant
	 * Task 2.4: Payment Status Tracking
	 *
	 * GET /api/v1/rent-payments/status/:tenant_id
	 * RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('status/:tenant_id')
	@UseGuards(TenantOwnershipGuard)
	async getCurrentPaymentStatus(
		@Param('tenant_id', ParseUUIDPipe) tenant_id: string,
		@Request() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		this.logger.log(`Getting current payment status for tenant ${tenant_id}`)

		// Authorization now enforced at service layer (defense-in-depth)
		const paymentStatus =
			await this.rentPaymentsService.getCurrentPaymentStatus(tenant_id, user_id)

		return {
			status: paymentStatus.status,
			rent_amount: paymentStatus.rentAmount,
			nextDueDate: paymentStatus.nextDueDate,
			lastPaymentDate: paymentStatus.lastPaymentDate,
			outstandingBalance: paymentStatus.outstandingBalance,
			isOverdue: paymentStatus.isOverdue
		}
	}
}
