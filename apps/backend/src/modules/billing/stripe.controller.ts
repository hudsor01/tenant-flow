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
 * Stripe Controller
 *
 * Provides generic Stripe operations not covered by specialized controllers:
 * - Account & balance info
 * - Charges & refunds
 * - Checkout sessions
 * - Invoice operations
 *
 * For specialized operations, use:
 * - /stripe/connect - Connected account management
 * - /stripe/tenant - Tenant payment operations
 * - /stripe/subscriptions - Subscription management
 */
@ApiTags('Stripe')
@ApiBearerAuth('supabase-auth')
@Controller('stripe')
@Throttle({ default: STRIPE_API_THROTTLE })
export class StripeController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly stripeSharedService: StripeSharedService,
		private readonly logger: AppLogger
	) {}

	// ============================================
	// Account & Balance Operations
	// ============================================

	@ApiOperation({
		summary: 'Get platform account info',
		description: 'Retrieve Stripe account information for the platform'
	})
	@ApiResponse({ status: 200, description: 'Account info retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 500, description: 'Failed to retrieve account info' })
	@Get('account')
	async getAccount(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const account = await stripe.accounts.retrieve()
			return {
				id: account.id,
				business_profile: account.business_profile,
				capabilities: account.capabilities,
				charges_enabled: account.charges_enabled,
				payouts_enabled: account.payouts_enabled,
				country: account.country,
				default_currency: account.default_currency
			}
		} catch (error) {
			this.logger.error('Failed to get Stripe account', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	@ApiOperation({
		summary: 'Get platform account balance',
		description: 'Retrieve current balance for the platform Stripe account'
	})
	@ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 500, description: 'Failed to retrieve balance' })
	@Get('account/balance')
	async getAccountBalance(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const balance = await stripe.balance.retrieve()
			return balance
		} catch (error) {
			this.logger.error('Failed to get Stripe balance', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

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

	// ============================================
	// Invoice Operations
	// ============================================

	@ApiOperation({
		summary: 'Create invoice',
		description: 'Create a new invoice for a customer'
	})
	@ApiBody({
		schema: {
			type: 'object',
			required: ['customer'],
			properties: {
				customer: { type: 'string', description: 'Stripe customer ID' },
				description: { type: 'string', description: 'Invoice description' },
				auto_advance: {
					type: 'boolean',
					description: 'Auto-finalize invoice (default: true)'
				},
				collection_method: {
					type: 'string',
					enum: ['charge_automatically', 'send_invoice'],
					description: 'How to collect payment'
				},
				days_until_due: {
					type: 'integer',
					description: 'Days until invoice is due (for send_invoice)'
				}
			}
		}
	})
	@ApiResponse({ status: 200, description: 'Invoice created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid invoice request' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('invoices')
	async createInvoice(
		@Request() req: AuthenticatedRequest,
		@Body()
		body: {
			customer: string
			description?: string
			auto_advance?: boolean
			collection_method?: 'charge_automatically' | 'send_invoice'
			days_until_due?: number
			metadata?: Record<string, string>
		}
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		if (!body.customer) {
			throw new BadRequestException('Customer ID is required')
		}

		const idempotencyKey = this.stripeSharedService.generateIdempotencyKey(
			'invoice',
			req.user.id,
			`${body.customer}_${Date.now()}`
		)

		try {
			const stripe = this.stripeService.getStripe()

			const invoiceParams: Stripe.InvoiceCreateParams = {
				customer: body.customer,
				auto_advance: body.auto_advance ?? true,
				collection_method: body.collection_method || 'charge_automatically',
				metadata: {
					...body.metadata,
					created_by: req.user.id
				}
			}

			// Only add optional properties if they're defined (exactOptionalPropertyTypes)
			if (body.description) {
				invoiceParams.description = body.description
			}
			if (body.days_until_due !== undefined) {
				invoiceParams.days_until_due = body.days_until_due
			}

			const invoice = await stripe.invoices.create(invoiceParams, {
				idempotencyKey
			})

			this.logger.log('Invoice created', {
				invoice_id: invoice.id,
				user_id: req.user.id
			})

			return invoice
		} catch (error) {
			this.logger.error('Failed to create invoice', { error })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	@ApiOperation({
		summary: 'Send invoice',
		description: 'Send an invoice to the customer via email'
	})
	@ApiParam({ name: 'id', type: String, description: 'Stripe invoice ID (in_*)' })
	@ApiResponse({ status: 200, description: 'Invoice sent successfully' })
	@ApiResponse({ status: 400, description: 'Invalid invoice ID or invoice cannot be sent' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('invoices/:id/send')
	async sendInvoice(
		@Request() req: AuthenticatedRequest,
		@Param('id') invoiceId: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		if (!invoiceId || !invoiceId.startsWith('in_')) {
			throw new BadRequestException('Invalid invoice ID format')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const invoice = await stripe.invoices.sendInvoice(invoiceId)

			this.logger.log('Invoice sent', {
				invoice_id: invoice.id,
				user_id: req.user.id
			})

			return { id: invoice.id, status: invoice.status }
		} catch (error) {
			this.logger.error('Failed to send invoice', { error, invoiceId })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	@ApiOperation({
		summary: 'Void invoice',
		description: 'Void an invoice to mark it as cancelled'
	})
	@ApiParam({ name: 'id', type: String, description: 'Stripe invoice ID (in_*)' })
	@ApiResponse({ status: 200, description: 'Invoice voided successfully' })
	@ApiResponse({ status: 400, description: 'Invalid invoice ID or invoice cannot be voided' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('invoices/:id/void')
	async voidInvoice(
		@Request() req: AuthenticatedRequest,
		@Param('id') invoiceId: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		if (!invoiceId || !invoiceId.startsWith('in_')) {
			throw new BadRequestException('Invalid invoice ID format')
		}

		try {
			const stripe = this.stripeService.getStripe()
			const invoice = await stripe.invoices.voidInvoice(invoiceId)

			this.logger.log('Invoice voided', {
				invoice_id: invoice.id,
				user_id: req.user.id
			})

			return { id: invoice.id, status: invoice.status }
		} catch (error) {
			this.logger.error('Failed to void invoice', { error, invoiceId })
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}
}
