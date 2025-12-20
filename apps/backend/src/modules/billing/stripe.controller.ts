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
  ParseUUIDPipe
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { StripeService } from './stripe.service'
import { StripeSharedService } from './stripe-shared.service'
import { BillingService } from './billing.service'
import { SecurityService } from '../../security/security.service'
import { SupabaseService } from '../../database/supabase.service'
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
    @UserId() userId: string,
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
        throw new NotFoundException('No Stripe customer found. Please contact support.')
      }

      // Verify customer ownership (prevent lateral access)
      const stripe = this.stripeService.getStripe()
      const customer = await stripe.customers.retrieve(userData.stripe_customer_id)

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
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL
      if (!frontendUrl) {
        throw new Error('FRONTEND_URL or NEXT_PUBLIC_APP_URL environment variable not configured')
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
      if (error instanceof UnauthorizedException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error
      }

      // Handle Stripe errors
      if (error instanceof Error && 'type' in error) {
        this.stripeSharedService.handleStripeError(error as Stripe.errors.StripeError)
      }

      throw error
    }
  }
}
