import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Request,
	UseGuards
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { TenantOwnershipGuard } from '../../shared/guards/tenant-ownership.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { StripeTenantService } from './stripe-tenant.service'
import { StripeOwnerService } from './stripe-owner.service'
import { AppConfigService } from '../../config/app-config.service'

/**
 * Stripe Tenant Controller
 *
 * Manages Stripe Customer and payment method operations for Tenants
 * Separate from main StripeController for cleaner domain separation
 */
@ApiTags('Stripe Tenant')
@ApiBearerAuth('supabase-auth')
@Controller('stripe/tenant')
@UseGuards(TenantOwnershipGuard)
export class StripeTenantController {
	constructor(
		private readonly stripeTenantService: StripeTenantService,
		private readonly stripeOwnerService: StripeOwnerService,
		private readonly config: AppConfigService
	) {}

	/**
	 * Create Stripe Customer for Tenant
	 * POST /api/v1/stripe/tenant/create-customer
	 */
	@ApiOperation({ summary: 'Create customer', description: 'Create a Stripe Customer for a tenant' })
	@ApiBody({ schema: { type: 'object', properties: { tenant_id: { type: 'string', format: 'uuid' }, email: { type: 'string', format: 'email' }, name: { type: 'string' }, phone: { type: 'string' } }, required: ['tenant_id', 'email'] } })
	@ApiResponse({ status: 200, description: 'Customer created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('create-customer')
	async createCustomer(
		@Request() _req: AuthenticatedRequest,
		@Body()
		body: { tenant_id: string; email: string; name?: string; phone?: string }
	) {
		if (!body.tenant_id || !body.email) {
			throw new BadRequestException('tenant_id and email are required')
		}

		const params: {
			tenant_id: string
			email: string
			name?: string
			phone?: string
		} = {
			tenant_id: body.tenant_id,
			email: body.email
		}
		if (body.name) params.name = body.name
		if (body.phone) params.phone = body.phone

		const customer =
			await this.stripeTenantService.createStripeCustomerForTenant(params)

		return {
			success: true,
			customer
		}
	}

	/**
	 * Attach payment method to Tenant's Stripe Customer
	 * POST /api/v1/stripe/tenant/attach-payment-method
	 */
	@ApiOperation({ summary: 'Attach payment method', description: 'Attach a payment method to tenant\'s Stripe Customer' })
	@ApiBody({ schema: { type: 'object', properties: { tenant_id: { type: 'string', format: 'uuid' }, paymentMethodId: { type: 'string' }, setAsDefault: { type: 'boolean' } }, required: ['tenant_id', 'paymentMethodId'] } })
	@ApiResponse({ status: 200, description: 'Payment method attached' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('attach-payment-method')
	async attachPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body()
		body: { tenant_id: string; paymentMethodId: string; setAsDefault?: boolean }
	) {
		if (!body.tenant_id || !body.paymentMethodId) {
			throw new BadRequestException(
				'tenant_id and paymentMethodId are required'
			)
		}

		const params: {
			tenant_id: string
			paymentMethodId: string
			setAsDefault?: boolean
		} = {
			tenant_id: body.tenant_id,
			paymentMethodId: body.paymentMethodId
		}
		if (body.setAsDefault !== undefined) params.setAsDefault = body.setAsDefault

		const paymentMethod =
			await this.stripeTenantService.attachPaymentMethod(params)

		return {
			success: true,
			paymentMethod
		}
	}

	/**
	 * List payment methods for Tenant
	 * GET /api/v1/stripe/tenant/payment-methods/:tenant_id
	 */
	@ApiOperation({ summary: 'List payment methods', description: 'List all payment methods for a tenant' })
	@ApiParam({ name: 'tenant_id', type: 'string', format: 'uuid', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Payment methods retrieved' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('payment-methods/:tenant_id')
	async listPaymentMethods(
		@Request() _req: AuthenticatedRequest,
		@Param('tenant_id', ParseUUIDPipe) tenant_id: string
	) {
		const paymentMethods =
			await this.stripeTenantService.listPaymentMethods(tenant_id)

		return {
			paymentMethods
		}
	}

	/**
	 * Get default payment method for Tenant
	 * GET /api/v1/stripe/tenant/default-payment-method/:tenant_id
	 */
	@ApiOperation({ summary: 'Get default payment method', description: 'Get the default payment method for a tenant' })
	@ApiParam({ name: 'tenant_id', type: 'string', format: 'uuid', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Default payment method retrieved' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('default-payment-method/:tenant_id')
	async getDefaultPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Param('tenant_id', ParseUUIDPipe) tenant_id: string
	) {
		const paymentMethod =
			await this.stripeTenantService.getDefaultPaymentMethod(tenant_id)

		return {
			paymentMethod
		}
	}

	/**
	 * Set default payment method for Tenant
	 * POST /api/v1/stripe/tenant/set-default-payment-method
	 */
	@ApiOperation({ summary: 'Set default payment method', description: 'Set the default payment method for a tenant' })
	@ApiBody({ schema: { type: 'object', properties: { tenant_id: { type: 'string', format: 'uuid' }, paymentMethodId: { type: 'string' } }, required: ['tenant_id', 'paymentMethodId'] } })
	@ApiResponse({ status: 200, description: 'Default payment method set' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('set-default-payment-method')
	async setDefaultPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body() body: { tenant_id: string; paymentMethodId: string }
	) {
		if (!body.tenant_id || !body.paymentMethodId) {
			throw new BadRequestException(
				'tenant_id and paymentMethodId are required'
			)
		}

		await this.stripeTenantService.setDefaultPaymentMethod(
			body.tenant_id,
			body.paymentMethodId
		)

		return {
			success: true
		}
	}

	/**
	 * Detach payment method from Tenant
	 * DELETE /api/v1/stripe/tenant/detach-payment-method
	 */
	@ApiOperation({ summary: 'Detach payment method', description: 'Detach a payment method from tenant\'s Stripe Customer' })
	@ApiBody({ schema: { type: 'object', properties: { tenant_id: { type: 'string', format: 'uuid' }, paymentMethodId: { type: 'string' } }, required: ['tenant_id', 'paymentMethodId'] } })
	@ApiResponse({ status: 200, description: 'Payment method detached' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete('detach-payment-method')
	async detachPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body() body: { tenant_id: string; paymentMethodId: string }
	) {
		if (!body.tenant_id || !body.paymentMethodId) {
			throw new BadRequestException(
				'tenant_id and paymentMethodId are required'
			)
		}

		await this.stripeTenantService.detachPaymentMethod(
			body.tenant_id,
			body.paymentMethodId
		)

		return {
			success: true
		}
	}

	/**
	 * Create Billing Portal session for Tenant
	 * Allows tenants to manage their payment methods and view billing history
	 * POST /api/v1/stripe/tenant/portal-session
	 */
	@ApiOperation({ summary: 'Create portal session', description: 'Create a Stripe Billing Portal session for tenant self-service' })
	@ApiBody({ schema: { type: 'object', properties: { tenant_id: { type: 'string', format: 'uuid' }, returnUrl: { type: 'string', format: 'uri' } }, required: ['tenant_id'] } })
	@ApiResponse({ status: 200, description: 'Portal session created' })
	@ApiResponse({ status: 400, description: 'Invalid request data or customer not found' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('portal-session')
	async createPortalSession(
		@Request() _req: AuthenticatedRequest,
		@Body() body: { tenant_id: string; returnUrl?: string }
	) {
		if (!body.tenant_id) {
			throw new BadRequestException('tenant_id is required')
		}

		// Get or create Stripe Customer for tenant
		const customer = await this.stripeTenantService.getStripeCustomerForTenant(
			body.tenant_id
		)

		if (!customer) {
			// Customer doesn't exist yet, we need tenant info to create one
			throw new BadRequestException(
				'Stripe Customer not found for tenant. Please create a customer first.'
			)
		}

		// Create portal session
		const stripe = this.stripeTenantService['stripe'] // Access private stripe instance
		const session = await stripe.billingPortal.sessions.create({
			customer: customer.id,
			return_url:
				body.returnUrl || `${this.config.getNextPublicAppUrl()}/tenant/payments`
		})

		return {
			success: true,
			url: session.url
		}
	}

	/**
	 * Pay rent using saved payment method
	 * Creates PaymentIntent with destination charges to property owner's Connect account
	 * POST /api/v1/stripe/tenant/pay-rent
	 */
	@ApiOperation({ summary: 'Pay rent', description: 'Create a rent payment using saved payment method with transfer to property owner' })
	@ApiBody({ schema: { type: 'object', properties: { lease_id: { type: 'string', format: 'uuid' }, payment_method_id: { type: 'string' }, tenant_id: { type: 'string', format: 'uuid' } }, required: ['lease_id', 'payment_method_id', 'tenant_id'] } })
	@ApiResponse({ status: 200, description: 'Payment intent created' })
	@ApiResponse({ status: 400, description: 'Invalid request data or customer not found' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('pay-rent')
	async payRent(
		@Request() _req: AuthenticatedRequest,
		@Body()
		body: {
			lease_id: string
			payment_method_id: string
			tenant_id: string
		}
	) {
		if (!body.lease_id || !body.payment_method_id || !body.tenant_id) {
			throw new BadRequestException(
				'lease_id, payment_method_id, and tenant_id are required'
			)
		}

		// Get tenant's Stripe customer ID
		const customer = await this.stripeTenantService.getStripeCustomerForTenant(
			body.tenant_id
		)

		if (!customer) {
			throw new BadRequestException(
				'Stripe Customer not found for tenant. Please add a payment method first.'
			)
		}

		const paymentIntent = await this.stripeOwnerService.createRentPaymentIntent(
			{
				leaseId: body.lease_id,
				paymentMethodId: body.payment_method_id,
				tenantStripeCustomerId: customer.id
			}
		)

		return {
			success: true,
			paymentIntent: {
				id: paymentIntent.id,
				status: paymentIntent.status,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				clientSecret: paymentIntent.client_secret
			}
		}
	}
}
