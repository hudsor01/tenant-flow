import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UsePipes,
  ValidationPipe
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
// import Stripe from 'stripe' // Using enhanced types from @repo/shared instead
import { StripeService } from '../billing/stripe.service'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { CreateCheckoutDto, CreateEmbeddedCheckoutDto, CreatePortalDto } from './dto/checkout.dto'
import { getPriceId } from '@repo/shared/stripe/config'
import type { 
  BillingPeriod, 
  PlanType,
  StripeCheckoutSession,
  StripeInvoice,
  StripeSubscription
} from '@repo/shared'

export interface AuthenticatedUser {
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
          ...dto.metadata,
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
  ) {
    this.logger.log('Received Stripe webhook')

    try {
      if (!req.rawBody) {
        throw new Error('No raw body found in request')
      }
      if (!signature) {
        throw new Error('No stripe signature found in headers')
      }
      
      const event = await this.stripeService.handleWebhook(req.rawBody, signature)
      
      this.logger.log(`Processing webhook event: ${event.type}`)

      // Handle different event types
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
        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`)
      }

      return { received: true }
    } catch (error: unknown) {
      this.logger.error(`Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw new Error(`Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`)
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
        status: subscription.status,
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
        status: subscription.status,
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
          // Record successful payment
          await this.stripeService.recordPayment({
            userId,
            subscriptionId: subscriptionId,
            amount: amountPaid,
            currency: currency,
            status: 'succeeded',
            paidAt: invoice.status_transitions.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
            invoiceUrl: invoice.hosted_invoice_url,
            invoicePdf: invoice.invoice_pdf
          })
          
          // Update subscription status to active if it was past_due
          if (subscription.status === 'past_due') {
            await this.stripeService.createOrUpdateSubscription({
              userId,
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id || '',
              planId: subscription.metadata?.planId || '',
              status: 'active',
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
          // Record failed payment
          await this.stripeService.recordPayment({
            userId,
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id || ''),
            amount: amountDue,
            currency,
            status: 'failed',
            paidAt: null,
            invoiceUrl: invoice.hosted_invoice_url,
            invoicePdf: invoice.invoice_pdf,
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
              status: subscription.status,
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

  @Post('embedded-checkout')
  @ApiOperation({
    summary: 'Create embedded Stripe checkout session',
    description: 'Creates an embedded checkout session for subscription purchase'
  })
  @ApiResponse({
    status: 200,
    description: 'Embedded checkout session created successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createEmbeddedCheckout(
    @Body() dto: CreateEmbeddedCheckoutDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.logger.log(`Creating embedded checkout for user ${user.id}, plan: ${dto.planId}`)

    try {
      const priceId = getPriceId(dto.planId as PlanType, dto.interval as BillingPeriod)
      
      if (!priceId) {
        throw new Error(`No price ID found for plan ${dto.planId} with interval ${dto.interval}`)
      }

      const session = await this.stripeService.client.checkout.sessions.create({
        mode: 'subscription',
        ui_mode: 'embedded',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        return_url: `${process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        customer: dto.customerId,
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: {
          ...dto.metadata,
          userId: user.id,
          planId: dto.planId,
          interval: dto.interval
        }
      })

      this.logger.log(`Embedded checkout session created: ${session.id}`)

      return {
        clientSecret: session.client_secret,
        sessionId: session.id
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to create embedded checkout session: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw new Error(`Failed to create embedded checkout session: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  @Post('checkout-session/:sessionId')
  @ApiOperation({
    summary: 'Get checkout session details',
    description: 'Retrieves checkout session information'
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout session retrieved successfully'
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  async getCheckoutSession(
    sessionId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.logger.log(`Getting checkout session ${sessionId} for user ${user.id}`)

    try {
      const session = await this.stripeService.client.checkout.sessions.retrieve(sessionId)
      
      // Verify session belongs to this user
      if (session.client_reference_id !== user.id) {
        throw new Error('Session does not belong to this user')
      }

      return {
        id: session.id,
        status: session.status,
        customer: session.customer,
        subscription: session.subscription,
        payment_status: session.payment_status
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to get checkout session: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '')
      throw new Error(`Failed to get checkout session: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}