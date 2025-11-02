import {
	Body,
	Controller,
	Get,
	Logger,
	Param,
	Post,
	Request,
	UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { RentPaymentsService } from './rent-payments.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'

@Controller('rent-payments')
@UseGuards(JwtAuthGuard)
export class RentPaymentsController {
	private readonly logger = new Logger(RentPaymentsController.name)

	constructor(private readonly rentPaymentsService: RentPaymentsService) {}

	/**
	 * Create a one-time rent payment
	 * Phase 5: One-time Payments
	 *
	 * POST /api/v1/rent-payments
	 */
	@Post()
	async createPayment(
		@Body()
		body: {
			tenantId: string
			leaseId: string
			amount: number
			paymentMethodId: string
			requestingUserId: string
		}
	) {
		this.logger.log(
			`Creating one-time payment for tenant ${body.tenantId}, lease ${body.leaseId}`
		)

		const result = await this.rentPaymentsService.createOneTimePayment(
			body,
			body.requestingUserId
		)

		return {
			success: true,
			payment: result.payment,
			paymentIntent: {
				...result.paymentIntent,
				receipt_url: result.paymentIntent.receiptUrl
			}
		}
	}

	/**
	 * Get payment history for all subscriptions
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/payments/history
	 * ✅ RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('history')
	async getPaymentHistory(@JwtToken() token: string) {
		this.logger.log('Getting payment history for authenticated user')

		const payments = await this.rentPaymentsService.getPaymentHistory(token)

		return {
			payments: payments.map(payment => ({
				id: payment.id,
				subscriptionId: payment.subscriptionId,
				tenantId: payment.tenantId,
				amount: payment.amount,
				status: payment.status,
				stripePaymentIntentId: payment.stripePaymentIntentId,
				createdAt: payment.createdAt,
				dueDate: payment.dueDate ?? null,
				// Additional computed fields for frontend
				formattedAmount: `$${(payment.amount / 100).toFixed(2)}`,
				formattedDate: payment.createdAt
					? new Date(payment.createdAt).toLocaleDateString()
					: null,
				isSuccessful: payment.status === 'succeeded',
				failureReason: payment.failureReason
			}))
		}
	}

	/**
	 * Get payment history for a specific subscription
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/payments/history/subscription/:subscriptionId
	 * ✅ RLS COMPLIANT: Uses @JwtToken decorator
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
				subscriptionId: payment.subscriptionId,
				tenantId: payment.tenantId,
				amount: payment.amount,
				status: payment.status,
				stripePaymentIntentId: payment.stripePaymentIntentId,
				createdAt: payment.createdAt,
				dueDate: payment.dueDate ?? null,
				// Additional computed fields for frontend
				formattedAmount: `$${(payment.amount / 100).toFixed(2)}`,
				formattedDate: payment.createdAt
					? new Date(payment.createdAt).toLocaleDateString()
					: null,
				isSuccessful: payment.status === 'succeeded',
				failureReason: payment.failureReason
			}))
		}
	}

	/**
	 * Get failed payment attempts for all subscriptions
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/payments/failed-attempts
	 * ✅ RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('failed-attempts')
	async getFailedPaymentAttempts(@JwtToken() token: string) {
		this.logger.log('Getting failed payment attempts for authenticated user')

		const failedAttempts =
			await this.rentPaymentsService.getFailedPaymentAttempts(token)

		return {
			failedAttempts: failedAttempts.map(attempt => ({
				id: attempt.id,
				subscriptionId: attempt.subscriptionId,
				tenantId: attempt.tenantId,
				amount: attempt.amount,
				failureReason: attempt.failureReason,
				stripePaymentIntentId: attempt.stripePaymentIntentId,
				createdAt: attempt.createdAt
			}))
		}
	}

	/**
	 * Get failed payment attempts for a specific subscription
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/payments/failed-attempts/subscription/:subscriptionId
	 * ✅ RLS COMPLIANT: Uses @JwtToken decorator
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
				subscriptionId: attempt.subscriptionId,
				tenantId: attempt.tenantId,
				amount: attempt.amount,
				failureReason: attempt.failureReason,
				stripePaymentIntentId: attempt.stripePaymentIntentId,
				createdAt: attempt.createdAt
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
			tenantId: string
			leaseId: string
			paymentMethodId?: string
		},
		@Request() req: AuthenticatedRequest
	) {
		this.logger.log(
			`Setting up autopay for tenant ${body.tenantId}, lease ${body.leaseId}`
		)

		const params: {
			tenantId: string
			leaseId: string
			paymentMethodId?: string
		} = {
			tenantId: body.tenantId,
			leaseId: body.leaseId
		}
		if (body.paymentMethodId !== undefined) {
			params.paymentMethodId = body.paymentMethodId
		}

		const result = await this.rentPaymentsService.setupTenantAutopay(params, req.user.id)

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
			tenantId: string
			leaseId: string
		},
		@Request() req: AuthenticatedRequest
	) {
		this.logger.log(
			`Canceling autopay for tenant ${body.tenantId}, lease ${body.leaseId}`
		)

		await this.rentPaymentsService.cancelTenantAutopay({
			tenantId: body.tenantId,
			leaseId: body.leaseId
		}, req.user.id)

		return {
			success: true,
			message: 'Autopay cancelled successfully'
		}
	}

	/**
	 * Get autopay status for a tenant
	 * GET /api/v1/rent-payments/autopay/status/:tenantId/:leaseId
	 */
	@Get('autopay/status/:tenantId/:leaseId')
	async getAutopayStatus(
		@Param('tenantId') tenantId: string,
		@Param('leaseId') leaseId: string,
		@Request() req: AuthenticatedRequest
	) {
		this.logger.log(
			`Getting autopay status for tenant ${tenantId}, lease ${leaseId}`
		)

		const status = await this.rentPaymentsService.getAutopayStatus({
			tenantId,
			leaseId
		}, req.user.id)

		return {
			enabled: status.enabled,
			subscriptionId: status.subscriptionId,
			status: status.status,
			nextPaymentDate: status.nextPaymentDate
		}
	}
}
