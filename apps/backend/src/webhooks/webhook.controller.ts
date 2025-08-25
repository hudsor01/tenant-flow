import {
  Controller,
  Headers,
  Inject,
  Logger,
  Post,
  Req,
  Res
} from '@nestjs/common'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { RawBodyRequest } from '@nestjs/common'
import Stripe from 'stripe'
import { ConfigService } from '@nestjs/config'
import { Public } from '../shared/decorators/public.decorator'
import type { EnvironmentVariables } from '../config/config.schema'


@Controller('webhooks')
export class UnifiedWebhookController {
  private readonly logger = new Logger(UnifiedWebhookController.name)
  private stripe: Stripe | null = null
  private webhookSecret: string | null = null

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService<EnvironmentVariables>
  ) {}

  private initializeServices(): void {
    if (this.stripe && this.webhookSecret !== null) {
      return // Already initialized
    }

    // Initialize Stripe
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY', { infer: true })
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-07-30.basil',
      typescript: true
    })

    // Webhook secret
    this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', { infer: true }) ?? ''
    if (!this.webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured')
    }
  }

  @Post('stripe')
  @Public()
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Res() reply: FastifyReply
  ): Promise<void> {
    // Initialize services lazily on first request
    this.initializeServices()

    // Validate signature header - use Fastify native response
    if (!signature) {
      this.logger.warn('Missing stripe-signature header')
      return reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'Missing stripe-signature header' 
      })
    }

    // Verify webhook signature using NestJS rawBody support
    let event: Stripe.Event
    try {
      if (!this.stripe || !this.webhookSecret) {
        throw new Error('Stripe not initialized')
      }
      
      if (!request.rawBody) {
        throw new Error('No raw body found in request')
      }
      
      event = this.stripe.webhooks.constructEvent(
        request.rawBody, // NestJS built-in raw body support
        signature,
        this.webhookSecret
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Invalid webhook signature: ${msg}`)
      return reply.code(401).send({ 
        error: 'Unauthorized',
        message: `Invalid webhook signature: ${msg}` 
      })
    }

    this.logger.log(`Processing Stripe webhook: ${event.type}`)

    // Validate event structure
    if (!event.data?.object) {
      this.logger.warn('Invalid webhook event structure')
      return reply.code(400).send({ 
        error: 'Bad Request',
        message: 'Invalid webhook event structure' 
      })
    }

    try {
      // Process webhook events
      await this.processWebhookEvent(event)
      
      // Fastify native success response - proper status code for monitoring
      return reply.code(200).send({ received: true })
    } catch (error) {
      // Fastify native error response - 500 triggers Stripe retries
      const msg = error instanceof Error ? error.message : String(error)
      this.logger.error(`Webhook processing failed: ${msg}`)
      return reply.code(500).send({ error: 'Processing failed' })
    }
  }

  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    const obj = event.data.object as unknown

    switch (event.type) {
      case 'invoice.payment_failed':
        if (!this.isStripeInvoice(obj)) {
          throw new Error(`Invalid invoice payload for ${event.type}`)
        }
        await this.handlePaymentFailed(obj)
        break
      case 'invoice.payment_succeeded':
        if (!this.isStripeInvoice(obj)) {
          throw new Error(`Invalid invoice payload for ${event.type}`)
        }
        await this.handlePaymentSucceeded(obj)
        break
      case 'customer.subscription.deleted':
        if (!this.isStripeSubscription(obj)) {
          throw new Error(`Invalid subscription payload for ${event.type}`)
        }
        await this.handleSubscriptionCanceled(obj)
        break
      case 'customer.subscription.trial_will_end':
        if (!this.isStripeSubscription(obj)) {
          throw new Error(`Invalid subscription payload for ${event.type}`)
        }
        await this.handleTrialEnding(obj)
        break
      default:
        this.logger.log(`Unhandled webhook type: ${event.type}`)
    }
  }

  // Lightweight runtime type-guards to avoid unsafe casts
  private isStripeInvoice(obj: unknown): obj is Stripe.Invoice {
    if (!obj || typeof obj !== 'object') return false
    const anyObj = obj as any
    // basic checks: has currency and either amount_due or amount_paid
    return typeof anyObj.currency === 'string' &&
      (typeof anyObj.amount_due === 'number' || typeof anyObj.amount_paid === 'number')
  }

  private isStripeSubscription(obj: unknown): obj is Stripe.Subscription {
    if (!obj || typeof obj !== 'object') return false
    const anyObj = obj as any
    // basic checks: has id and customer (string or object with id)
    const hasCustomerId = typeof anyObj.customer === 'string' ||
      (typeof anyObj.customer === 'object' && typeof anyObj.customer?.id === 'string')
    return typeof anyObj.id === 'string' && hasCustomerId
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Get customer ID safely
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as Stripe.Customer)?.id
    
    if (!customerId) {
      throw new Error('Invoice missing customer ID')
    }

    // Retrieve customer with proper type handling
    if (!this.stripe) {
      throw new Error('Stripe not initialized')
    }
    const customer = await this.stripe.customers.retrieve(customerId)
    if ('deleted' in customer && customer.deleted) {
      throw new Error(`Customer deleted: ${customerId}`)
    }

    // Type guard ensures we have a real Customer object
    const email = (customer as Stripe.Customer).email
    if (!email) {
      throw new Error(`No email for customer: ${customerId}`)
    }

    this.logger.log(`Payment failed for customer ${email} - amount: ${invoice.currency.toUpperCase()} ${(invoice.amount_due / 100).toFixed(2)}`)
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as Stripe.Customer)?.id
      
    if (!customerId) {
      throw new Error('Invoice missing customer ID')
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized')
    }
    const customer = await this.stripe.customers.retrieve(customerId)
    if ('deleted' in customer && customer.deleted) {
      throw new Error(`Customer deleted: ${customerId}`)
    }

    const email = (customer as Stripe.Customer).email
    if (!email) {
      throw new Error(`No email for customer: ${customerId}`)
    }

    // TODO: Send payment success email when email service is implemented
    this.logger.log(`Payment succeeded for customer ${email} - amount: ${invoice.currency.toUpperCase()} ${(invoice.amount_paid / 100).toFixed(2)}`)
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id
      
    if (!customerId) {
      throw new Error('Subscription missing customer ID')
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized')
    }
    const customer = await this.stripe.customers.retrieve(customerId)
    if ('deleted' in customer && customer.deleted) {
      throw new Error(`Customer deleted: ${customerId}`)
    }

    const email = (customer as Stripe.Customer).email
    if (!email) {
      throw new Error(`No email for customer: ${customerId}`)
    }

    // TODO: Send subscription cancellation email when email service is implemented
    this.logger.log(`Subscription canceled for customer ${email} - subscription: ${subscription.id}`)
  }

  private async handleTrialEnding(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id
      
    if (!customerId) {
      throw new Error('Subscription missing customer ID')
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized')
    }
    const customer = await this.stripe.customers.retrieve(customerId)
    if ('deleted' in customer && customer.deleted) {
      throw new Error(`Customer deleted: ${customerId}`)
    }

    const email = (customer as Stripe.Customer).email
    if (!email) {
      throw new Error(`No email for customer: ${customerId}`)
    }

    // TODO: Send trial ending email when email service is implemented
    this.logger.log(`Trial ending for customer ${email} - subscription: ${subscription.id}`)
  }
}