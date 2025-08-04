import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import type { 
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse
} from '@tenantflow/shared'

@Injectable()
export class StripeCheckoutService implements OnModuleInit {
  private readonly logger = new Logger(StripeCheckoutService.name)
  private stripe?: Stripe
  private isAvailable = false

  constructor(
    private readonly configService: ConfigService,
    // private readonly errorHandler: ErrorHandlerService,
  ) {
    this.logger.log('StripeCheckoutService constructor called')
    // Initialize Stripe in onModuleInit to ensure configService is available
  }

  onModuleInit() {
    this.logger.log('StripeCheckoutService onModuleInit() called')
    this.logger.log(`ConfigService available: ${!!this.configService}`)
    
    try {
      const secretKey = this.configService?.get<string>('STRIPE_SECRET_KEY') || process.env.STRIPE_SECRET_KEY
      this.logger.log(`STRIPE_SECRET_KEY retrieved: ${secretKey ? '[REDACTED]' : 'undefined'}`)
      
      if (!secretKey) {
        this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe functionality will be disabled')
        this.isAvailable = false
        return
      }

      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-07-30.basil',
        typescript: true,
      })
      
      this.isAvailable = true
      this.logger.log('Stripe client initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize Stripe client:', error)
      this.isAvailable = false
    }
  }

  private ensureStripeAvailable(): Stripe {
    if (!this.isAvailable || !this.stripe) {
      throw new BadRequestException('Stripe service is not configured or available')
    }
    return this.stripe
  }

  async createCheckoutSession(
    userId: string | null,
    request: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    const stripe = this.ensureStripeAvailable()
    
    try {
      this.logger.log(`Creating checkout session for user ${userId || 'non-authenticated'}`)

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

      // Prepare session parameters with proper customer creation for SaaS
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: request.mode || 'subscription',
        line_items: lineItems,
        success_url: request.successUrl || `${this.configService?.get('FRONTEND_URL') || process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: request.cancelUrl || `${this.configService?.get('FRONTEND_URL') || process.env.FRONTEND_URL || 'https://tenantflow.app'}/pricing`,
        billing_address_collection: 'auto',
        automatic_tax: { enabled: true },
        allow_promotion_codes: request.allowPromotionCodes ?? true,
        client_reference_id: userId || undefined, // Only set if userId exists
        
        // CRITICAL: For SaaS subscriptions, always create customers
        // This allows new users to subscribe without having accounts first
        customer_creation: 'always',
        
        metadata: {
          userId: userId || null, // Only set if userId exists
          source: userId ? 'authenticated_user' : 'new_subscriber',
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
      const session = await stripe.checkout.sessions.create(sessionParams)

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

      throw error
    }
  }

  async createPortalSession(
    userId: string,
    request: CreatePortalSessionRequest
  ): Promise<CreatePortalSessionResponse> {
    const stripe = this.ensureStripeAvailable()
    
    try {
      this.logger.log(`Creating portal session for user ${userId}`)

      if (!request.customerId) {
        throw new BadRequestException('Customer ID is required')
      }

      // Verify customer exists
      try {
        await stripe.customers.retrieve(request.customerId)
      } catch (error: unknown) {
        if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
          throw new BadRequestException('Customer not found')
        }
        throw error
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: request.customerId,
        return_url: request.returnUrl || `${this.configService?.get('FRONTEND_URL') || process.env.FRONTEND_URL || 'https://tenantflow.app'}/dashboard`,
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

      throw error
    }
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const stripe = this.ensureStripeAvailable()
    
    try {
      return await stripe.checkout.sessions.retrieve(sessionId, {
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

      throw error
    }
  }

  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Customer> {
    const stripe = this.ensureStripeAvailable()
    
    try {
      this.logger.log(`Creating Stripe customer for email: ${email}`)

      const customer = await stripe.customers.create({
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

      throw error
    }
  }

  async updateCustomer(
    customerId: string,
    updates: Stripe.CustomerUpdateParams
  ): Promise<Stripe.Customer> {
    const stripe = this.ensureStripeAvailable()
    
    try {
      return await stripe.customers.update(customerId, updates)
    } catch (error: unknown) {
      this.logger.error(`Failed to update customer: ${(error as Error).message}`, (error as Error).stack)
      
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException({
          type: error.type,
          code: error.code,
          message: error.message,
        })
      }

      throw error
    }
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    const stripe = this.ensureStripeAvailable()
    
    try {
      const customer = await stripe.customers.retrieve(customerId)
      
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

      throw error
    }
  }

  async listPrices(active = true): Promise<Stripe.Price[]> {
    const stripe = this.ensureStripeAvailable()
    
    try {
      const prices = await stripe.prices.list({
        active,
        expand: ['data.product'],
      })

      return prices.data
    } catch (error: unknown) {
      this.logger.error(`Failed to list prices: ${(error as Error).message}`, (error as Error).stack)
      throw error
    }
  }
}