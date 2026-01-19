import {
	Controller,
	Get,
	Post,
	Patch,
	Body,
	Param,
	Req,
	Res,
	HttpStatus,
	BadRequestException,
	NotFoundException,
	UnauthorizedException,
	ParseUUIDPipe,
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
import { BillingService } from '../billing.service'
import { SecurityService } from '../../../security/security.service'
import { SupabaseService } from '../../../database/supabase.service'

import { STRIPE_API_THROTTLE, TenantAuthenticatedRequest } from '../stripe.controller.shared'
import { z } from 'zod'
import type Stripe from 'stripe'
import { uuidSchema } from '@repo/shared/validation/common'

/**
 * Validation Schemas
 */
const CreateSubscriptionRequestSchema = z.object({
	customer: uuidSchema,
	items: z.array(z.object({ price: z.string() }))
})

const UpdateSubscriptionRequestSchema = z.object({
	items: z.array(z.object({ price: z.string() })).optional(),
	proration_behavior: z
		.enum(['create_prorations', 'none', 'always_invoice'])
		.optional()
})

/**
 * Subscription controller
 */
@ApiTags('Stripe')
@ApiBearerAuth('supabase-auth')
@Controller('stripe')
export class SubscriptionController {
	constructor(
		@Inject(forwardRef(() => StripeService))
		private readonly stripeService: StripeService,
		@Inject(forwardRef(() => StripeSharedService))
		private readonly stripeSharedService: StripeSharedService,
		@Inject(forwardRef(() => BillingService))
		private readonly billingService: BillingService,
		private readonly securityService: SecurityService,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Create a Subscription for recurring payments
	 * Note: Subscription data is automatically synced to stripe schema by Stripe Sync Engine
	 */
	@ApiOperation({ summary: 'Create subscription', description: 'Create a Stripe subscription for recurring payments' })
	@ApiBody({ schema: { type: 'object', properties: { customer: { type: 'string', format: 'uuid' }, items: { type: 'array', items: { type: 'object', properties: { price: { type: 'string' } } } } }, required: ['customer', 'items'] } })
	@ApiResponse({ status: 201, description: 'Subscription created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('subscriptions')
	async createSubscription(
		@Req() req: TenantAuthenticatedRequest,
		@Res() res: Response,
		@Body() body: unknown
	) {
		try {
			const validatedBody = CreateSubscriptionRequestSchema.parse(body)
			const userId = req.user?.id
			const tenantId = req.tenant?.id

			if (!userId || !tenantId) {
				throw new UnauthorizedException('User and tenant required')
			}

			if (!validatedBody.customer || !validatedBody.items?.length) {
				throw new BadRequestException('Customer and items are required')
			}

			// Generate idempotency key
			const idempotencyKey = this.stripeSharedService.generateIdempotencyKey(
				'sub',
				userId,
				validatedBody.customer
			)

			const subscription = await this.stripeService.createSubscription(
				{
					customer: validatedBody.customer,
					items: validatedBody.items
				},
				idempotencyKey
			)

			// Log audit event - Stripe Sync Engine will sync subscription data via webhook
			await this.securityService.logAuditEvent({
				user_id: userId,
				action: 'create_subscription',
				entity_type: 'subscription',
				entity_id: subscription.id,
				details: {
					customer_id:
						typeof subscription.customer === 'string'
							? subscription.customer
							: subscription.customer.id
				}
			})

			res.status(HttpStatus.CREATED).json({
				success: true,
				data: subscription
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
	 * Update a Subscription
	 * Note: Changes are automatically synced to stripe schema by Stripe Sync Engine via webhook
	 */
	@ApiOperation({ summary: 'Update subscription', description: 'Update an existing Stripe subscription' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Subscription ID' })
	@ApiBody({ schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { price: { type: 'string' } } } }, proration_behavior: { type: 'string', enum: ['create_prorations', 'none', 'always_invoice'] } } } })
	@ApiResponse({ status: 200, description: 'Subscription updated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Subscription not found' })
	@Patch('subscriptions/:id')
	async updateSubscription(
		@Param('id', ParseUUIDPipe) subscriptionId: string,
		@Req() req: TenantAuthenticatedRequest,
		@Res() res: Response,
		@Body() body: unknown
	) {
		try {
			const validatedBody = UpdateSubscriptionRequestSchema.parse(body)
			const userId = req.user?.id
			const tenantId = req.tenant?.id

			if (!userId || !tenantId) {
				throw new UnauthorizedException('User and tenant required')
			}

			if (!subscriptionId) {
				throw new BadRequestException('Subscription ID is required')
			}

			// Verify subscription belongs to tenant
			const subscriptionRecord =
				await this.billingService.findSubscriptionByStripeId(subscriptionId)
			if (!subscriptionRecord || subscriptionRecord.customer !== tenantId) {
				throw new NotFoundException('Subscription not found')
			}

			// Generate idempotency key
			const idempotencyKey = this.stripeSharedService.generateIdempotencyKey(
				'sub_update',
				userId,
				subscriptionId
			)

			const updateParams: Stripe.SubscriptionUpdateParams = {}
			if (validatedBody.items) {
				updateParams.items = validatedBody.items
			}
			if (validatedBody.proration_behavior) {
				updateParams.proration_behavior = validatedBody.proration_behavior
			}

			const updatedSubscription = await this.stripeService.updateSubscription(
				subscriptionId,
				updateParams,
				idempotencyKey
			)

			// Log audit event - Stripe Sync Engine will sync changes via webhook
			await this.securityService.logAuditEvent({
				user_id: userId,
				action: 'update_subscription',
				entity_type: 'subscription',
				entity_id: updatedSubscription.id
			})

			res.status(HttpStatus.OK).json({
				success: true,
				data: updatedSubscription
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
	 * Get current subscription status for the authenticated user
	 * Verifies subscription status in real-time against Stripe
	 * CRITICAL: Never cache this endpoint - always verify against Stripe to prevent access after cancellation
	 * Returns null status if subscription not found (user gets denied access)
	 */
	@ApiOperation({ summary: 'Get subscription status', description: 'Get real-time subscription status for the authenticated user from Stripe' })
	@ApiResponse({ status: 200, description: 'Subscription status retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('subscription-status')
	@Throttle({ default: STRIPE_API_THROTTLE })
	async getSubscriptionStatus(@Req() req: TenantAuthenticatedRequest) {
		const userId = req.user.id

		// Extract user token for RLS-enforced database queries
		const userToken = this.supabase.getTokenFromRequest(req)
		if (!userToken) {
			throw new UnauthorizedException('Valid authentication token required')
		}

		// Query via BillingService with RLS enforcement
		// Throws on database errors (fail-closed), returns null if no subscription
		const subscription = await this.billingService.findSubscriptionByUserId(
			userId,
			userToken
		)

		// No subscription found - return null to deny access via frontend
		if (!subscription || !subscription.stripe_subscription_id) {
			return {
				subscriptionStatus: null,
				stripeCustomerId: subscription?.stripe_customer_id || null
			}
		}

		// Verify real-time status with Stripe
		// Throws on failure (fail-closed security - deny access on any error)
		const stripe = this.stripeService.getStripe()
		const stripeSubscription = await stripe.subscriptions.retrieve(
			subscription.stripe_subscription_id
		)

		return {
			subscriptionStatus: stripeSubscription.status,
			stripeCustomerId: subscription.stripe_customer_id
		}
	}
}
