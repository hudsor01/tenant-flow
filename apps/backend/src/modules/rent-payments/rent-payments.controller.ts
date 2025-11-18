import {
	Body,
	Controller,
	Get,
	Logger,
	Param,
	Post,
	Request,
	UseGuards,
	ParseUUIDPipe
} from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { RentPaymentsService } from './rent-payments.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { CreatePaymentDto } from './dto/create-payment.dto'

@Controller('rent-payments')
@UseGuards(JwtAuthGuard)
export class RentPaymentsController {
	private readonly logger = new Logger(RentPaymentsController.name)

	constructor(private readonly rentPaymentsService: RentPaymentsService) {}

	/**
	 * Create a one-time rent payment
	 * Phase 5: One-time Payments

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

	 * GET /api/v1/payments/history
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
				isSuccessful: payment.status === 'PAID',
				failureReason: null
			}))
		}
	}

	/**
	 * Get payment history for a specific subscription
	 * Phase 4: Payment History Enhancement

	 * GET /api/v1/payments/history/subscription/:subscriptionId
	 * RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('history/subscription/:subscriptionId')
	async getSubscriptionPaymentHistory(
		@JwtToken() token: string,
		@Param('subscriptionId') subscriptionId: string
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
				isSuccessful: payment.status === 'PAID',
				failureReason: null
			}))
		}
	}

	/**
	 * Get failed payment attempts for all subscriptions
	 * Phase 4: Payment History Enhancement

	 * GET /api/v1/payments/failed-attempts
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

	 * GET /api/v1/payments/failed-attempts/subscription/:subscriptionId
	 * RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('failed-attempts/subscription/:subscriptionId')
	async getSubscriptionFailedAttempts(
		@JwtToken() token: string,
		@Param('subscriptionId') subscriptionId: string
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
	@UseGuards(PropertyOwnershipGuard)
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

	 * GET /api/v1/rent-payments/status/:tenant_id
	 * RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('status/:tenant_id')
	@UseGuards(PropertyOwnershipGuard)
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
