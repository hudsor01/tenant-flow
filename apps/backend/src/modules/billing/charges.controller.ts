import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	Request,
	BadRequestException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { StripeService } from './stripe.service'
import { StripeSharedService } from './stripe-shared.service'
import { AppLogger } from '../../logger/app-logger.service'
import { STRIPE_API_THROTTLE } from './stripe.controller.shared'
import type Stripe from 'stripe'

/**
 * Charges Controller
 *
 * Handles charge and refund operations:
 * - GET /stripe/charges - List charges
 * - GET /stripe/charges/:id - Get charge details
 * - POST /stripe/refunds - Create refund
 * - GET /stripe/refunds - List refunds
 */
@ApiTags('Stripe')
@ApiBearerAuth('supabase-auth')
@Controller('stripe')
@Throttle({ default: STRIPE_API_THROTTLE })
export class ChargesController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly stripeSharedService: StripeSharedService,
		private readonly logger: AppLogger
	) {}

	// ============================================
	// Charges Operations
	// ============================================

	@ApiOperation({
		summary: 'List charges',
		description: 'List charges for the authenticated user with optional filtering'
	})
	@ApiQuery({
		name: 'customer',
		required: false,
		type: String,
		description: 'Filter by Stripe customer ID'
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of charges to return (1-100)'
	})
	@ApiResponse({ status: 200, description: 'Charges retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('charges')
	async listCharges(
		@Request() req: AuthenticatedRequest,
		@Query('customer') customer?: string,
		@Query('limit') limit?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const params: Stripe.ChargeListParams = {
				limit: limit ? Math.min(parseInt(limit, 10), 100) : 10
			}
			if (customer) {
				params.customer = customer
			}

			const charges = await stripe.charges.list(params)
			return { charges: charges.data, has_more: charges.has_more }
		} catch (error) {
			this.logger.error('Failed to list charges', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	@ApiOperation({
		summary: 'Get charge details',
		description: 'Retrieve details for a specific charge'
	})
	@ApiParam({ name: 'id', type: String, description: 'Stripe charge ID (ch_*)' })
	@ApiResponse({ status: 200, description: 'Charge retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Charge not found' })
	@Get('charges/:id')
	async getCharge(
		@Request() req: AuthenticatedRequest,
		@Param('id') chargeId: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		if (!chargeId || !chargeId.startsWith('ch_')) {
			throw new BadRequestException('Invalid charge ID format')
		}

		const charge = await this.stripeService.getCharge(chargeId)
		if (!charge) {
			throw new NotFoundException('Charge not found')
		}
		return charge
	}

	// ============================================
	// Refunds Operations
	// ============================================

	@ApiOperation({
		summary: 'Create refund',
		description: 'Create a refund for a charge or payment intent'
	})
	@ApiBody({
		schema: {
			type: 'object',
			required: ['charge'],
			properties: {
				charge: {
					type: 'string',
					description: 'Stripe charge ID (ch_*) or payment intent ID (pi_*)'
				},
				amount: {
					type: 'integer',
					description: 'Amount to refund in cents (omit for full refund)'
				},
				reason: {
					type: 'string',
					enum: ['duplicate', 'fraudulent', 'requested_by_customer'],
					description: 'Reason for refund'
				}
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Refund created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid refund request' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('refunds')
	async createRefund(
		@Request() req: AuthenticatedRequest,
		@Body()
		body: {
			charge?: string
			payment_intent?: string
			amount?: number
			reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
		}
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		if (!body.charge && !body.payment_intent) {
			throw new BadRequestException('Either charge or payment_intent is required')
		}

		const idempotencyKey = this.stripeSharedService.generateIdempotencyKey(
			'refund',
			req.user.id,
			body.charge || body.payment_intent
		)

		try {
			const stripe = this.stripeService.getStripe()
			const params: Stripe.RefundCreateParams = {}

			if (body.charge) {
				params.charge = body.charge
			}
			if (body.payment_intent) {
				params.payment_intent = body.payment_intent
			}
			if (body.amount) {
				params.amount = body.amount
			}
			if (body.reason) {
				params.reason = body.reason
			}

			const refund = await stripe.refunds.create(params, {
				idempotencyKey
			})

			this.logger.log('Refund created', {
				refund_id: refund.id,
				user_id: req.user.id
			})

			return refund
		} catch (error) {
			this.logger.error('Failed to create refund', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	@ApiOperation({
		summary: 'List refunds',
		description: 'List refunds with optional filtering'
	})
	@ApiQuery({
		name: 'charge',
		required: false,
		type: String,
		description: 'Filter by charge ID'
	})
	@ApiQuery({
		name: 'payment_intent',
		required: false,
		type: String,
		description: 'Filter by payment intent ID'
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of refunds to return (1-100)'
	})
	@ApiResponse({ status: 200, description: 'Refunds retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('refunds')
	async listRefunds(
		@Request() req: AuthenticatedRequest,
		@Query('charge') charge?: string,
		@Query('payment_intent') paymentIntent?: string,
		@Query('limit') limit?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const params: Stripe.RefundListParams = {
				limit: limit ? Math.min(parseInt(limit, 10), 100) : 10
			}
			if (charge) {
				params.charge = charge
			}
			if (paymentIntent) {
				params.payment_intent = paymentIntent
			}

			const refunds = await stripe.refunds.list(params)
			return { refunds: refunds.data, has_more: refunds.has_more }
		} catch (error) {
			this.logger.error('Failed to list refunds', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}
}
