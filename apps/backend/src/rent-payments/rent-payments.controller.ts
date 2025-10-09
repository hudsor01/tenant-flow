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
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard'
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
		@Request() req: Request & { user: User },
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
			req.user?.id
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
	async getPaymentHistory(@Request() req: Request & { user: User }) {
		this.logger.log(`Getting payment history for user ${req.user?.id}`)

		const payments = await this.rentPaymentsService.getPaymentHistory(
			req.user?.id
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
		@Request() req: Request & { user: User },
		@Param('subscriptionId') subscriptionId: string
	) {
		this.logger.log(
			`Getting payment history for subscription ${subscriptionId} for user ${req.user?.id}`
		)

		const payments =
			await this.rentPaymentsService.getSubscriptionPaymentHistory(
				subscriptionId,
				req.user?.id
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
	async getFailedPaymentAttempts(@Request() req: Request & { user: User }) {
		this.logger.log(`Getting failed payment attempts for user ${req.user?.id}`)

		const failedAttempts =
			await this.rentPaymentsService.getFailedPaymentAttempts(req.user?.id)

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
		@Request() req: Request & { user: User },
		@Param('subscriptionId') subscriptionId: string
	) {
		this.logger.log(
			`Getting failed payment attempts for subscription ${subscriptionId} for user ${req.user?.id}`
		)

		const failedAttempts =
			await this.rentPaymentsService.getSubscriptionFailedAttempts(
				subscriptionId,
				req.user?.id
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
}
