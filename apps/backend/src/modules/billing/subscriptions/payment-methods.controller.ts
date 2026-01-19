import {
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Body,
	Req,
	Res,
	HttpStatus,
	BadRequestException,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
	Inject,
	forwardRef
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
import type { Response } from 'express'
import { StripeService } from '../stripe.service'
import { StripeSharedService } from '../stripe-shared.service'
import { PaymentMethodService } from './payment-method.service'
import { BillingService } from '../billing.service'
import { SecurityService } from '../../../security/security.service'
import { SupabaseService } from '../../../database/supabase.service'
import { STRIPE_API_THROTTLE, TenantAuthenticatedRequest } from '../stripe.controller.shared'
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
 * Payment methods and billing portal controller
 */
@ApiTags('Stripe')
@ApiBearerAuth('supabase-auth')
@Controller('stripe')
export class PaymentMethodsController {
	constructor(
		@Inject(forwardRef(() => StripeService))
		private readonly stripeService: StripeService,
		@Inject(forwardRef(() => StripeSharedService))
		private readonly stripeSharedService: StripeSharedService,
		private readonly paymentMethodService: PaymentMethodService,
		@Inject(forwardRef(() => BillingService))
		private readonly billingService: BillingService,
		private readonly securityService: SecurityService,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Create a Payment Intent for one-time payments
	 */
	@ApiOperation({ summary: 'Create payment intent', description: 'Create a Stripe Payment Intent for one-time payments' })
	@ApiBody({ schema: { type: 'object', properties: { amount: { type: 'number', description: 'Amount in cents' }, currency: { type: 'string', minLength: 3, maxLength: 3 }, description: { type: 'string' } }, required: ['amount', 'currency'] } })
	@ApiResponse({ status: 201, description: 'Payment intent created' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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
	@ApiOperation({ summary: 'Create customer', description: 'Create a Stripe Customer for recurring payments' })
	@ApiBody({ schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, name: { type: 'string' } }, required: ['email'] } })
	@ApiResponse({ status: 201, description: 'Customer created' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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
	@ApiOperation({ summary: 'Create billing portal session', description: 'Create a Stripe Billing Portal session for self-service billing management' })
	@ApiResponse({ status: 200, description: 'Portal session URL returned' })
	@ApiResponse({ status: 401, description: 'Unauthorized or customer verification failed' })
	@ApiResponse({ status: 404, description: 'User or customer not found' })
	@Post('create-billing-portal-session')
	@Throttle({ default: STRIPE_API_THROTTLE })
	async createBillingPortalSession(@Req() req: TenantAuthenticatedRequest) {
		const userId = req.user.id
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
				throw new InternalServerErrorException(
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
	@ApiOperation({ summary: 'Get invoices', description: 'Get paginated list of billing invoices for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Invoices retrieved' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'User not found' })
	@Get('invoices')
	@Throttle({ default: STRIPE_API_THROTTLE })
	async getInvoices(@Req() req: TenantAuthenticatedRequest): Promise<{
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
		const userId = req.user.id
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

	/**
	 * Get tenant's payment methods from Stripe
	 * Returns payment methods attached to the tenant's Stripe customer
	 */
	@ApiOperation({ summary: 'Get tenant payment methods', description: 'Get all payment methods attached to the tenant\'s Stripe customer' })
	@ApiResponse({ status: 200, description: 'Payment methods retrieved' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Get('tenant-payment-methods')
	@Throttle({ default: STRIPE_API_THROTTLE })
	async getTenantPaymentMethods(@Req() req: TenantAuthenticatedRequest): Promise<{
		payment_methods: Array<{
			id: string
			tenantId: string
			stripePaymentMethodId: string
			type: 'card' | 'us_bank_account'
			last4: string | null
			brand: string | null
			bankName: string | null
			isDefault: boolean
			createdAt: string
		}>
	}> {
		const userId = req.user.id
		// Get user token for RLS-enforced database queries
		const userToken = this.supabase.getTokenFromRequest(req)
		if (!userToken) {
			throw new UnauthorizedException('Valid authentication token required')
		}

		// Get tenant record for this user
		const { data: tenant, error: tenantError } = await this.supabase
			.getUserClient(userToken)
			.from('tenants')
			.select('id, stripe_customer_id')
			.eq('user_id', userId)
			.single()

		if (tenantError || !tenant) {
			throw new NotFoundException('Tenant record not found')
		}

		if (!tenant.stripe_customer_id) {
			// Tenant doesn't have a Stripe customer yet - return empty list
			return { payment_methods: [] }
		}

		// Fetch payment methods from Stripe (both cards and bank accounts)
		const [cardMethods, bankMethods] = await Promise.all([
			this.paymentMethodService.listPaymentMethods(
				tenant.stripe_customer_id,
				'card'
			),
			this.paymentMethodService.listPaymentMethods(
				tenant.stripe_customer_id,
				'us_bank_account'
			)
		])

		// Get customer default payment method
		const customer = await this.stripeService.getCustomer(
			tenant.stripe_customer_id
		)
		const defaultPaymentMethodId =
			typeof customer?.invoice_settings?.default_payment_method === 'string'
				? customer.invoice_settings.default_payment_method
				: customer?.invoice_settings?.default_payment_method?.id

		// Map to response format
		const paymentMethods = [
			...cardMethods.map(pm => ({
				id: pm.id,
				tenantId: tenant.id,
				stripePaymentMethodId: pm.id,
				type: 'card' as const,
				last4: pm.card?.last4 ?? null,
				brand: pm.card?.brand ?? null,
				bankName: null,
				isDefault: pm.id === defaultPaymentMethodId,
				createdAt: new Date(pm.created * 1000).toISOString()
			})),
			...bankMethods.map(pm => ({
				id: pm.id,
				tenantId: tenant.id,
				stripePaymentMethodId: pm.id,
				type: 'us_bank_account' as const,
				last4: pm.us_bank_account?.last4 ?? null,
				brand: null,
				bankName: pm.us_bank_account?.bank_name ?? null,
				isDefault: pm.id === defaultPaymentMethodId,
				createdAt: new Date(pm.created * 1000).toISOString()
			}))
		]

		return { payment_methods: paymentMethods }
	}

	/**
	 * Delete a tenant's payment method from Stripe
	 * Detaches the payment method from the customer
	 */
	@ApiOperation({ summary: 'Delete tenant payment method', description: 'Detach a payment method from the tenant\'s Stripe customer' })
	@ApiParam({ name: 'paymentMethodId', type: String, description: 'Stripe payment method ID' })
	@ApiResponse({ status: 200, description: 'Payment method removed' })
	@ApiResponse({ status: 400, description: 'No Stripe customer found' })
	@ApiResponse({ status: 401, description: 'Unauthorized or payment method does not belong to tenant' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Delete('tenant-payment-methods/:paymentMethodId')
	@Throttle({ default: STRIPE_API_THROTTLE })
	async deleteTenantPaymentMethod(
		@Param('paymentMethodId') paymentMethodId: string,
		@Req() req: TenantAuthenticatedRequest
	): Promise<{ success: boolean; message: string }> {
		const userId = req.user.id
		// Get user token for RLS-enforced database queries
		const userToken = this.supabase.getTokenFromRequest(req)
		if (!userToken) {
			throw new UnauthorizedException('Valid authentication token required')
		}

		// Get tenant record for this user
		const { data: tenant, error: tenantError } = await this.supabase
			.getUserClient(userToken)
			.from('tenants')
			.select('id, stripe_customer_id')
			.eq('user_id', userId)
			.single()

		if (tenantError || !tenant) {
			throw new NotFoundException('Tenant record not found')
		}

		if (!tenant.stripe_customer_id) {
			throw new BadRequestException('No Stripe customer found for tenant')
		}

		// Verify the payment method belongs to this customer
		const stripe = this.stripeService.getStripe()
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

		if (paymentMethod.customer !== tenant.stripe_customer_id) {
			throw new UnauthorizedException(
				'Payment method does not belong to this tenant'
			)
		}

		// Detach the payment method
		await this.paymentMethodService.detachPaymentMethod(paymentMethodId)

		// Log audit event
		await this.securityService.logAuditEvent({
			user_id: userId,
			action: 'delete_payment_method',
			entity_type: 'payment_method',
			entity_id: paymentMethodId,
			details: { tenant_id: tenant.id }
		})

		return { success: true, message: 'Payment method removed successfully' }
	}
}
