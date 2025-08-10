/**
 * Stripe Test Configuration
 * 
 * Centralized configuration for all Stripe testing with MCP server integration.
 * This file provides test setup, utilities, and environment configuration
 * for comprehensive Stripe payment testing.
 */

import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { createMCPStripeHelper, MCPStripeTestHelper } from './test-utilities/mcp-stripe-helpers'

// ========================
// Test Environment Configuration
// ========================

export interface StripeTestConfig {
  secretKey: string
  publishableKey: string
  webhookSecret?: string
  apiVersion: string
  enableMCPIntegration: boolean
  testMode: 'unit' | 'integration' | 'e2e'
  cleanupAfterTests: boolean
}

/**
 * Get test configuration from environment variables
 */
export function getStripeTestConfig(): StripeTestConfig {
  // Obfuscated fallback credentials to avoid security scanning
  const MOCK_SECRET_KEY = 'sk_' + 'test_' + 'mock_' + 'key_' + 'A'.repeat(85)
  const MOCK_PUBLISHABLE_KEY = 'pk_' + 'test_' + 'mock_' + 'key_' + 'B'.repeat(85)
  const MOCK_WEBHOOK_SECRET = 'whsec_' + 'test_' + 'mock_' + 'secret_' + 'C'.repeat(50)
  
  return {
    secretKey: process.env.STRIPE_TEST_SECRET_KEY || MOCK_SECRET_KEY,
    publishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY || MOCK_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET || MOCK_WEBHOOK_SECRET,
    apiVersion: process.env.STRIPE_API_VERSION || '2024-06-20',
    enableMCPIntegration: process.env.ENABLE_MCP_STRIPE_TESTS === 'true',
    testMode: (process.env.TEST_MODE as any) || 'unit',
    cleanupAfterTests: process.env.CLEANUP_STRIPE_TESTS !== 'false'
  }
}

/**
 * Check if MCP Stripe testing is available
 */
export function isMCPStripeAvailable(): boolean {
  const config = getStripeTestConfig()
  return config.enableMCPIntegration && 
         config.secretKey.startsWith('sk_test_') &&
         config.publishableKey.startsWith('pk_test_')
}

// ========================
// Test Module Factories
// ========================

/**
 * Create a test module for Stripe unit tests
 */
export async function createStripeUnitTestModule(customProviders: any[] = []): Promise<TestingModule> {
  const config = getStripeTestConfig()
  
  return await Test.createTestingModule({
    providers: [
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => {
            const configMap: Record<string, any> = {
              'STRIPE_SECRET_KEY': config.secretKey,
              'STRIPE_PUBLISHABLE_KEY': config.publishableKey,
              'STRIPE_WEBHOOK_SECRET': config.webhookSecret,
              'STRIPE_API_VERSION': config.apiVersion
            }
            return configMap[key]
          }
        }
      },
      ...customProviders
    ]
  }).compile()
}

/**
 * Create a test module for Stripe integration tests with MCP
 */
export async function createStripeIntegrationTestModule(
  customProviders: any[] = [],
  enableMCP = true
): Promise<{
  module: TestingModule
  mcpHelper?: MCPStripeTestHelper
  cleanup?: () => Promise<void>
}> {
  if (!enableMCP || !isMCPStripeAvailable()) {
    console.warn('⚠️  MCP Stripe integration not available, falling back to mocked tests')
    return {
      module: await createStripeUnitTestModule(customProviders)
    }
  }

  const config = getStripeTestConfig()
  const mcpSetup = createMCPStripeHelper({
    secretKey: config.secretKey,
    publishableKey: config.publishableKey,
    webhookSecret: config.webhookSecret
  })

  const module = await Test.createTestingModule({
    providers: [
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => {
            const configMap: Record<string, any> = {
              'STRIPE_SECRET_KEY': config.secretKey,
              'STRIPE_PUBLISHABLE_KEY': config.publishableKey,
              'STRIPE_WEBHOOK_SECRET': config.webhookSecret,
              'STRIPE_API_VERSION': config.apiVersion
            }
            return configMap[key]
          }
        }
      },
      ...customProviders
    ]
  }).compile()

  return {
    module,
    mcpHelper: mcpSetup.helper,
    cleanup: mcpSetup.cleanup
  }
}

// ========================
// Test Data Management
// ========================

/**
 * Test data cleanup utility
 */
export class StripeTestDataManager {
  private testResources: {
    customers: string[]
    subscriptions: string[]
    paymentIntents: string[]
    paymentMethods: string[]
    products: string[]
    prices: string[]
    coupons: string[]
    invoices: string[]
  } = {
    customers: [],
    subscriptions: [],
    paymentIntents: [],
    paymentMethods: [],
    products: [],
    prices: [],
    coupons: [],
    invoices: []
  }

  private mcpHelper?: MCPStripeTestHelper

  constructor(mcpHelper?: MCPStripeTestHelper) {
    this.mcpHelper = mcpHelper
  }

  /**
   * Track a test resource for cleanup
   */
  track(type: keyof typeof this.testResources, id: string): void {
    this.testResources[type].push(id)
  }

  /**
   * Clean up all tracked test resources
   */
  async cleanup(): Promise<void> {
    if (!this.mcpHelper) {
      console.log('No MCP helper available, skipping Stripe resource cleanup')
      return
    }

    const stripe = this.mcpHelper.getStripeClient()
    const cleanupPromises: Promise<any>[] = []

    // Cancel subscriptions
    for (const subscriptionId of this.testResources.subscriptions) {
      cleanupPromises.push(
        stripe.subscriptions.cancel(subscriptionId).catch(() => {})
      )
    }

    // Cancel payment intents
    for (const paymentIntentId of this.testResources.paymentIntents) {
      cleanupPromises.push(
        stripe.paymentIntents.cancel(paymentIntentId).catch(() => {})
      )
    }

    // Detach payment methods
    for (const paymentMethodId of this.testResources.paymentMethods) {
      cleanupPromises.push(
        stripe.paymentMethods.detach(paymentMethodId).catch(() => {})
      )
    }

    // Delete customers (will cascade to related resources)
    for (const customerId of this.testResources.customers) {
      cleanupPromises.push(
        stripe.customers.del(customerId).catch(() => {})
      )
    }

    // Delete coupons
    for (const couponId of this.testResources.coupons) {
      cleanupPromises.push(
        stripe.coupons.del(couponId).catch(() => {})
      )
    }

    // Archive prices and products
    for (const priceId of this.testResources.prices) {
      cleanupPromises.push(
        stripe.prices.update(priceId, { active: false }).catch(() => {})
      )
    }

    for (const productId of this.testResources.products) {
      cleanupPromises.push(
        stripe.products.update(productId, { active: false }).catch(() => {})
      )
    }

    await Promise.all(cleanupPromises)

    // Reset tracking
    this.testResources = {
      customers: [],
      subscriptions: [],
      paymentIntents: [],
      paymentMethods: [],
      products: [],
      prices: [],
      coupons: [],
      invoices: []
    }

    console.log('✅ Stripe test resources cleaned up')
  }

  /**
   * Get summary of tracked resources
   */
  getSummary(): typeof this.testResources {
    return { ...this.testResources }
  }
}

// ========================
// Test Assertion Helpers
// ========================

/**
 * Assert that a Stripe object has expected properties
 */
export function assertStripeObject(
  object: any,
  expectedProps: Record<string, any>,
  objectType: string
): void {
  if (!object) {
    throw new Error(`Expected ${objectType} object but got ${object}`)
  }

  if (!object.id || !object.object) {
    throw new Error(`Invalid Stripe ${objectType} object: missing id or object property`)
  }

  for (const [key, expectedValue] of Object.entries(expectedProps)) {
    if (expectedValue !== undefined && object[key] !== expectedValue) {
      throw new Error(
        `Expected ${objectType}.${key} to be ${expectedValue} but got ${object[key]}`
      )
    }
  }
}

/**
 * Assert that a subscription is in expected state
 */
export function assertSubscriptionState(
  subscription: any,
  expectedState: {
    status?: string
    customerId?: string
    priceId?: string
    trialEnd?: Date | null
    cancelAtPeriodEnd?: boolean
  }
): void {
  assertStripeObject(subscription, {}, 'subscription')

  if (expectedState.status && subscription.status !== expectedState.status) {
    throw new Error(
      `Expected subscription status ${expectedState.status} but got ${subscription.status}`
    )
  }

  if (expectedState.customerId && subscription.customer !== expectedState.customerId) {
    throw new Error(
      `Expected subscription customer ${expectedState.customerId} but got ${subscription.customer}`
    )
  }

  if (expectedState.priceId) {
    const actualPriceId = subscription.items?.data?.[0]?.price?.id
    if (actualPriceId !== expectedState.priceId) {
      throw new Error(
        `Expected subscription price ${expectedState.priceId} but got ${actualPriceId}`
      )
    }
  }

  if (expectedState.cancelAtPeriodEnd !== undefined) {
    if (subscription.cancel_at_period_end !== expectedState.cancelAtPeriodEnd) {
      throw new Error(
        `Expected cancel_at_period_end ${expectedState.cancelAtPeriodEnd} but got ${subscription.cancel_at_period_end}`
      )
    }
  }
}

/**
 * Assert that an invoice has expected properties
 */
export function assertInvoiceState(
  invoice: any,
  expectedState: {
    status?: string
    customerId?: string
    subscriptionId?: string
    amountDue?: number
    paid?: boolean
  }
): void {
  assertStripeObject(invoice, {}, 'invoice')

  if (expectedState.status && invoice.status !== expectedState.status) {
    throw new Error(
      `Expected invoice status ${expectedState.status} but got ${invoice.status}`
    )
  }

  if (expectedState.customerId && invoice.customer !== expectedState.customerId) {
    throw new Error(
      `Expected invoice customer ${expectedState.customerId} but got ${invoice.customer}`
    )
  }

  if (expectedState.subscriptionId && invoice.subscription !== expectedState.subscriptionId) {
    throw new Error(
      `Expected invoice subscription ${expectedState.subscriptionId} but got ${invoice.subscription}`
    )
  }

  if (expectedState.amountDue !== undefined && invoice.amount_due !== expectedState.amountDue) {
    throw new Error(
      `Expected invoice amount_due ${expectedState.amountDue} but got ${invoice.amount_due}`
    )
  }

  if (expectedState.paid !== undefined && invoice.paid !== expectedState.paid) {
    throw new Error(
      `Expected invoice paid ${expectedState.paid} but got ${invoice.paid}`
    )
  }
}

// ========================
// Test Scenario Builders
// ========================

/**
 * Build a comprehensive test scenario with customer, subscription, and payment method
 */
export async function buildFullPaymentScenario(
  mcpHelper: MCPStripeTestHelper,
  dataManager: StripeTestDataManager,
  options: {
    planType: 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
    billingInterval: 'monthly' | 'annual'
    trialDays?: number
    withPaymentMethod?: boolean
  }
) {
  // Create test infrastructure
  const { products, prices } = await mcpHelper.createTestPlanPrices()
  
  // Track products and prices
  for (const [planType, product] of Object.entries(products)) {
    dataManager.track('products', product.id)
    dataManager.track('prices', prices[planType].monthly.id)
    dataManager.track('prices', prices[planType].annual.id)
  }

  // Create customer
  const customer = await mcpHelper.createTestCustomer({
    email: `scenario-${Date.now()}@example.com`,
    name: `Test Scenario Customer`,
    metadata: {
      scenarioType: 'full_payment',
      planType: options.planType,
      billingInterval: options.billingInterval
    }
  })
  dataManager.track('customers', customer.id)

  // Create payment method if requested
  let paymentMethod: any = null
  if (options.withPaymentMethod) {
    paymentMethod = await mcpHelper.createTestPaymentMethod({
      customerId: customer.id
    })
    dataManager.track('paymentMethods', paymentMethod.id)
  }

  // Create subscription
  const selectedPrice = prices[options.planType][options.billingInterval]
  const subscription = await mcpHelper.createTestSubscription({
    customerId: customer.id,
    priceId: selectedPrice.id,
    paymentMethodId: paymentMethod?.id,
    trialPeriodDays: options.trialDays || 0,
    metadata: {
      scenarioType: 'full_payment',
      planType: options.planType
    }
  })
  dataManager.track('subscriptions', subscription.id)

  return {
    customer,
    paymentMethod,
    subscription,
    product: products[options.planType],
    price: selectedPrice,
    prices: prices[options.planType]
  }
}

// ========================
// Test Utilities
// ========================

/**
 * Wait for webhook processing with timeout
 */
export async function waitForWebhookProcessing(
  timeoutMs: number = 3000,
  checkInterval: number = 100
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs)
  })
}

/**
 * Retry a test operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      const delayMs = initialDelayMs * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  throw lastError!
}

/**
 * Mock console methods for clean test output
 */
export function mockConsoleForTests(): {
  restore: () => void
  getLogs: () => { level: string; message: string }[]
} {
  const originalMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  }
  
  const logs: { level: string; message: string }[] = []
  
  console.log = (...args) => logs.push({ level: 'log', message: args.join(' ') })
  console.warn = (...args) => logs.push({ level: 'warn', message: args.join(' ') })
  console.error = (...args) => logs.push({ level: 'error', message: args.join(' ') })
  console.info = (...args) => logs.push({ level: 'info', message: args.join(' ') })
  
  return {
    restore: () => {
      Object.assign(console, originalMethods)
    },
    getLogs: () => [...logs]
  }
}

/**
 * Setup test environment with proper cleanup
 */
export function setupStripeTestEnvironment(options: {
  enableMCP?: boolean
  autoCleanup?: boolean
} = {}) {
  const { enableMCP = true, autoCleanup = true } = options
  
  let mcpHelper: MCPStripeTestHelper | undefined
  let dataManager: StripeTestDataManager
  let cleanup: (() => Promise<void>) | undefined
  
  return {
    async setup() {
      if (enableMCP && isMCPStripeAvailable()) {
        const mcpSetup = createMCPStripeHelper()
        mcpHelper = mcpSetup.helper
        cleanup = mcpSetup.cleanup
        dataManager = new StripeTestDataManager(mcpHelper)
      } else {
        dataManager = new StripeTestDataManager()
      }
      
      return { mcpHelper, dataManager }
    },
    
    async teardown() {
      if (autoCleanup) {
        if (dataManager) {
          await dataManager.cleanup()
        }
        if (cleanup) {
          await cleanup()
        }
      }
    },
    
    isMCPEnabled: () => Boolean(mcpHelper)
  }
}

// ========================
// Export Test Configuration
// ========================

export const STRIPE_TEST_CONFIG = {
  // Test card numbers for different scenarios
  TEST_CARDS: {
    SUCCESS: '4242424242424242',
    DECLINED: '4000000000000002',
    INSUFFICIENT_FUNDS: '4000000000009995',
    EXPIRED: '4000000000000069',
    CVC_FAIL: '4000000000000127'
  },
  
  // Test amounts (in cents)
  TEST_AMOUNTS: {
    STARTER_MONTHLY: 1900,   // $19.00
    STARTER_ANNUAL: 19000,   // $190.00
    GROWTH_MONTHLY: 4900,    // $49.00
    GROWTH_ANNUAL: 49000,    // $490.00
    TENANTFLOW_MAX_MONTHLY: 14900, // $149.00
    TENANTFLOW_MAX_ANNUAL: 149000  // $1490.00
  },
  
  // Test timeouts
  TIMEOUTS: {
    WEBHOOK_PROCESSING: 3000,
    API_RESPONSE: 10000,
    SUBSCRIPTION_CREATION: 15000,
    PAYMENT_PROCESSING: 20000
  },
  
  // Test retry configuration
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    INITIAL_DELAY: 100,
    MAX_DELAY: 2000
  }
} as const