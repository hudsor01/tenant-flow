/**
 * MCP Stripe Server Helper Utilities
 *
 * Utilities for integrating with the MCP Stripe server for realistic
 * payment testing with actual Stripe API calls in test mode.
 */

import type Stripe from 'stripe'
import { TEST_CARD_NUMBERS, TEST_PLAN_CONFIGS } from '../test-data/stripe-factories'

// ========================
// MCP Stripe Configuration
// ========================

export interface MCPStripeConfig {
  /** Stripe test secret key for MCP server */
  secretKey: string
  /** Stripe test publishable key */
  publishableKey: string
  /** Webhook endpoint secret for testing */
  webhookSecret?: string
  /** API version to use */
  apiVersion?: string
  /** Base URL for webhook endpoints */
  webhookBaseUrl?: string
}

/**
 * Get MCP Stripe configuration from environment variables
 */
export function getMCPStripeConfig(): MCPStripeConfig {
  const config: MCPStripeConfig = {
    secretKey: process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_mock_key',
    publishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY || 'pk_test_mock_key',
    webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET,
    apiVersion: process.env.STRIPE_API_VERSION || '2024-06-20',
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'
  }

  // Validate test keys
  if (!config.secretKey.startsWith('sk_test_')) {
    throw new Error('MCP Stripe testing requires a test secret key (sk_test_...)')
  }

  if (!config.publishableKey.startsWith('pk_test_')) {
    throw new Error('MCP Stripe testing requires a test publishable key (pk_test_...)')
  }

  return config
}

// ========================
// MCP Stripe Test Helper Class
// ========================

export class MCPStripeTestHelper {
  private stripe: Stripe
  private config: MCPStripeConfig
  private createdResources: {
    customers: string[]
    subscriptions: string[]
    paymentIntents: string[]
    paymentMethods: string[]
    prices: string[]
    products: string[]
    checkoutSessions: string[]
  } = {
    customers: [],
    subscriptions: [],
    paymentIntents: [],
    paymentMethods: [],
    prices: [],
    products: [],
    checkoutSessions: []
  }

  constructor(customConfig?: Partial<MCPStripeConfig>) {
    this.config = { ...getMCPStripeConfig(), ...customConfig }

    // Initialize Stripe with MCP config
    this.stripe = new (require('stripe'))(this.config.secretKey, {
      apiVersion: this.config.apiVersion as any,
      typescript: true
    })
  }

  /**
   * Get the configured Stripe client
   */
  getStripeClient(): Stripe {
    return this.stripe
  }

  // ========================
  // Customer Operations
  // ========================

  /**
   * Create a test customer with realistic data
   */
  async createTestCustomer(params: {
    email?: string
    name?: string
    metadata?: Record<string, string>
  } = {}): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.create({
      email: params.email || `test-${Date.now()}@example.com`,
      name: params.name || `Test Customer ${Date.now()}`,
      metadata: {
        testEnvironment: 'true',
        createdBy: 'mcp-test-helper',
        ...params.metadata
      }
    })

    this.createdResources.customers.push(customer.id)
    return customer
  }

  /**
   * Create a test customer with payment method attached
   */
  async createTestCustomerWithPaymentMethod(params: {
    email?: string
    name?: string
    cardNumber?: string
    metadata?: Record<string, string>
  } = {}): Promise<{
    customer: Stripe.Customer
    paymentMethod: Stripe.PaymentMethod
  }> {
    const customer = await this.createTestCustomer({
      email: params.email,
      name: params.name,
      metadata: params.metadata
    })

    const paymentMethod = await this.createTestPaymentMethod({
      customerId: customer.id,
      cardNumber: params.cardNumber || TEST_CARD_NUMBERS.VISA_SUCCESS
    })

    return { customer, paymentMethod }
  }

  // ========================
  // Payment Method Operations
  // ========================

  /**
   * Create a test payment method
   */
  async createTestPaymentMethod(params: {
    customerId?: string
    cardNumber?: string
    expMonth?: number
    expYear?: number
    cvc?: string
  } = {}): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: params.cardNumber || TEST_CARD_NUMBERS.VISA_SUCCESS,
        exp_month: params.expMonth || 12,
        exp_year: params.expYear || new Date().getFullYear() + 2,
        cvc: params.cvc || '123'
      }
    })

    if (params.customerId) {
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: params.customerId
      })
    }

    this.createdResources.paymentMethods.push(paymentMethod.id)
    return paymentMethod
  }

  /**
   * Create a payment method that will be declined
   */
  async createDeclinedPaymentMethod(declineType: keyof typeof TEST_CARD_NUMBERS = 'GENERIC_DECLINE'): Promise<Stripe.PaymentMethod> {
    return this.createTestPaymentMethod({
      cardNumber: TEST_CARD_NUMBERS[declineType]
    })
  }

  // ========================
  // Product and Price Operations
  // ========================

  /**
   * Create test products and prices for all plan types
   */
  async createTestPlanPrices(): Promise<{
    products: Record<string, Stripe.Product>
    prices: Record<string, { monthly: Stripe.Price; annual: Stripe.Price }>
  }> {
    const products: Record<string, Stripe.Product> = {}
    const prices: Record<string, { monthly: Stripe.Price; annual: Stripe.Price }> = {}

    for (const [planType, config] of Object.entries(TEST_PLAN_CONFIGS)) {
      if (planType === 'FREETRIAL') continue // Skip freetrial plan

      // Create product
      const product = await this.stripe.products.create({
        name: `${planType} Plan`,
        description: `TenantFlow ${planType} subscription plan`,
        metadata: {
          planType,
          testEnvironment: 'true'
        }
      })

      this.createdResources.products.push(product.id)
      products[planType] = product

      // Create monthly price
      const monthlyPrice = await this.stripe.prices.create({
        product: product.id,
        unit_amount: this.getPlanAmount(planType, 'monthly'),
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          planType,
          interval: 'monthly',
          testEnvironment: 'true'
        }
      })

      // Create annual price
      const annualPrice = await this.stripe.prices.create({
        product: product.id,
        unit_amount: this.getPlanAmount(planType, 'annual'),
        currency: 'usd',
        recurring: {
          interval: 'year'
        },
        metadata: {
          planType,
          interval: 'annual',
          testEnvironment: 'true'
        }
      })

      this.createdResources.prices.push(monthlyPrice.id, annualPrice.id)
      prices[planType] = { monthly: monthlyPrice, annual: annualPrice }
    }

    return { products, prices }
  }

  private getPlanAmount(planType: string, interval: 'monthly' | 'annual'): number {
    const amounts = {
      STARTER: { monthly: 1900, annual: 19000 }, // $19/$190
      GROWTH: { monthly: 4900, annual: 49000 },  // $49/$490
      TENANTFLOW_MAX: { monthly: 14900, annual: 149000 } // $149/$1490
    }

    return amounts[planType as keyof typeof amounts]?.[interval] || 1900
  }

  // ========================
  // Subscription Operations
  // ========================

  /**
   * Create a test subscription
   */
  async createTestSubscription(params: {
    customerId: string
    priceId: string
    trialPeriodDays?: number
    paymentMethodId?: string
    metadata?: Record<string, string>
  }): Promise<Stripe.Subscription> {
    const subscriptionData: Stripe.SubscriptionCreateParams = {
      customer: params.customerId,
      items: [{ price: params.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        testEnvironment: 'true',
        createdBy: 'mcp-test-helper',
        ...params.metadata
      }
    }

    if (params.trialPeriodDays) {
      subscriptionData.trial_period_days = params.trialPeriodDays
    }

    if (params.paymentMethodId) {
      subscriptionData.default_payment_method = params.paymentMethodId
    }

    const subscription = await this.stripe.subscriptions.create(subscriptionData)
    this.createdResources.subscriptions.push(subscription.id)
    return subscription
  }

  /**
   * Create a subscription with specific status
   */
  async createTestSubscriptionWithStatus(params: {
    customerId: string
    priceId: string
    status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
    paymentMethodId?: string
  }): Promise<Stripe.Subscription> {
    let subscription = await this.createTestSubscription({
      customerId: params.customerId,
      priceId: params.priceId,
      paymentMethodId: params.paymentMethodId,
      trialPeriodDays: params.status === 'trialing' ? 14 : undefined
    })

    // Manipulate subscription to desired status if needed
    if (params.status === 'canceled') {
      subscription = await this.stripe.subscriptions.cancel(subscription.id)
    } else if (params.status === 'past_due') {
      // Create an unpaid invoice to put subscription in past_due
      await this.stripe.invoices.create({
        customer: params.customerId,
        subscription: subscription.id,
        auto_advance: true
      })
    }

    return subscription
  }

  // ========================
  // Checkout Session Operations
  // ========================

  /**
   * Create a test checkout session
   */
  async createTestCheckoutSession(params: {
    customerId?: string
    customerEmail?: string
    priceId: string
    mode?: 'payment' | 'subscription' | 'setup'
    successUrl?: string
    cancelUrl?: string
    trialPeriodDays?: number
    metadata?: Record<string, string>
  }): Promise<Stripe.Checkout.Session> {
    const sessionData: Stripe.Checkout.SessionCreateParams = {
      mode: params.mode || 'subscription',
      success_url: params.successUrl || 'https://example.com/success',
      cancel_url: params.cancelUrl || 'https://example.com/cancel',
      metadata: {
        testEnvironment: 'true',
        createdBy: 'mcp-test-helper',
        ...params.metadata
      },
      automatic_tax: { enabled: true }
    }

    if (params.customerId) {
      sessionData.customer = params.customerId
    } else if (params.customerEmail) {
      sessionData.customer_email = params.customerEmail
    }

    if (params.mode === 'subscription' || params.mode === 'payment') {
      sessionData.line_items = [{
        price: params.priceId,
        quantity: 1
      }]
    }

    if (params.trialPeriodDays && params.mode === 'subscription') {
      sessionData.subscription_data = {
        trial_period_days: params.trialPeriodDays
      }
    }

    const session = await this.stripe.checkout.sessions.create(sessionData)
    this.createdResources.checkoutSessions.push(session.id)
    return session
  }

  // ========================
  // Payment Intent Operations
  // ========================

  /**
   * Create a test payment intent
   */
  async createTestPaymentIntent(params: {
    amount: number
    currency?: string
    customerId?: string
    paymentMethodId?: string
    confirmImmediately?: boolean
    metadata?: Record<string, string>
  }): Promise<Stripe.PaymentIntent> {
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: params.amount,
      currency: params.currency || 'usd',
      metadata: {
        testEnvironment: 'true',
        createdBy: 'mcp-test-helper',
        ...params.metadata
      }
    }

    if (params.customerId) {
      paymentIntentData.customer = params.customerId
    }

    if (params.paymentMethodId) {
      paymentIntentData.payment_method = params.paymentMethodId
      if (params.confirmImmediately) {
        paymentIntentData.confirm = true
      }
    }

    const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData)
    this.createdResources.paymentIntents.push(paymentIntent.id)
    return paymentIntent
  }

  /**
   * Create a payment intent that will be declined
   */
  async createDeclinedPaymentIntent(params: {
    amount: number
    declineType: keyof typeof TEST_CARD_NUMBERS
    customerId?: string
  }): Promise<{ paymentIntent: Stripe.PaymentIntent; error: any }> {
    const paymentMethod = await this.createDeclinedPaymentMethod(params.declineType)

    try {
      const paymentIntent = await this.createTestPaymentIntent({
        amount: params.amount,
        customerId: params.customerId,
        paymentMethodId: paymentMethod.id,
        confirmImmediately: true
      })

      return { paymentIntent, error: null }
    } catch (error) {
      // This is expected for declined cards
      return { paymentIntent: null as any, error }
    }
  }

  // ========================
  // Invoice Operations
  // ========================

  /**
   * Create a test invoice
   */
  async createTestInvoice(params: {
    customerId: string
    subscriptionId?: string
    amount?: number
    description?: string
    dueDate?: Date
    autoAdvance?: boolean
  }): Promise<Stripe.Invoice> {
    const invoiceData: Stripe.InvoiceCreateParams = {
      customer: params.customerId,
      metadata: {
        testEnvironment: 'true',
        createdBy: 'mcp-test-helper'
      }
    }

    if (params.subscriptionId) {
      invoiceData.subscription = params.subscriptionId
    }

    if (params.amount) {
      // Add invoice item for specific amount
      await this.stripe.invoiceItems.create({
        customer: params.customerId,
        amount: params.amount,
        currency: 'usd',
        description: params.description || 'Test charge'
      })
    }

    if (params.dueDate) {
      invoiceData.due_date = Math.floor(params.dueDate.getTime() / 1000)
    }

    if (params.autoAdvance !== undefined) {
      invoiceData.auto_advance = params.autoAdvance
    }

    return await this.stripe.invoices.create(invoiceData)
  }

  // ========================
  // Webhook Testing
  // ========================

  /**
   * Simulate a webhook event
   */
  async simulateWebhookEvent(params: {
    eventType: string
    objectId: string
    objectType: 'customer' | 'subscription' | 'invoice' | 'payment_intent'
    additionalData?: any
  }): Promise<{
    event: Stripe.Event
    payload: string
    signature: string
  }> {
    // Retrieve the actual object to use as event data
    let object: any
    switch (params.objectType) {
      case 'customer':
        object = await this.stripe.customers.retrieve(params.objectId)
        break
      case 'subscription':
        object = await this.stripe.subscriptions.retrieve(params.objectId)
        break
      case 'invoice':
        object = await this.stripe.invoices.retrieve(params.objectId)
        break
      case 'payment_intent':
        object = await this.stripe.paymentIntents.retrieve(params.objectId)
        break
    }

    // Create mock event structure
    const event: Stripe.Event = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      created: Math.floor(Date.now() / 1000),
      type: params.eventType as any,
      data: {
        object: { ...object, ...params.additionalData },
        previous_attributes: {}
      },
      api_version: this.config.apiVersion || '2024-06-20',
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: `req_test_${Date.now()}`,
        idempotency_key: null
      }
    }

    const payload = JSON.stringify(event)

    // Generate webhook signature if webhook secret is available
    let signature = 'mock_signature'
    if (this.config.webhookSecret) {
      signature = this.stripe.webhooks.generateTestHeaderString({
        payload,
        secret: this.config.webhookSecret
      })
    }

    return { event, payload, signature }
  }

  // ========================
  // Test Scenarios
  // ========================

  /**
   * Create a complete subscription lifecycle test scenario
   */
  async createSubscriptionLifecycleScenario(params: {
    planType: 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
    trialPeriodDays?: number
  }): Promise<{
    customer: Stripe.Customer
    paymentMethod: Stripe.PaymentMethod
    product: Stripe.Product
    monthlyPrice: Stripe.Price
    annualPrice: Stripe.Price
    subscription: Stripe.Subscription
    checkoutSession: Stripe.Checkout.Session
  }> {
    // Create test prices
    const { products, prices } = await this.createTestPlanPrices()

    // Create customer with payment method
    const { customer, paymentMethod } = await this.createTestCustomerWithPaymentMethod({
      metadata: { planType: params.planType }
    })

    // Create subscription
    const subscription = await this.createTestSubscription({
      customerId: customer.id,
      priceId: prices[params.planType].monthly.id,
      paymentMethodId: paymentMethod.id,
      trialPeriodDays: params.trialPeriodDays,
      metadata: { scenarioType: 'lifecycle_test' }
    })

    // Create checkout session for comparison
    const checkoutSession = await this.createTestCheckoutSession({
      customerId: customer.id,
      priceId: prices[params.planType].monthly.id,
      trialPeriodDays: params.trialPeriodDays,
      metadata: { scenarioType: 'lifecycle_test' }
    })

    return {
      customer,
      paymentMethod,
      product: products[params.planType],
      monthlyPrice: prices[params.planType].monthly,
      annualPrice: prices[params.planType].annual,
      subscription,
      checkoutSession
    }
  }

  /**
   * Create a payment failure scenario
   */
  async createPaymentFailureScenario(params: {
    failureType: keyof typeof TEST_CARD_NUMBERS
    amount: number
  }): Promise<{
    customer: Stripe.Customer
    paymentMethod: Stripe.PaymentMethod
    paymentResult: { paymentIntent: Stripe.PaymentIntent | null; error: any }
  }> {
    const customer = await this.createTestCustomer({
      metadata: { scenarioType: 'payment_failure' }
    })

    const paymentMethod = await this.createDeclinedPaymentMethod(params.failureType)

    await this.stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id
    })

    const paymentResult = await this.createDeclinedPaymentIntent({
      amount: params.amount,
      declineType: params.failureType,
      customerId: customer.id
    })

    return { customer, paymentMethod, paymentResult }
  }

  // ========================
  // Cleanup Operations
  // ========================

  /**
   * Clean up all created test resources
   */
  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<any>[] = []

    // Cancel and delete subscriptions
    for (const subscriptionId of this.createdResources.subscriptions) {
      cleanupPromises.push(
        this.stripe.subscriptions.cancel(subscriptionId).catch(() => {})
      )
    }

    // Cancel payment intents
    for (const paymentIntentId of this.createdResources.paymentIntents) {
      cleanupPromises.push(
        this.stripe.paymentIntents.cancel(paymentIntentId).catch(() => {})
      )
    }

    // Detach payment methods
    for (const paymentMethodId of this.createdResources.paymentMethods) {
      cleanupPromises.push(
        this.stripe.paymentMethods.detach(paymentMethodId).catch(() => {})
      )
    }

    // Delete customers (this will also clean up associated resources)
    for (const customerId of this.createdResources.customers) {
      cleanupPromises.push(
        this.stripe.customers.del(customerId).catch(() => {})
      )
    }

    // Archive prices and products (can't delete if used)
    for (const priceId of this.createdResources.prices) {
      cleanupPromises.push(
        this.stripe.prices.update(priceId, { active: false }).catch(() => {})
      )
    }

    for (const productId of this.createdResources.products) {
      cleanupPromises.push(
        this.stripe.products.update(productId, { active: false }).catch(() => {})
      )
    }

    await Promise.all(cleanupPromises)

    // Reset tracking
    this.createdResources = {
      customers: [],
      subscriptions: [],
      paymentIntents: [],
      paymentMethods: [],
      prices: [],
      products: [],
      checkoutSessions: []
    }
  }

  /**
   * Get summary of created resources for debugging
   */
  getResourceSummary(): typeof this.createdResources {
    return { ...this.createdResources }
  }
}

// ========================
// Utility Functions
// ========================

/**
 * Wait for a webhook to be processed
 */
export async function waitForWebhookProcessing(timeoutMs = 5000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeoutMs))
}

/**
 * Verify webhook signature (for testing webhook handlers)
 */
export function verifyTestWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const stripe = new (require('stripe'))('sk_test_mock')
    stripe.webhooks.constructEvent(payload, signature, secret)
    return true
  } catch {
    return false
  }
}

/**
 * Create MCP Stripe helper with automatic cleanup
 */
export function createMCPStripeHelper(config?: Partial<MCPStripeConfig>): {
  helper: MCPStripeTestHelper
  cleanup: () => Promise<void>
} {
  const helper = new MCPStripeTestHelper(config)

  return {
    helper,
    cleanup: () => helper.cleanup()
  }
}

// ========================
// Export Test Constants
// ========================

export { TEST_CARD_NUMBERS, TEST_PLAN_CONFIGS }
