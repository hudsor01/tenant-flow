import {
	Controller,
	Get,
	Post,
	Body,
	Req,
	Res,
	HttpStatus,
	BadRequestException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { StripeService } from './stripe.service'
import { StripeSharedService } from './stripe-shared.service'
import { BillingService } from './billing.service'
import { SecurityService } from '../../security/security.service'
import { SupabaseService } from '../../database/supabase.service'
import { user_id } from '../../shared/decorators/user.decorator'
import { STRIPE_API_THROTTLE, TenantAuthenticatedRequest } from './stripe.controller.shared'
import { z } from 'zod'
import type Stripe from 'stripe'

/**
 * Validation Schemas
 */
const CreatePaymentIntentRequestSchema = z.object({
	amount: z.number().positive(),
	currency: z.string().min(3).max(3),
	description: z.string().optional()
})

const CreateCustomerRequestSchema = z.object({
	email: z.string().email(),
	name: z.string().optional()
})

/**
 * Stripe payment methods and billing portal controller
 */
@Controller('stripe')
export class StripePaymentMethodsController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly stripeSharedService: StripeSharedService,
		private readonly billingService: BillingService,
		private readonly securityService: SecurityService,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Create a Payment Intent for one-time payments
	 */
	@Post('payment-intents')
	async createPaymentIntent(
		@Req() req: TenantAuthenticatedRequest,
		@Res() res: Response,
		@Body() body: unknown
	) {
		try {
			const validatedBody = CreatePaymentIntentRequestSchema.parse(body)
			const userId = req.user?.id
			const tenantId = req.tenant?.id

			if (!userId || !tenantId) {
				throw new UnauthorizedException('User and tenant required')
			}

			// Generate idempotency key
			const idempotencyKey = this.stripeSharedService.generateIdempotencyKey(
				'pi',
				userId,
				`${validatedBody.amount}_${validatedBody.currency}`
			)

			// Build payment intent params - only include defined properties
			const piParams: Stripe.PaymentIntentCreateParams = {
				amount: validatedBody.amount,
				currency: validatedBody.currency
			}
			if (validatedBody.description) {
				piParams.description = validatedBody.description
			}

			const paymentIntent = await this.stripeService.createPaymentIntent(
				piParams,
				idempotencyKey
			)

			// Log audit event
			await this.securityService.logAuditEvent({
				user_id: userId,
				action: 'create_payment_intent',
				entity_type: 'payment_intent',
				entity_id: paymentIntent.id,
				details: {
					amount: validatedBody.amount,
					currency: validatedBody.currency
				}
			})

			res.status(HttpStatus.CREATED).json({
				success: true,
				data: paymentIntent
			})
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new BadRequestException('Invalid request data')
			}
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	/**
	 * Create a Customer for recurring payments
	 */
	@Post('customers')
	async createCustomer(
		@Req() req: TenantAuthenticatedRequest,
		@Res() res: Response,
		@Body() body: unknown
	) {
		try {
			const validatedBody = CreateCustomerRequestSchema.parse(body)
			const userId = req.user?.id
			const tenantId = req.tenant?.id

			if (!userId || !tenantId) {
				throw new UnauthorizedException('User and tenant required')
			}

			// Generate idempotency key
			const idempotencyKey = this.stripeSharedService.generateIdempotencyKey(
				'cus',
				userId,
				validatedBody.email
			)

			// Build customer params - only include defined properties
			const cusParams: Stripe.CustomerCreateParams = {
				email: validatedBody.email
			}
			if (validatedBody.name) {
				cusParams.name = validatedBody.name
			}

			const customer = await this.stripeService.createCustomer(
				cusParams,
				idempotencyKey
			)

			// Link customer to tenant
			await this.billingService.linkCustomerToTenant(customer.id, tenantId)

			// Log audit event
			await this.securityService.logAuditEvent({
				user_id: userId,
				action: 'create_customer',
				entity_type: 'customer',
				entity_id: customer.id,
				details: { email: validatedBody.email }
			})

			res.status(HttpStatus.CREATED).json({
				success: true,
				data: customer
			})
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new BadRequestException('Invalid request data')
			}
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}
			throw error
		}
	}

	/**
	 * Create Stripe Customer Portal session
	 * Allows users to manage their payment methods, view invoices, and update subscriptions
	 *
	 * SECURITY:
	 * - Verifies user owns the Stripe customer record
	 * - Validates return URL to prevent open redirects
	 * - Rate limited to prevent abuse
	 * - Logs audit events for security monitoring
	 * - Fails closed on any error (denies access)
	 */
	@Post('create-billing-portal-session')
	@Throttle({ default: STRIPE_API_THROTTLE })
	async createBillingPortalSession(
		@user_id() userId: string,
		@Req() req: TenantAuthenticatedRequest
	) {
		try {
			// Extract user token for RLS-enforced database queries
			const userToken = this.supabase.getTokenFromRequest(req)
			if (!userToken) {
				throw new UnauthorizedException('Valid authentication token required')
			}

			// Get user's email for customer lookup
			const { data: userData, error: userError } = await this.supabase
				.getUserClient(userToken)
				.from('users')
				.select('email, stripe_customer_id')
				.eq('id', userId)
				.single()

			if (userError || !userData) {
				// Log to user_errors table
				await this.supabase.getAdminClient().rpc('log_user_error', {
					p_error_type: 'application',
					p_error_code: 'BILLING_PORTAL_USER_NOT_FOUND',
					p_error_message: 'User record not found for billing portal',
					p_context: { userId, error: userError?.message }
				})
				throw new NotFoundException('User record not found')
			}

			// Verify user has a Stripe customer ID
			if (!userData.stripe_customer_id) {
				// Log to user_errors table
				await this.supabase.getAdminClient().rpc('log_user_error', {
					p_error_type: 'application',
					p_error_code: 'BILLING_PORTAL_NO_CUSTOMER',
					p_error_message: 'No Stripe customer found for user',
					p_context: { userId, email: userData.email }
				})
				throw new NotFoundException(
					'No Stripe customer found. Please contact support.'
				)
			}

			// Verify customer ownership (prevent lateral access)
			const stripe = this.stripeService.getStripe()
			const customer = await stripe.customers.retrieve(
				userData.stripe_customer_id
			)

			if ('deleted' in customer || customer.email !== userData.email) {
				// Customer mismatch - possible security issue
				await this.securityService.logAuditEvent({
					user_id: userId,
					action: 'billing_portal_customer_mismatch',
					entity_type: 'stripe_customer',
					entity_id: userData.stripe_customer_id,
					details: {
						severity: 'high',
						customer_email: 'email' in customer ? customer.email : null,
						user_email: userData.email
					}
				})
				throw new UnauthorizedException('Customer verification failed')
			}

			// Validate return URL (prevent open redirect attacks)
			const frontendUrl =
				process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL
			if (!frontendUrl) {
				throw new Error(
					'FRONTEND_URL or NEXT_PUBLIC_APP_URL environment variable not configured'
				)
			}
			const returnUrl = `${frontendUrl}/settings/billing`

			// Create billing portal session
			const session = await stripe.billingPortal.sessions.create({
				customer: userData.stripe_customer_id,
				return_url: returnUrl
			})

			// Log successful portal session creation
			await this.securityService.logAuditEvent({
				user_id: userId,
				action: 'billing_portal_created',
				entity_type: 'billing_portal_session',
				entity_id: session.id,
				details: {
					customer_id: userData.stripe_customer_id,
					return_url: returnUrl
				}
			})

			return {
				url: session.url
			}
		} catch (error) {
			// Log error for monitoring
			if (error instanceof Error) {
				await this.supabase.getAdminClient().rpc('log_user_error', {
					p_error_type: 'application',
					p_error_code: 'BILLING_PORTAL_ERROR',
					p_error_message: error.message,
					...(error.stack && { p_error_stack: error.stack }),
					p_context: {
						userId,
						error_name: error.name
					}
				})
			}

			// Re-throw for NestJS error handling
			if (
				error instanceof UnauthorizedException ||
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error
			}

			// Handle Stripe errors
			if (error instanceof Error && 'type' in error) {
				this.stripeSharedService.handleStripeError(
					error as Stripe.errors.StripeError
				)
			}

			throw error
		}
	}

	/**
	 * Get user's billing invoices from Stripe
	 * Returns paginated list of invoices for the authenticated user's Stripe customer
	 */
	@Get('invoices')
	@Throttle({ default: STRIPE_API_THROTTLE })
	async getInvoices(
		@user_id() userId: string,
		@Req() req: TenantAuthenticatedRequest
	): Promise<{
		invoices: Array<{
			id: string
			amount_paid: number
			status: string
			created: number
			invoice_pdf: string | null
			hosted_invoice_url: string | null
			currency: string
			description: string | null
		}>
	}> {
		// Get user token for RLS-enforced database queries
		const userToken = this.supabase.getTokenFromRequest(req)
		if (!userToken) {
			throw new UnauthorizedException('Valid authentication token required')
		}

		// Get user's Stripe customer ID
		const { data: userData, error: userError } = await this.supabase
			.getUserClient(userToken)
			.from('users')
			.select('stripe_customer_id')
			.eq('id', userId)
			.single()

		if (userError || !userData) {
			throw new NotFoundException('User record not found')
		}

		if (!userData.stripe_customer_id) {
			// User doesn't have a Stripe customer yet - return empty list
			return { invoices: [] }
		}

		// Fetch invoices from Stripe
		const stripeInvoices = await this.stripeService.listInvoices({
			customer: userData.stripe_customer_id,
			limit: 10
		})

		// Map to response format, coercing undefined to null for type safety
		const invoices = stripeInvoices.map(invoice => ({
			id: invoice.id,
			amount_paid: invoice.amount_paid,
			status: invoice.status ?? 'unknown',
			created: invoice.created,
			invoice_pdf: invoice.invoice_pdf ?? null,
			hosted_invoice_url: invoice.hosted_invoice_url ?? null,
			currency: invoice.currency,
			description: invoice.description
		}))

		return { invoices }
	}
}
