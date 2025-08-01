import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import type { 
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse
} from '@tenantflow/shared/types/stripe-pricing'
import { ErrorHandlerService } from '../common/errors/error-handler.service'

@Injectable()
export class StripeCheckoutService implements OnModuleInit {
  private readonly logger = new Logger(StripeCheckoutService.name)
  private stripe!: Stripe

  constructor(
    private readonly configService: ConfigService,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    // Initialize Stripe in onModuleInit to ensure configService is available
  }

  onModuleInit() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-06-30.basil',
      typescript: true,
    })
  }

  async createCheckoutSession(
    userId: string,
    request: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    try {
      this.logger.log(`Creating checkout session for user ${userId}`)

      // Validate required fields
      if (!request.billingInterval) {
        throw new BadRequestException('Billing interval is required')
      }

      if (!request.lookupKey && !request.priceId) {
        throw new BadRequestException('Either lookupKey or priceId is required')
      }

      // Prepare line items
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

      if (request.lookupKey) {
        lineItems.push({
          price: request.lookupKey,
          quantity: 1,
        })
      } else if (request.priceId) {
        lineItems.push({
          price: request.priceId,
          quantity: 1,
        })
      }

      // Prepare session parameters
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: request.mode || 'subscription',
        line_items: lineItems,
        success_url: request.successUrl || `${this.configService.get('FRONTEND_URL')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: request.cancelUrl || `${this.configService.get('FRONTEND_URL')}/pricing`,
        billing_address_collection: 'auto',
        automatic_tax: { enabled: true },
        allow_promotion_codes: request.allowPromotionCodes ?? true,
        client_reference_id: userId,
        metadata: {
          userId,
          ...request.metadata,
        },
      }

      // Add customer information if provided
      if (request.customerId) {
        sessionParams.customer = request.customerId
      } else if (request.customerEmail) {
        sessionParams.customer_email = request.customerEmail
      }

      // Create the checkout session
      const session = await this.stripe.checkout.sessions.create(sessionParams)

      if (!session.url) {
        throw new Error('Failed to create checkout session URL')
      }

      this.logger.log(`Checkout session created: ${session.id}`)

      return {
        url: session.url,
        sessionId: session.id,
      }

    } catch (error: unknown) {
      this.logger.error(`Failed to create checkout session: ${(error as Error).message}`, (error as Error).stack)
      
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException({
          type: error.type,
          code: error.code,
          message: error.message,
        })
      }

      throw this.errorHandler.handleErrorEnhanced(error as Error, { operation: 'createCheckoutSession', metadata: { userId } })
    }
  }

  async createPortalSession(
    userId: string,
    request: CreatePortalSessionRequest
  ): Promise<CreatePortalSessionResponse> {
    try {
      this.logger.log(`Creating portal session for user ${userId}`)

      if (!request.customerId) {
        throw new BadRequestException('Customer ID is required')
      }

      // Verify customer exists
      try {
        await this.stripe.customers.retrieve(request.customerId)
      } catch (error: unknown) {
        if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
          throw new BadRequestException('Customer not found')
        }
        throw error
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: request.customerId,
        return_url: request.returnUrl || `${this.configService.get('FRONTEND_URL')}/dashboard`,
      })

      this.logger.log(`Portal session created: ${session.id}`)

      return {
        url: session.url,
      }

    } catch (error: unknown) {
      this.logger.error(`Failed to create portal session: ${(error as Error).message}`, (error as Error).stack)
      
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException({
          type: error.type,
          code: error.code,
          message: error.message,
        })
      }

      throw this.errorHandler.handleErrorEnhanced(error as Error, { operation: 'createPortalSession', metadata: { userId } })
    }
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'customer', 'subscription'],
      })
    } catch (error: unknown) {
      this.logger.error(`Failed to retrieve session: ${(error as Error).message}`, (error as Error).stack)
      
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException({
          type: error.type,
          code: error.code,
          message: error.message,
        })
      }

      throw this.errorHandler.handleErrorEnhanced(error as Error, { operation: 'retrieveSession', metadata: { sessionId } })
    }
  }

  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Customer> {
    try {
      this.logger.log(`Creating Stripe customer for email: ${email}`)

      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      })

      this.logger.log(`Stripe customer created: ${customer.id}`)
      return customer

    } catch (error: unknown) {
      this.logger.error(`Failed to create customer: ${(error as Error).message}`, (error as Error).stack)
      
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException({
          type: error.type,
          code: error.code,
          message: error.message,
        })
      }

      throw this.errorHandler.handleErrorEnhanced(error as Error, { operation: 'createCustomer', metadata: { email } })
    }
  }

  async updateCustomer(
    customerId: string,
    updates: Stripe.CustomerUpdateParams
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, updates)
    } catch (error: unknown) {
      this.logger.error(`Failed to update customer: ${(error as Error).message}`, (error as Error).stack)
      
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException({
          type: error.type,
          code: error.code,
          message: error.message,
        })
      }

      throw this.errorHandler.handleErrorEnhanced(error as Error, { operation: 'updateCustomer', metadata: { customerId } })
    }
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId)
      
      if (customer.deleted) {
        throw new BadRequestException('Customer has been deleted')
      }

      return customer as Stripe.Customer
    } catch (error: unknown) {
      this.logger.error(`Failed to retrieve customer: ${(error as Error).message}`, (error as Error).stack)
      
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException({
          type: error.type,
          code: error.code,
          message: error.message,
        })
      }

      throw this.errorHandler.handleErrorEnhanced(error as Error, { operation: 'retrieveCustomer', metadata: { customerId } })
    }
  }

  async listPrices(active = true): Promise<Stripe.Price[]> {
    try {
      const prices = await this.stripe.prices.list({
        active,
        expand: ['data.product'],
      })

      return prices.data
    } catch (error: unknown) {
      this.logger.error(`Failed to list prices: ${(error as Error).message}`, (error as Error).stack)
      throw this.errorHandler.handleErrorEnhanced(error as Error, { operation: 'listPrices' })
    }
  }
}