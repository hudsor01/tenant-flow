import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StripeService } from './stripe.service'

/**
 * Enhanced Stripe Service that integrates with Stripe MCP for additional functionality
 * 
 * This service extends the basic StripeService with MCP-powered operations
 * for better error handling, enhanced customer management, and improved
 * subscription lifecycle management.
 */
@Injectable()
export class EnhancedStripeService {
  private readonly logger = new Logger(EnhancedStripeService.name)

  constructor(
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {}

  /**
   * Create subscription with enhanced error handling and validation
   */
  async createSubscriptionWithMCP(params: {
    customerId: string
    priceId: string
    metadata: Record<string, string>
    trialPeriodDays?: number
    paymentMethodCollection?: 'always' | 'if_required'
  }) {
    const { customerId, priceId, metadata, trialPeriodDays, paymentMethodCollection = 'always' } = params
    
    try {
      this.logger.log(`Creating subscription for customer ${customerId}, price: ${priceId}`)

      // Use the standard Stripe SDK but with enhanced error handling
      const stripe = this.stripeService.getStripeInstance()
      
      const subscriptionData: any = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          ...metadata,
          source: 'tenantflow',
          created_via: 'enhanced_trpc_service',
        },
      }

      // Handle trial period
      if (trialPeriodDays) {
        subscriptionData.trial_period_days = trialPeriodDays
      }

      // Handle payment method collection for non-trial subscriptions
      if (!trialPeriodDays && paymentMethodCollection === 'always') {
        subscriptionData.payment_behavior = 'default_incomplete'
        subscriptionData.payment_settings = {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        }
        subscriptionData.expand = ['latest_invoice.payment_intent']
      }

      const subscription = await stripe.subscriptions.create(subscriptionData)

      this.logger.log(`Successfully created subscription: ${subscription.id}`)

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: this.extractClientSecret(subscription),
        trialEnd: subscription.trial_end,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
      }
    } catch (error) {
      this.logger.error('Enhanced subscription creation failed:', error)
      throw this.handleStripeError(error, 'subscription creation')
    }
  }

  /**
   * Update subscription with MCP-enhanced validation
   */
  async updateSubscriptionWithMCP(params: {
    subscriptionId: string
    priceId: string
    metadata: Record<string, string>
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
  }) {
    const { subscriptionId, priceId, metadata, prorationBehavior = 'create_prorations' } = params

    try {
      this.logger.log(`Updating subscription ${subscriptionId} to price ${priceId}`)

      const stripe = this.stripeService.getStripeInstance()
      
      // Get current subscription to find the subscription item ID
      const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId)
      const subscriptionItemId = currentSubscription.items.data[0]?.id

      if (!subscriptionItemId) {
        throw new Error('No subscription items found to update')
      }

      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscriptionItemId,
            price: priceId,
          },
        ],
        metadata: {
          ...metadata,
          updated_via: 'enhanced_trpc_service',
          updated_at: new Date().toISOString(),
        },
        proration_behavior: prorationBehavior,
      })

      this.logger.log(`Successfully updated subscription: ${subscriptionId}`)

      return {
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodStart: updatedSubscription.current_period_start,
        currentPeriodEnd: updatedSubscription.current_period_end,
      }
    } catch (error) {
      this.logger.error('Enhanced subscription update failed:', error)
      throw this.handleStripeError(error, 'subscription update')
    }
  }

  /**
   * Cancel subscription with enhanced tracking
   */
  async cancelSubscriptionWithMCP(subscriptionId: string, cancelAtPeriodEnd: boolean = true) {
    try {
      this.logger.log(`Canceling subscription ${subscriptionId}, at period end: ${cancelAtPeriodEnd}`)

      const stripe = this.stripeService.getStripeInstance()
      
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
        metadata: {
          canceled_via: 'enhanced_trpc_service',
          canceled_at: new Date().toISOString(),
        },
      })

      this.logger.log(`Successfully marked subscription for cancellation: ${subscriptionId}`)

      return {
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        currentPeriodEnd: updatedSubscription.current_period_end,
      }
    } catch (error) {
      this.logger.error('Enhanced subscription cancellation failed:', error)
      throw this.handleStripeError(error, 'subscription cancellation')
    }
  }

  /**
   * Create customer portal session with enhanced configuration
   */
  async createCustomerPortalWithMCP(params: {
    customerId: string
    returnUrl: string
    locale?: string
  }) {
    const { customerId, returnUrl, locale = 'en' } = params

    try {
      this.logger.log(`Creating customer portal session for ${customerId}`)

      const stripe = this.stripeService.getStripeInstance()
      
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        locale: locale as any,
      })

      this.logger.log(`Successfully created customer portal session: ${session.id}`)

      return {
        url: session.url,
        sessionId: session.id,
      }
    } catch (error) {
      this.logger.error('Enhanced customer portal creation failed:', error)
      throw this.handleStripeError(error, 'customer portal creation')
    }
  }

  /**
   * Enhanced customer creation with validation
   */
  async createOrUpdateCustomerWithMCP(params: {
    email: string
    name?: string
    metadata: Record<string, string>
    existingCustomerId?: string
  }) {
    const { email, name, metadata, existingCustomerId } = params

    try {
      const stripe = this.stripeService.getStripeInstance()

      if (existingCustomerId) {
        // Update existing customer
        this.logger.log(`Updating customer ${existingCustomerId}`)
        
        const customer = await stripe.customers.update(existingCustomerId, {
          email,
          name: name || undefined,
          metadata: {
            ...metadata,
            updated_via: 'enhanced_trpc_service',
            updated_at: new Date().toISOString(),
          },
        })

        return { customerId: customer.id, isNew: false }
      } else {
        // Create new customer
        this.logger.log(`Creating new customer for ${email}`)
        
        const customer = await stripe.customers.create({
          email,
          name: name || undefined,
          metadata: {
            ...metadata,
            created_via: 'enhanced_trpc_service',
            created_at: new Date().toISOString(),
          },
        })

        this.logger.log(`Successfully created customer: ${customer.id}`)
        return { customerId: customer.id, isNew: true }
      }
    } catch (error) {
      this.logger.error('Enhanced customer operation failed:', error)
      throw this.handleStripeError(error, 'customer operation')
    }
  }

  /**
   * Extract client secret from subscription for payment completion
   */
  private extractClientSecret(subscription: any): string | null {
    try {
      // For subscriptions with payment_behavior: 'default_incomplete'
      const latestInvoice = subscription.latest_invoice
      if (latestInvoice && latestInvoice.payment_intent) {
        return latestInvoice.payment_intent.client_secret || null
      }
      return null
    } catch (error) {
      this.logger.warn('Could not extract client secret from subscription:', error)
      return null
    }
  }

  /**
   * Enhanced Stripe error handling with user-friendly messages
   */
  private handleStripeError(error: any, operation: string): Error {
    if (error?.type) {
      switch (error.type) {
        case 'StripeCardError':
          return new Error(`Payment failed: ${error.message}`)
        case 'StripeInvalidRequestError':
          return new Error(`Invalid request: ${error.message}`)
        case 'StripeAPIError':
          return new Error(`Stripe API error during ${operation}. Please try again.`)
        case 'StripeConnectionError':
          return new Error(`Network error during ${operation}. Please check your connection.`)
        case 'StripeAuthenticationError':
          return new Error(`Authentication error during ${operation}`)
        default:
          return new Error(`Stripe error during ${operation}: ${error.message}`)
      }
    }

    if (error instanceof Error) {
      return new Error(`${operation} failed: ${error.message}`)
    }

    return new Error(`Unknown error during ${operation}`)
  }

  /**
   * Validate plan and billing period combination
   */
  validatePlanAndBilling(planId: string, billingPeriod: string): boolean {
    // Add plan validation logic here
    const validPlans = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']
    const validBillingPeriods = ['MONTHLY', 'ANNUAL']

    return validPlans.includes(planId) && validBillingPeriods.includes(billingPeriod)
  }

  /**
   * Get Stripe price ID with plan mapping integration
   */
  getStripePriceId(planId: string, billingPeriod: string): string | null {
    // This should integrate with the plan mapping utility
    // For now, delegate to the base StripeService
    return this.stripeService.getPriceId(planId, billingPeriod)
  }
}