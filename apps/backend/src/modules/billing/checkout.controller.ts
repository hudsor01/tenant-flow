import {
	Body,
	Controller,
	Get,
	Param,
	Post,
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
 * Checkout Controller
 *
 * Handles Stripe Checkout session operations:
 * - POST /stripe/checkout-sessions - Create checkout session
 * - GET /stripe/checkout-sessions/:id - Get checkout session
 * - POST /stripe/checkout-sessions/:id/expire - Expire checkout session
 */
@ApiTags('Stripe')
@ApiBearerAuth('supabase-auth')
@Controller('stripe')
@Throttle({ default: STRIPE_API_THROTTLE })
export class CheckoutController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly stripeSharedService: StripeSharedService,
		private readonly logger: AppLogger
	) {}

	// ============================================
	// Checkout Session Operations
	// ============================================

	@ApiOperation({
		summary: 'Create checkout session',
		description: 'Create a Stripe Checkout session for payment collection'
	})
	@ApiBody({
		schema: {
			type: 'object',
			required: ['success_url', 'cancel_url', 'line_items'],
			properties: {
				success_url: { type: 'string', description: 'URL to redirect on success' },
				cancel_url: { type: 'string', description: 'URL to redirect on cancel' },
				mode: {
					type: 'string',
					enum: ['payment', 'subscription', 'setup'],
					description: 'Checkout mode'
				},
				line_items: {
					type: 'array',
					description: 'Line items for checkout',
					items: {
						type: 'object',
						properties: {
							price: { type: 'string', description: 'Stripe price ID' },
							quantity: { type: 'integer', description: 'Quantity' }
						}
					}
				},
				customer_email: { type: 'string', description: 'Pre-fill customer email' }
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Checkout session created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid checkout request' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('checkout-sessions')
	async createCheckoutSession(
		@Request() req: AuthenticatedRequest,
		@Body()
		body: {
			success_url: string
			cancel_url: string
			mode?: 'payment' | 'subscription' | 'setup'
			line_items?: Stripe.Checkout.SessionCreateParams.LineItem[]
			customer_email?: string
			customer?: string
			metadata?: Record<string, string>
		}
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		if (!body.success_url || !body.cancel_url) {
			throw new BadRequestException('success_url and cancel_url are required')
		}

		const idempotencyKey = this.stripeSharedService.generateIdempotencyKey(
			'checkout',
			req.user.id,
			`${body.mode || 'payment'}_${Date.now()}`
		)

		try {
			const params: Stripe.Checkout.SessionCreateParams = {
				success_url: body.success_url,
				cancel_url: body.cancel_url,
				mode: body.mode || 'payment',
				metadata: {
					...body.metadata,
					user_id: req.user.id
				}
			}

			// Only add optional properties if they're defined (exactOptionalPropertyTypes)
			if (body.line_items) {
				params.line_items = body.line_items
			}
			if (body.customer_email) {
				params.customer_email = body.customer_email
			}
			if (body.customer) {
				params.customer = body.customer
			}

			const session = await this.stripeService.createCheckoutSession(
				params,
				idempotencyKey
			)

			this.logger.log('Checkout session created', {
				session_id: session.id,
				user_id: req.user.id
			})

			return {
				id: session.id,
				url: session.url,
				status: session.status
			}
		} catch (error) {
			this.logger.error('Failed to create checkout session', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	@ApiOperation({
		summary: 'Get checkout session',
		description: 'Retrieve a checkout session by ID'
	})
	@ApiParam({
		name: 'id',
		type: String,
		description: 'Stripe checkout session ID (cs_*)'
	})
	@ApiResponse({ status: 200, description: 'Checkout session retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Checkout session not found' })
	@Get('checkout-sessions/:id')
	async getCheckoutSession(
		@Request() req: AuthenticatedRequest,
		@Param('id') sessionId: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		if (!sessionId || !sessionId.startsWith('cs_')) {
			throw new BadRequestException('Invalid checkout session ID format')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const session = await stripe.checkout.sessions.retrieve(sessionId)
			return session
		} catch (error) {
			this.logger.error('Failed to get checkout session', { error, sessionId })
			if (error instanceof Error && 'type' in error) {
				const stripeError = error as Stripe.errors.StripeError
				if (stripeError.type === 'StripeInvalidRequestError') {
					throw new NotFoundException('Checkout session not found')
				}
				this.stripeSharedService.handleStripeError(stripeError)
			}
			throw error
		}
	}

	@ApiOperation({
		summary: 'Expire checkout session',
		description: 'Expire a checkout session to prevent further use'
	})
	@ApiParam({
		name: 'id',
		type: String,
		description: 'Stripe checkout session ID (cs_*)'
	})
	@ApiResponse({ status: 200, description: 'Checkout session expired successfully' })
	@ApiResponse({ status: 400, description: 'Invalid session ID or session cannot be expired' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('checkout-sessions/:id/expire')
	async expireCheckoutSession(
		@Request() req: AuthenticatedRequest,
		@Param('id') sessionId: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		if (!sessionId || !sessionId.startsWith('cs_')) {
			throw new BadRequestException('Invalid checkout session ID format')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const session = await stripe.checkout.sessions.expire(sessionId)

			this.logger.log('Checkout session expired', {
				session_id: session.id,
				user_id: req.user.id
			})

			return { id: session.id, status: session.status }
		} catch (error) {
			this.logger.error('Failed to expire checkout session', { error, sessionId })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}
}
