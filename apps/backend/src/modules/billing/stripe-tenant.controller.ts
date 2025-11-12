import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Request,
	UseGuards
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import type { AuthenticatedRequest } from '@repo/shared/types/auth'
import { StripeTenantService } from './stripe-tenant.service'

/**
 * Stripe Tenant Controller
 *
 * Manages Stripe Customer and payment method operations for Tenants
 * Separate from main StripeController for cleaner domain separation
 */
@Controller('stripe/tenant')
@UseGuards(JwtAuthGuard)
export class StripeTenantController {
	constructor(private readonly stripeTenantService: StripeTenantService) {}

	/**
	 * Create Stripe Customer for Tenant
	 * POST /api/v1/stripe/tenant/create-customer
	 */
	@Post('create-customer')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 customer creations per minute (SEC-002)
	async createCustomer(
		@Request() _req: AuthenticatedRequest,
		@Body()
		body: { tenantId: string; email: string; name?: string; phone?: string }
	) {
		if (!body.tenantId || !body.email) {
			throw new BadRequestException('tenantId and email are required')
		}

		const params: {
			tenantId: string
			email: string
			name?: string
			phone?: string
		} = {
			tenantId: body.tenantId,
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
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 payment method attachments per minute (SEC-002)
	async attachPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body()
		body: { tenantId: string; paymentMethodId: string; setAsDefault?: boolean }
	) {
		if (!body.tenantId || !body.paymentMethodId) {
			throw new BadRequestException('tenantId and paymentMethodId are required')
		}

		const params: {
			tenantId: string
			paymentMethodId: string
			setAsDefault?: boolean
		} = {
			tenantId: body.tenantId,
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
	 * GET /api/v1/stripe/tenant/payment-methods/:tenantId
	 */
	@Get('payment-methods/:tenantId')
	async listPaymentMethods(
		@Request() _req: AuthenticatedRequest,
		@Param('tenantId') tenantId: string
	) {
		const paymentMethods =
			await this.stripeTenantService.listPaymentMethods(tenantId)

		return {
			paymentMethods
		}
	}

	/**
	 * Get default payment method for Tenant
	 * GET /api/v1/stripe/tenant/default-payment-method/:tenantId
	 */
	@Get('default-payment-method/:tenantId')
	async getDefaultPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Param('tenantId') tenantId: string
	) {
		const paymentMethod =
			await this.stripeTenantService.getDefaultPaymentMethod(tenantId)

		return {
			paymentMethod
		}
	}

	/**
	 * Set default payment method for Tenant
	 * POST /api/v1/stripe/tenant/set-default-payment-method
	 */
	@Post('set-default-payment-method')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 default payment method changes per minute (SEC-002)
	async setDefaultPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body() body: { tenantId: string; paymentMethodId: string }
	) {
		if (!body.tenantId || !body.paymentMethodId) {
			throw new BadRequestException('tenantId and paymentMethodId are required')
		}

		await this.stripeTenantService.setDefaultPaymentMethod(
			body.tenantId,
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
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 payment method detachments per minute (SEC-002)
	async detachPaymentMethod(
		@Request() _req: AuthenticatedRequest,
		@Body() body: { tenantId: string; paymentMethodId: string }
	) {
		if (!body.tenantId || !body.paymentMethodId) {
			throw new BadRequestException('tenantId and paymentMethodId are required')
		}

		await this.stripeTenantService.detachPaymentMethod(
			body.tenantId,
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
		@Body() body: { tenantId: string; returnUrl?: string }
	) {
		if (!body.tenantId) {
			throw new BadRequestException('tenantId is required')
		}

		// Get or create Stripe Customer for tenant
		const customer = await this.stripeTenantService.getStripeCustomerForTenant(
			body.tenantId
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
				body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/tenant/payments`
		})

		return {
			success: true,
			url: session.url
		}
	}
}
