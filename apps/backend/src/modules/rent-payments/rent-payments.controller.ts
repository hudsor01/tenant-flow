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
import { RentPaymentsService } from './rent-payments.service'
import { User } from './types'

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
		@Request() _req: Request & { user: User },
		@Body()
		body: {
			tenantId: string
			leaseId: string
			amount: number
			paymentMethodId: string
		}
	) {
		this.logger.log(
			`Creating one-time payment for tenant ${body.tenantId}, lease ${body.leaseId}`
		)

		const result = await this.rentPaymentsService.createOneTimePayment(
			body,
			_req.user?.id
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
	 */
	@Get('history')
	async getPaymentHistory(@Request() _req: Request & { user: User }) {
		this.logger.log(`Getting payment history for user ${_req.user?.id}`)

		const payments = await this.rentPaymentsService.getPaymentHistory(
			_req.user?.id
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
	 * Get payment history for a specific subscription
	 * Phase 4: Payment History Enhancement
	 *
	 * GET /api/v1/payments/history/subscription/:subscriptionId
	 */
	@Get('history/subscription/:subscriptionId')
	async getSubscriptionPaymentHistory(
		@Request() _req: Request & { user: User },
		@Param('subscriptionId') subscriptionId: string
	) {
		this.logger.log(
			`Getting payment history for subscription ${subscriptionId} for user ${_req.user?.id}`
		)

		const payments =
			await this.rentPaymentsService.getSubscriptionPaymentHistory(
				subscriptionId,
				_req.user?.id
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
	 */
	@Get('failed-attempts')
	async getFailedPaymentAttempts(@Request() _req: Request & { user: User }) {
		this.logger.log(`Getting failed payment attempts for user ${_req.user?.id}`)

		const failedAttempts =
			await this.rentPaymentsService.getFailedPaymentAttempts(_req.user?.id)

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
	 */
	@Get('failed-attempts/subscription/:subscriptionId')
	async getSubscriptionFailedAttempts(
		@Request() _req: Request & { user: User },
		@Param('subscriptionId') subscriptionId: string
	) {
		this.logger.log(
			`Getting failed payment attempts for subscription ${subscriptionId} for user ${_req.user?.id}`
		)

		const failedAttempts =
			await this.rentPaymentsService.getSubscriptionFailedAttempts(
				subscriptionId,
				_req.user?.id
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
		@Request() _req: Request & { user: User },
		@Body()
		body: {
			tenantId: string
			leaseId: string
			paymentMethodId?: string
		}
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

		const result = await this.rentPaymentsService.setupTenantAutopay(params)

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
		@Request() _req: Request & { user: User },
		@Body()
		body: {
			tenantId: string
			leaseId: string
		}
	) {
		this.logger.log(
			`Canceling autopay for tenant ${body.tenantId}, lease ${body.leaseId}`
		)

		await this.rentPaymentsService.cancelTenantAutopay({
			tenantId: body.tenantId,
			leaseId: body.leaseId
		})

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
		@Request() _req: Request & { user: User },
		@Param('tenantId') tenantId: string,
		@Param('leaseId') leaseId: string
	) {
		this.logger.log(
			`Getting autopay status for tenant ${tenantId}, lease ${leaseId}`
		)

		const status = await this.rentPaymentsService.getAutopayStatus({
			tenantId,
			leaseId
		})

		return {
			enabled: status.enabled,
			subscriptionId: status.subscriptionId,
			status: status.status,
			nextPaymentDate: status.nextPaymentDate
		}
	}
}
