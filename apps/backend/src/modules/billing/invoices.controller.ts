import {
	Body,
	Controller,
	Param,
	Post,
	Request,
	BadRequestException,
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
 * Invoices Controller
 *
 * Handles Stripe invoice operations:
 * - POST /stripe/invoices - Create invoice
 * - POST /stripe/invoices/:id/send - Send invoice
 * - POST /stripe/invoices/:id/void - Void invoice
 */
@ApiTags('Stripe')
@ApiBearerAuth('supabase-auth')
@Controller('stripe')
@Throttle({ default: STRIPE_API_THROTTLE })
export class InvoicesController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly stripeSharedService: StripeSharedService,
		private readonly logger: AppLogger
	) {}

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
