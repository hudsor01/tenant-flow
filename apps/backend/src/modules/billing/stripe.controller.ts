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
  UseGuards,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ParseUUIDPipe
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { StripeService } from './stripe.service'
import { StripeSharedService } from './stripe-shared.service'
import { BillingService } from './billing.service'
import { SecurityService } from '../../security/security.service'
import { SupabaseService } from '../../database/supabase.service'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { user_id as UserId } from '../../shared/decorators/user.decorator'
import { createThrottleDefaults } from '../../config/throttle.config'
import { z } from 'zod'
import type Stripe from 'stripe'
import type { AuthenticatedRequest } from '@repo/shared/src/types/backend-domain.js'
import type { Database } from '@repo/shared/src/types/supabase.js'
import { uuidSchema } from '@repo/shared/validation/common'

// Extended request interface for tenant context
interface TenantAuthenticatedRequest extends AuthenticatedRequest {
  tenant?: Database['public']['Tables']['tenants']['Row']
}

/**
 * Rate limiting for Stripe API endpoints
 * Subscription status checks are cached client-side (5min), so limit server calls
 */
const STRIPE_API_THROTTLE = createThrottleDefaults({
  envTtlKey: 'STRIPE_API_THROTTLE_TTL',
  envLimitKey: 'STRIPE_API_THROTTLE_LIMIT',
  defaultTtl: 60000, // 60 seconds
  defaultLimit: 20 // 20 requests per minute (generous for cached frontend queries)
})

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

const CreateSubscriptionRequestSchema = z.object({
  customer: uuidSchema,
  items: z.array(z.object({ price: z.string() }))
})

const UpdateSubscriptionRequestSchema = z.object({
  items: z.array(z.object({ price: z.string() })).optional(),
  proration_behavior: z.enum(['create_prorations', 'none', 'always_invoice']).optional()
})

/**
 * Production-ready Stripe integration controller
 * Handles Stripe API interactions with proper validation and error handling
 */
@Controller('stripe')
export class StripeController {
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
  /**
   * Create a Payment Intent for one-time payments
   */
  @Post('payment-intents')
  @UseGuards(JwtAuthGuard)
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
        this.stripeSharedService.handleStripeError(error as Stripe.errors.StripeError)
      }
      throw error
    }
  }

  /**
   * Create a Customer for recurring payments
   */
  /**
   * Create a Customer for recurring payments
   */
  @Post('customers')
  @UseGuards(JwtAuthGuard)
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
        this.stripeSharedService.handleStripeError(error as Stripe.errors.StripeError)
      }
      throw error
    }
  }

  /**
   * Create a Subscription for recurring payments
   */
  /**
   * Create a Subscription for recurring payments
   * Note: Subscription data is automatically synced to stripe schema by Stripe Sync Engine
   */
  /**
   * Create a Subscription for recurring payments
   * Note: Subscription data is automatically synced to stripe schema by Stripe Sync Engine
   */
  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
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
          customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
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
        this.stripeSharedService.handleStripeError(error as Stripe.errors.StripeError)
      }
      throw error
    }
  }

  /**
   * Update a Subscription
   */
  /**
   * Update a Subscription
   * Note: Changes are automatically synced to stripe schema by Stripe Sync Engine via webhook
   */
  /**
   * Update a Subscription
   * Note: Changes are automatically synced to stripe schema by Stripe Sync Engine via webhook
   */
  @Patch('subscriptions/:id')
  @UseGuards(JwtAuthGuard)
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
      const subscriptionRecord = await this.billingService.findSubscriptionByStripeId(subscriptionId)
      if (!subscriptionRecord || subscriptionRecord.customer_id !== tenantId) {
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
        this.stripeSharedService.handleStripeError(error as Stripe.errors.StripeError)
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
  /**
   * Get current subscription status for the authenticated user
   * Verifies subscription status in real-time against Stripe
   * 
   * SECURITY: FAIL-CLOSED BEHAVIOR
   * - Database error → throws exception → access denied
   * - Stripe API error → throws exception → access denied
   * - No subscription found → returns null status → frontend denies access
   * - Invalid/expired token → auth guard rejects → access denied
   * 
   * This ensures users cannot access paid features if:
   * - Their subscription was cancelled (real-time Stripe check)
   * - Infrastructure is degraded (fails safely)
   * - Database queries fail (fails safely)
   */
  @Get('subscription-status')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: STRIPE_API_THROTTLE })
  async getSubscriptionStatus(
    @UserId() userId: string,
    @Req() req: TenantAuthenticatedRequest
  ) {
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
