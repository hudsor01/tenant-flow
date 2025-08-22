import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Put,
  RawBodyRequest,
  Req,
  UsePipes,
  ValidationPipe
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import type Stripe from 'stripe'
import { StripeService } from '../billing/stripe.service'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { CreateCheckoutDto, CreateEmbeddedCheckoutDto, CreatePortalDto } from './dto/checkout.dto'
import { getPriceId } from '@repo/shared/stripe/config'
import type { 
  BillingPeriod, 
  Database,
  PlanType,
  StripeCheckoutSession,
  StripeInvoice,
  StripeSubscription
} from '@repo/shared'

interface AuthenticatedUser {
  id: string
  email: string
}

// Use enhanced Stripe types from shared package
type ExtendedStripeCheckoutSession = StripeCheckoutSession
type ExtendedStripeSubscription = StripeSubscription
type ExtendedStripeInvoice = StripeInvoice

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name)

  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Create Stripe checkout session',
    description: 'Creates a secure checkout session for subscription purchase'
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
    schema: {
      properties: {
        url: { type: 'string', description: 'Stripe checkout URL' },
        sessionId: { type: 'string', description: 'Checkout session ID' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.logger.log(`Creating checkout for user ${user.id}, plan: ${dto.planId}`)

    try {
      // Get the price ID from our centralized config
      const priceId = getPriceId(dto.planId as PlanType, dto.interval as BillingPeriod)
      
      if (!priceId) {
        throw new Error(`No price ID found for plan ${dto.planId} with interval ${dto.interval}`)
      }

      // Default URLs if not provided
      const successUrl = dto.successUrl || `${process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = dto.cancelUrl || `${process.env.FRONTEND_URL || 'https://tenantflow.app'}/pricing`

      // Create checkout session
      const session = await this.stripeService.client.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: {
          userId: user.id,
          planId: dto.planId,
          interval: dto.interval
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            planId: dto.planId,
            interval: dto.interval
          }
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        tax_id_collection: {
          enabled: true
        }
      })

      this.logger.log(`Checkout session created: ${session.id}`)

      return {
        url: session.url,
        sessionId: session.id
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to create checkout session: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  @Post('embedded-checkout')
  @ApiOperation({
    summary: 'Create embedded Stripe checkout session',
    description: 'Creates an embedded checkout session that keeps users on our site (ui_mode: embedded)'
  })
  @ApiResponse({
    status: 200,
    description: 'Embedded checkout session created successfully',
    schema: {
      properties: {
        id: { type: 'string', description: 'Checkout session ID' },
        client_secret: { type: 'string', description: 'Client secret for mounting embedded checkout' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createEmbeddedCheckout(
    @Body() dto: CreateEmbeddedCheckoutDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.logger.log(`Creating embedded checkout for user ${user.id}, priceId: ${dto.priceId}`)

    try {
      // Get or create customer
      const customers = await this.stripeService.client.customers.list({
        email: user.email,
        limit: 1
      })

      let customerId: string
      if (customers.data.length > 0 && customers.data[0]) {
        customerId = customers.data[0].id
      } else if (dto.customerId) {
        customerId = dto.customerId
      } else {
        // Create customer if doesn't exist
        const customer = await this.stripeService.createCustomer(user.email)
        customerId = customer.id
      }

      // Default return URL
      const returnUrl = `${process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing/return?session_id={CHECKOUT_SESSION_ID}`

      // Build checkout session options
      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        ui_mode: 'embedded', // CRITICAL: keeps user on our site!
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: dto.priceId,
            quantity: dto.quantity || 1
          }
        ],
        return_url: returnUrl,
        customer: customerId,
        client_reference_id: user.id,
        metadata: {
          userId: user.id,
          priceId: dto.priceId,
          ...(dto.metadata || {})
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            priceId: dto.priceId,
            ...(dto.metadata || {})
          }
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        tax_id_collection: {
          enabled: true
        }
      }

      // Add trial period if specified
      if (dto.trialPeriodDays && dto.trialPeriodDays > 0) {
        if (sessionOptions.subscription_data) {
          sessionOptions.subscription_data.trial_period_days = dto.trialPeriodDays
        }
      }

      // Add coupon if specified
      if (dto.couponId) {
        sessionOptions.discounts = [{ coupon: dto.couponId }]
      }

      // Create embedded checkout session
      const session = await this.stripeService.client.checkout.sessions.create(sessionOptions)

      this.logger.log(`Embedded checkout session created: ${session.id}`)

      return {
        id: session.id,
        client_secret: session.client_secret
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to create embedded checkout session: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw new Error(`Failed to create embedded checkout session: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  @Post('free-trial')
  @ApiOperation({
    summary: 'Start free trial',
    description: 'Creates a free trial subscription for the user'
  })
  @ApiResponse({
    status: 200,
    description: 'Free trial started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        subscriptionId: { type: 'string' }
      }
    }
  })
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async startFreeTrial(
    @CurrentUser() user: AuthenticatedUser
  ): Promise<{ success: boolean; subscriptionId?: string }> {
    this.logger.log(`Starting free trial for user ${user.id}`)

    try {
      // Check if customer exists
      const customers = await this.stripeService.client.customers.list({
        email: user.email,
        limit: 1
      })

      let customerId: string
      if (customers.data.length > 0 && customers.data[0]) {
        customerId = customers.data[0].id
      } else {
        // Create customer if doesn't exist
        const customer = await this.stripeService.createCustomer(user.email)
        customerId = customer.id
      }

      // Create subscription with trial period
      const subscription = await this.stripeService.client.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: getPriceId('starter' as PlanType, 'monthly' as BillingPeriod)
          }
        ],
        trial_period_days: 14,
        metadata: {
          userId: user.id
        }
      })

      this.logger.log(`Free trial subscription created: ${subscription.id}`)

      return {
        success: true,
        subscriptionId: subscription.id
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to start free trial: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw new Error(`Failed to start free trial: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  @Post('portal')
  @ApiOperation({
    summary: 'Create customer portal session',
    description: 'Creates a secure customer portal session for subscription management'
  })
  @ApiResponse({
    status: 200,
    description: 'Portal session created successfully',
    schema: {
      properties: {
        url: { type: 'string', description: 'Customer portal URL' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createPortal(
    @Body() dto: CreatePortalDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.logger.log(`Creating portal session for user ${user.id}`)

    try {
      // First, get or create the customer
      const customers = await this.stripeService.client.customers.list({
        email: user.email,
        limit: 1
      })

      let customerId: string
      if (customers.data.length > 0 && customers.data[0]) {
        customerId = customers.data[0].id
      } else {
        // Create customer if doesn't exist
        const customer = await this.stripeService.createCustomer(user.email)
        customerId = customer.id
      }

      // Default return URL if not provided
      const returnUrl = dto.returnUrl || `${process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing`

      // Create portal session
      const session = await this.stripeService.client.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      })

      this.logger.log(`Portal session created for customer ${customerId}`)

      return {
        url: session.url
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to create portal session: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw new Error(`Failed to create portal session: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  @Get('subscription')
  @ApiOperation({
    summary: 'Get subscription status',
    description: 'Returns the current subscription status for the authenticated user'
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
        planId: { type: 'string' },
        currentPeriodEnd: { type: 'string', format: 'date-time' },
        cancelAtPeriodEnd: { type: 'boolean' }
      }
    }
  })
  @ApiBearerAuth()
  async getSubscription(
    @CurrentUser() user: AuthenticatedUser
  ): Promise<{
    id: string
    status: string
    planId: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  } | null> {
    this.logger.log(`Getting subscription for user ${user.id}`)

    try {
      // Validate user email
      if (!user.email) {
        this.logger.warn(`User ${user.id} has no email`)
        return null
      }

      // Get customer from Stripe
      const customers = await this.stripeService.client.customers.list({
        email: user.email,
        limit: 1
      })

      if (customers.data.length === 0 || !customers.data[0]) {
        this.logger.log(`No Stripe customer found for user ${user.id}`)
        return null
      }

      const customerId = customers.data[0].id

      // Get active or trialing subscriptions for customer
      const subscriptions = await this.stripeService.client.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 10
      })

      // Find the best subscription (prefer active over trialing, then by most recent)
      const validStatuses = ['active', 'trialing', 'past_due']
      const subscription = subscriptions.data
        .filter(sub => validStatuses.includes(sub.status))
        .sort((a, b) => {
          // Prefer active over other statuses
          if (a.status === 'active' && b.status !== 'active') {return -1}
          if (b.status === 'active' && a.status !== 'active') {return 1}
          // Then sort by created date (most recent first)
          return b.created - a.created
        })[0]

      if (!subscription) {
        this.logger.log(`No active subscription found for customer ${customerId}`)
        return null
      }
      
      // Return subscription data with proper type casting
      return {
        id: subscription.id,
        status: subscription.status.toUpperCase() as Database['public']['Enums']['SubStatus'],
        planId: subscription.metadata?.planId || 'starter',
        currentPeriodEnd: new Date((subscription as ExtendedStripeSubscription).current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to get subscription: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  @Get('checkout-session/:sessionId')
  @ApiOperation({
    summary: 'Get checkout session status',
    description: 'Retrieves the status of a checkout session for return page processing'
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout session details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
        customer_details: {
          type: 'object',
          properties: {
            email: { type: 'string' }
          }
        },
        subscription: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiBearerAuth()
  async getCheckoutSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.logger.log(`Getting checkout session ${sessionId} for user ${user.id}`)

    try {
      // Retrieve the checkout session
      const session = await this.stripeService.client.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
      })

      // Verify this session belongs to the current user
      if (session.client_reference_id !== user.id) {
        throw new Error('Unauthorized access to checkout session')
      }

      return {
        id: session.id,
        status: session.status,
        customer_details: session.customer_details,
        subscription: session.subscription ? {
          id: typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        } : null
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to get checkout session: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(`Failed to get checkout session: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  @Put('subscription')
  @ApiOperation({
    summary: 'Update subscription',
    description: 'Updates the subscription plan for the authenticated user'
  })
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { priceId: string; prorationBehavior?: string }
  ) {
    this.logger.log(`Updating subscription for user ${user.id}`)

    try {
      // Get customer from Stripe
      const customers = await this.stripeService.client.customers.list({
        email: user.email,
        limit: 1
      })

      if (customers.data.length === 0) {
        throw new Error('No customer found')
      }

      const customerId = customers.data[0]?.id
      
      if (!customerId) {
        return null
      }

      // Get active subscription
      const subscriptions = await this.stripeService.client.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      })

      if (subscriptions.data.length === 0) {
        throw new Error('No active subscription found')
      }

      const subscription = subscriptions.data[0]
      
      if (!subscription) {
        throw new Error('Subscription not found')
      }
      
      const subscriptionItemId = subscription.items?.data?.[0]?.id

      // Update subscription
      const updatedSubscription = await this.stripeService.client.subscriptions.update(
        subscription.id,
        {
          items: [
            {
              id: subscriptionItemId,
              price: dto.priceId
            }
          ],
          proration_behavior: (dto.prorationBehavior || 'create_prorations') as 'create_prorations' | 'none' | 'always_invoice'
        }
      )

      return {
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status
        }
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to update subscription: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(`Failed to update subscription: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  @Delete('subscription')
  @ApiOperation({
    summary: 'Cancel subscription',
    description: 'Cancels the subscription at the end of the current billing period'
  })
  @ApiBearerAuth()
  async cancelSubscription(
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.logger.log(`Cancelling subscription for user ${user.id}`)

    try {
      // Get customer from Stripe
      const customers = await this.stripeService.client.customers.list({
        email: user.email,
        limit: 1
      })

      if (customers.data.length === 0) {
        throw new Error('No customer found')
      }

      const customerId = customers.data[0]?.id
      
      if (!customerId) {
        return null
      }

      // Get active subscription
      const subscriptions = await this.stripeService.client.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      })

      if (subscriptions.data.length === 0) {
        throw new Error('No active subscription found')
      }

      const subscription = subscriptions.data[0]

      if (!subscription) {
        throw new Error('Subscription not found')
      }

      // Cancel at period end
      await this.stripeService.client.subscriptions.update(
        subscription.id,
        {
          cancel_at_period_end: true
        }
      )

      return {
        message: 'Subscription will be cancelled at the end of the billing period'
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to cancel subscription: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  @Post('webhook')
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description: 'Handles Stripe webhook events with signature verification'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string
  ): Promise<{ received: boolean; processed?: boolean; error?: string }> {
    this.logger.log('Received Stripe webhook')

    try {
      if (!req.rawBody) {
        this.logger.error('No raw body found in webhook request')
        return { received: false, error: 'No raw body found' }
      }
      if (!signature) {
        this.logger.error('No stripe signature found in webhook headers')
        return { received: false, error: 'No signature found' }
      }
      
      const event = await this.stripeService.handleWebhook(req.rawBody, signature)
      
      this.logger.log(`Processing webhook event: ${event.type}`)

      // Handle different event types with error isolation
      let processed = true
      try {
        switch (event.type) {
          case 'checkout.session.completed':
            await this.handleCheckoutCompleted(event.data.object as ExtendedStripeCheckoutSession)
            break
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted':
            await this.handleSubscriptionChange(event.data.object as ExtendedStripeSubscription)
            break
          case 'invoice.payment_succeeded':
            await this.handlePaymentSucceeded(event.data.object as ExtendedStripeInvoice)
            break
          case 'invoice.payment_failed':
            await this.handlePaymentFailed(event.data.object as ExtendedStripeInvoice)
            break
          case 'customer.subscription.trial_will_end':
            // Handle trial ending notification
            this.logger.log(`Trial ending for subscription: ${(event.data.object as ExtendedStripeSubscription).id}`)
            break
          case 'payment_intent.succeeded':
          case 'payment_intent.payment_failed':
            // Log payment intent events for monitoring
            this.logger.log(`Payment intent event: ${event.type}`)
            break
          default:
            this.logger.log(`Unhandled webhook event type: ${event.type}`)
            processed = false
        }
      } catch (handlerError: unknown) {
        // Don't fail the webhook, just log the error
        this.logger.error(
          `Error handling ${event.type}: ${handlerError instanceof Error ? handlerError.message : String(handlerError)}`,
          handlerError instanceof Error ? handlerError.stack : ''
        )
        processed = false
      }

      return { received: true, processed }
    } catch (error: unknown) {
      this.logger.error(`Webhook verification failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      // Return 400 for signature verification failures
      return { received: false, error: 'Invalid signature' }
    }
  }

  private async handleCheckoutCompleted(session: ExtendedStripeCheckoutSession) {
    this.logger.log(`Checkout completed for session: ${session.id}`)
    
    const userId = session.client_reference_id
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
    // const customerEmail = session.customer_details?.email // Available if needed
    
    if (!userId) {
      this.logger.error('No user ID found in checkout session')
      return
    }

    try {
      // Get the subscription details from Stripe
      const subscription = await this.stripeService.client.subscriptions.retrieve(subscriptionId as string) as unknown as ExtendedStripeSubscription
      const priceId = subscription.items.data[0]?.price.id
      
      // Extract metadata
      const planId = session.metadata?.planId || subscription.metadata?.planId
      const interval = session.metadata?.interval || subscription.metadata?.interval
      
      // Update user subscription in database via StripeService
      await this.stripeService.createOrUpdateSubscription({
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId || '',
        planId: planId || 'UNKNOWN',
        status: subscription.status.toUpperCase() as Database['public']['Enums']['SubStatus'],
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        billingInterval: interval as 'monthly' | 'annual'
      })
      
      this.logger.log(`User ${userId} subscription ${subscriptionId} successfully activated`)
    } catch (error: unknown) {
      this.logger.error(`Failed to process checkout completion: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw error
    }
  }

  private async handleSubscriptionChange(subscription: ExtendedStripeSubscription) {
    this.logger.log(`Subscription changed: ${subscription.id}`)
    
    const userId = subscription.metadata?.userId
    if (!userId) {
      this.logger.error('No user ID found in subscription metadata')
      return
    }

    try {
      const priceId = subscription.items.data[0]?.price.id
      const planId = subscription.metadata?.planId
      const interval = subscription.metadata?.interval
      
      // Update subscription in database
      await this.stripeService.createOrUpdateSubscription({
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId || '',
        planId: planId || 'UNKNOWN',
        status: subscription.status.toUpperCase() as Database['public']['Enums']['SubStatus'],
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        billingInterval: interval as 'monthly' | 'annual'
      })
      
      this.logger.log(`User ${userId} subscription ${subscription.id} updated with status: ${subscription.status}`)
    } catch (error: unknown) {
      this.logger.error(`Failed to process subscription change: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw error
    }
  }

  private async handlePaymentSucceeded(invoice: ExtendedStripeInvoice) {
    this.logger.log(`Payment succeeded for invoice: ${invoice.id}`)
    
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
    // const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    const amountPaid = invoice.amount_paid
    const currency = invoice.currency
    
    if (!subscriptionId || typeof amountPaid !== 'number' || typeof currency !== 'string') {
      this.logger.error('Invalid invoice data for payment processing')
      return
    }
    
    try {
      // Get subscription to find user
      if (subscriptionId) {
        const stripeSubscription = await this.stripeService.client.subscriptions.retrieve(subscriptionId)
        const subscription = stripeSubscription as unknown as ExtendedStripeSubscription
        const userId = subscription.metadata?.userId
        
        if (userId) {
          // Record successful payment (stub implementation for now)
          await this.stripeService.recordPayment({
            userId,
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id || ''),
            amount: amountPaid,
            currency: currency,
            status: 'succeeded',
            paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
            invoiceUrl: invoice.hosted_invoice_url || null,
            invoicePdf: invoice.invoice_pdf || null
          })
          
          // Update subscription status to active if it was past_due
          if (subscription.status === 'past_due') {
            await this.stripeService.createOrUpdateSubscription({
              userId,
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id || '',
              planId: subscription.metadata?.planId || '',
              status: 'ACTIVE' as Database['public']['Enums']['SubStatus'],
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
              trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              billingInterval: subscription.metadata?.interval as 'monthly' | 'annual'
            })
          }
          
          this.logger.log(`Payment recorded for user ${userId}, amount: ${amountPaid / 100} ${currency.toUpperCase()}`)
        }
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to process payment success: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw error
    }
  }

  private async handlePaymentFailed(invoice: ExtendedStripeInvoice) {
    this.logger.log(`Payment failed for invoice: ${invoice.id}`)
    
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
    // const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    const amountDue = invoice.amount_due
    const currency = invoice.currency
    const attemptCount = invoice.attempt_count
    const nextPaymentAttempt = invoice.next_payment_attempt
    
    if (!subscriptionId || typeof amountDue !== 'number' || typeof currency !== 'string') {
      this.logger.error('Invalid invoice data for failed payment processing')
      return
    }
    
    try {
      // Get subscription to find user
      if (subscriptionId) {
        const stripeSubscription = await this.stripeService.client.subscriptions.retrieve(subscriptionId)
        const subscription = stripeSubscription as unknown as ExtendedStripeSubscription
        const userId = subscription.metadata?.userId
        
        if (userId) {

          // Record failed payment (stub implementation for now)
          await this.stripeService.recordPayment({
            userId,
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id || ''),
            amount: amountDue,
            currency,
            status: 'failed',
            paidAt: null,
            invoiceUrl: invoice.hosted_invoice_url || null,
            invoicePdf: invoice.invoice_pdf || null,
            failureReason: invoice.billing_reason || 'payment_failed',
            attemptCount
          })
          
          // Update subscription status if it changed to past_due or unpaid
          if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
            await this.stripeService.createOrUpdateSubscription({
              userId,
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id || '',
              planId: subscription.metadata?.planId || '',
              status: subscription.status.toUpperCase() as Database['public']['Enums']['SubStatus'],
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
              trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              billingInterval: subscription.metadata?.interval as 'monthly' | 'annual'
            })
          }
          
          // Log payment failure details for monitoring
          this.logger.error(`Payment failed for user ${userId}: ${amountDue / 100} ${currency.toUpperCase()}, attempt ${attemptCount}`)
          
          // If this is the final attempt and subscription will be canceled
          if (!nextPaymentAttempt && subscription.status === 'unpaid') {
            this.logger.warn(`Subscription ${subscriptionId} for user ${userId} will be canceled due to payment failure`)
          }
        }
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to process payment failure: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw error
    }
  }
}