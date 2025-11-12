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
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { RentPaymentsService } from './rent-payments.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import {
	CreateRentPaymentDto,
	SetupAutopayDto,
	CancelAutopayDto
} from './dto/rent-payment.dto'

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
	 * SECURITY (SEC-003): Validated with Zod schema via ZodValidationPipe
	 */
	@Post()
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 payment attempts per minute (SEC-002)
	async createPayment(
		@Body() body: CreateRentPaymentDto,
		@Request() req: AuthenticatedRequest
	) {
		const requestingUserId = req.user.id

		this.logger.log(
			`Creating one-time payment for tenant ${body.tenantId}, lease ${body.leaseId}`
		)

		const result = await this.rentPaymentsService.createOneTimePayment(
			body,
			requestingUserId
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
	 * SECURITY (SEC-003): Validated with Zod schema via ZodValidationPipe
	 */
	@Post('autopay/setup')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 autopay setup attempts per minute (SEC-002)
	async setupAutopay(
		@Body() body: SetupAutopayDto,
		@Request() req: AuthenticatedRequest
	) {
		this.logger.log(
			`Setting up autopay for tenant ${body.tenantId}, lease ${body.leaseId}`
		)

		// Extract validated properties (DTO is validated by ZodValidationPipe)
		const params = {
			tenantId: body.tenantId,
			leaseId: body.leaseId,
			...(body.paymentMethodId && { paymentMethodId: body.paymentMethodId })
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
	 * SECURITY (SEC-003): Validated with Zod schema via ZodValidationPipe
	 */
	@Post('autopay/cancel')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 cancellation requests per minute (SEC-002)
	async cancelAutopay(
		@Body() body: CancelAutopayDto,
		@Request() req: AuthenticatedRequest
	) {
		this.logger.log(
			`Canceling autopay for tenant ${body.tenantId}, lease ${body.leaseId}`
		)

		await this.rentPaymentsService.cancelTenantAutopay(body, req.user.id)

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

		const status = await this.rentPaymentsService.getAutopayStatus(
			{
				tenantId,
				leaseId
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
	 * GET /api/v1/rent-payments/status/:tenantId
	 * ✅ RLS COMPLIANT: Uses @JwtToken decorator
	 */
	@Get('status/:tenantId')
	@Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 status checks per minute (SEC-002)
	async getCurrentPaymentStatus(
		@Param('tenantId') tenantId: string,
		@Request() req: AuthenticatedRequest
	) {
		const userId = req.user.id
		this.logger.log(`Getting current payment status for tenant ${tenantId}`)

		// ✅ Authorization now enforced at service layer (defense-in-depth)
		const paymentStatus =
			await this.rentPaymentsService.getCurrentPaymentStatus(tenantId, userId)

		return {
			status: paymentStatus.status,
			rentAmount: paymentStatus.rentAmount,
			nextDueDate: paymentStatus.nextDueDate,
			lastPaymentDate: paymentStatus.lastPaymentDate,
			outstandingBalance: paymentStatus.outstandingBalance,
			isOverdue: paymentStatus.isOverdue
		}
	}
}
