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
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import type { AuthenticatedRequest } from '@repo/shared/types/auth'
import { StripeTenantService } from './stripe-tenant.service'
import { AppConfigService } from '../../config/app-config.service'

/**
 * Stripe Tenant Controller
 *
 * Manages Stripe Customer and payment method operations for Tenants
 * Separate from main StripeController for cleaner domain separation
 */
@Controller('stripe/tenant')
@UseGuards(JwtAuthGuard)
export class StripeTenantController {
	constructor(
		private readonly stripeTenantService: StripeTenantService,
		private readonly config: AppConfigService
	) {}

	/**
	 * Create Stripe Customer for Tenant
	 * POST /api/v1/stripe/tenant/create-customer
	 */
	@Post('create-customer')
	@UseGuards(PropertyOwnershipGuard)
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
	@Post('attach-payment-method')
	async attachPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body()
		body: { tenant_id: string; paymentMethodId: string; setAsDefault?: boolean }
	) {
		if (!body.tenant_id || !body.paymentMethodId) {
			throw new BadRequestException('tenant_id and paymentMethodId are required')
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
	@Post('set-default-payment-method')
	async setDefaultPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body() body: { tenant_id: string; paymentMethodId: string }
	) {
		if (!body.tenant_id || !body.paymentMethodId) {
			throw new BadRequestException('tenant_id and paymentMethodId are required')
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
	@Delete('detach-payment-method')
	async detachPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body() body: { tenant_id: string; paymentMethodId: string }
	) {
		if (!body.tenant_id || !body.paymentMethodId) {
			throw new BadRequestException('tenant_id and paymentMethodId are required')
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
}
