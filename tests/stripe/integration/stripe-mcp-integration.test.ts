import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { StripeService } from '../../../apps/backend/src/stripe/stripe.service'
import { StripeBillingService } from '../../../apps/backend/src/stripe/stripe-billing.service'
import { WebhookService } from '../../../apps/backend/src/stripe/webhook.service'
import { PrismaService } from '../../../apps/backend/src/prisma/prisma.service'
import { ErrorHandlerService } from '../../../apps/backend/src/common/errors/error-handler.service'
import { MCPStripeTestHelper, createMCPStripeHelper, waitForWebhookProcessing } from '../test-utilities/mcp-stripe-helpers'
import type { PlanType } from '@repo/database'
import type Stripe from 'stripe'

/**
 * Stripe MCP Integration Tests
 *
 * These tests use the actual MCP Stripe server to perform real API calls
 * against Stripe's test mode, providing comprehensive integration testing
 * for all payment-related functionality.
 */
describe('Stripe MCP Integration Tests', () => {
  let app: TestingModule
  let stripeService: StripeService
  let stripeBillingService: StripeBillingService
  let webhookService: WebhookService
  let prismaService: PrismaService
  let mcpHelper: MCPStripeTestHelper
  let cleanup: () => Promise<void>

  // Test data
  let testCustomer: Stripe.Customer
  let testPrices: Record<string, { monthly: Stripe.Price; annual: Stripe.Price }>
  let testProducts: Record<string, Stripe.Product>

  beforeAll(async () => {
    // Skip integration tests if MCP Stripe is not configured
    if (!process.env.STRIPE_TEST_SECRET_KEY) {
      console.log('⚠️  Skipping MCP Stripe integration tests - STRIPE_TEST_SECRET_KEY not configured')
      return
    }

    // Initialize MCP Stripe helper
    const mcpSetup = createMCPStripeHelper()
    mcpHelper = mcpSetup.helper
    cleanup = mcpSetup.cleanup

    // Create test module
    app = await Test.createTestingModule({
      providers: [
        StripeService,
        StripeBillingService,
        WebhookService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'STRIPE_SECRET_KEY': process.env.STRIPE_TEST_SECRET_KEY,
                'STRIPE_PUBLISHABLE_KEY': process.env.STRIPE_TEST_PUBLISHABLE_KEY,
                'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_TEST_WEBHOOK_SECRET
              }
              return config[key]
            }
          }
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn().mockResolvedValue({
                id: 'test_user_123',
                email: 'test@example.com',
                name: 'Test User',
                Subscription: []
              })
            },
            subscription: {
              findFirst: vi.fn(),
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              updateMany: vi.fn(),
              upsert: vi.fn().mockResolvedValue({
                id: 'sub_db_123',
                userId: 'test_user_123',
                planType: 'STARTER',
                status: 'ACTIVE'
              })
            }
          }
        },
        {
          provide: ErrorHandlerService,
          useValue: {
            createValidationError: (message: string) => new Error(message),
            createNotFoundError: (resource: string, id: string) => new Error(`${resource} ${id} not found`),
            handleErrorEnhanced: (error: Error) => { throw error }
          }
        }
      ]
    }).compile()

    stripeService = app.get<StripeService>(StripeService)
    stripeBillingService = app.get<StripeBillingService>(StripeBillingService)
    webhookService = app.get<WebhookService>(WebhookService)
    prismaService = app.get<PrismaService>(PrismaService)

    // Create test data once for all tests
    testCustomer = await mcpHelper.createTestCustomer({
      email: 'integration-test@example.com',
      name: 'Integration Test Customer',
      metadata: { testSuite: 'mcp-integration' }
    })

    const planSetup = await mcpHelper.createTestPlanPrices()
    testPrices = planSetup.prices
    testProducts = planSetup.products

    console.log('✅ MCP Stripe integration test setup complete')
  })

  afterAll(async () => {
    if (cleanup && mcpHelper) {
      await cleanup()
      console.log('✅ MCP Stripe integration test cleanup complete')
    }

    if (app) {
      await app.close()
    }
  })

  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks()
  })

  describe('Customer Management with MCP', () => {
    it('should create customer using real Stripe API', async () => {
      const customerParams = {
        email: `test-${Date.now()}@example.com`,
        name: 'Real API Test Customer',
        metadata: { source: 'mcp-test', timestamp: Date.now().toString() }
      }

      const customer = await stripeService.createCustomer(customerParams)

      expect(customer).toBeDefined()
      expect(customer.id).toMatch(/^cus_/)
      expect(customer.email).toBe(customerParams.email)
      expect(customer.name).toBe(customerParams.name)
      expect(customer.metadata?.source).toBe('mcp-test')

      // Verify customer can be retrieved
      const retrievedCustomer = await stripeService.getCustomer(customer.id)
      expect(retrievedCustomer).toBeDefined()
      expect(retrievedCustomer!.id).toBe(customer.id)

      // Cleanup
      await mcpHelper.getStripeClient().customers.del(customer.id)
    })

    it('should handle customer not found gracefully', async () => {
      const result = await stripeService.getCustomer('cus_nonexistent123')
      expect(result).toBeNull()
    })

    it('should handle customer creation with duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`

      // Create first customer
      const customer1 = await stripeService.createCustomer({
        email,
        name: 'First Customer'
      })

      // Create second customer with same email (should succeed - Stripe allows this)
      const customer2 = await stripeService.createCustomer({
        email,
        name: 'Second Customer'
      })

      expect(customer1.id).not.toBe(customer2.id)
      expect(customer1.email).toBe(customer2.email)

      // Cleanup
      await Promise.all([
        mcpHelper.getStripeClient().customers.del(customer1.id),
        mcpHelper.getStripeClient().customers.del(customer2.id)
      ])
    })
  })

  describe('Subscription Management with MCP', () => {
    let testPaymentMethod: Stripe.PaymentMethod

    beforeEach(async () => {
      // Create a test payment method for each test
      testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })
    })

    it('should create subscription with real Stripe API', async () => {
      const subscriptionParams = {
        userId: 'test_user_123',
        planType: 'STARTER' as PlanType,
        billingInterval: 'monthly' as const,
        paymentMethodId: testPaymentMethod.id,
        trialDays: 14
      }

      const result = await stripeBillingService.createSubscription(subscriptionParams)

      expect(result).toBeDefined()
      expect(result.subscriptionId).toMatch(/^sub_/)
      expect(result.customerId).toBe(testCustomer.id)
      expect(result.priceId).toBe(testPrices.STARTER.monthly.id)
      expect(result.status).toMatch(/^(trialing|active|incomplete)$/)

      // Verify subscription exists in Stripe
      const stripeSubscription = await stripeService.getSubscription(result.subscriptionId)
      expect(stripeSubscription).toBeDefined()
      expect(stripeSubscription!.id).toBe(result.subscriptionId)
      expect(stripeSubscription!.status).toMatch(/^(trialing|active|incomplete)$/)
    })

    it('should create subscription with annual billing', async () => {
      const subscriptionParams = {
        userId: 'test_user_123',
        planType: 'GROWTH' as PlanType,
        billingInterval: 'annual' as const,
        paymentMethodId: testPaymentMethod.id
      }

      const result = await stripeBillingService.createSubscription(subscriptionParams)

      expect(result.priceId).toBe(testPrices.GROWTH.annual.id)

      const stripeSubscription = await stripeService.getSubscription(result.subscriptionId)
      expect(stripeSubscription!.items.data[0].price.id).toBe(testPrices.GROWTH.annual.id)
      expect(stripeSubscription!.items.data[0].price.recurring?.interval).toBe('year')
    })

    it('should update subscription to different plan', async () => {
      // Create initial subscription
      const initialSubscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id
      })

      // Update to GROWTH plan
      const updateResult = await stripeBillingService.updateSubscription({
        subscriptionId: initialSubscription.id,
        userId: 'test_user_123',
        newPlanType: 'GROWTH',
        billingInterval: 'monthly',
        prorationBehavior: 'create_prorations'
      })

      expect(updateResult.subscriptionId).toBe(initialSubscription.id)
      expect(updateResult.priceId).toBe(testPrices.GROWTH.monthly.id)

      // Verify in Stripe
      const updatedSubscription = await stripeService.getSubscription(initialSubscription.id)
      expect(updatedSubscription!.items.data[0].price.id).toBe(testPrices.GROWTH.monthly.id)
    })

    it('should cancel subscription at period end', async () => {
      // Create subscription
      const subscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id
      })

      // Cancel at period end
      const cancelResult = await stripeBillingService.cancelSubscription({
        subscriptionId: subscription.id,
        userId: 'test_user_123',
        cancellationReason: 'user_requested'
      })

      expect(cancelResult.status).toBe('active') // Still active until period end
      expect(cancelResult.canceledAt).toBeUndefined()

      // Verify in Stripe
      const canceledSubscription = await stripeService.getSubscription(subscription.id)
      expect(canceledSubscription!.cancel_at_period_end).toBe(true)
      expect(canceledSubscription!.status).toBe('active')
    })

    it('should cancel subscription immediately', async () => {
      // Create subscription
      const subscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id
      })

      // Cancel immediately
      const cancelResult = await stripeBillingService.cancelSubscription({
        subscriptionId: subscription.id,
        userId: 'test_user_123',
        immediately: true,
        cancellationReason: 'user_requested'
      })

      expect(cancelResult.status).toBe('canceled')
      expect(cancelResult.canceledAt).toBeDefined()

      // Verify in Stripe
      const canceledSubscription = await stripeService.getSubscription(subscription.id)
      expect(canceledSubscription!.status).toBe('canceled')
    })

    it('should handle subscription with trial period', async () => {
      const subscriptionParams = {
        userId: 'test_user_123',
        planType: 'TENANTFLOW_MAX' as PlanType,
        billingInterval: 'monthly' as const,
        trialDays: 30
      }

      const result = await stripeBillingService.createSubscription(subscriptionParams)

      const stripeSubscription = await stripeService.getSubscription(result.subscriptionId)
      expect(stripeSubscription!.status).toBe('trialing')
      expect(stripeSubscription!.trial_end).toBeDefined()
      expect(stripeSubscription!.trial_start).toBeDefined()

      // Calculate expected trial duration (approximately 30 days)
      const trialDuration = stripeSubscription!.trial_end! - stripeSubscription!.trial_start!
      const expectedDuration = 30 * 24 * 60 * 60 // 30 days in seconds
      expect(Math.abs(trialDuration - expectedDuration)).toBeLessThan(60) // Within 1 minute
    })

    it('should reactivate paused subscription', async () => {
      // Create subscription without payment method (will be incomplete)
      const incompleteSubscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        trialPeriodDays: 0 // No trial to trigger incomplete status
      })

      // Reactivate with payment method
      const reactivateResult = await stripeBillingService.reactivateSubscription({
        userId: 'test_user_123',
        subscriptionId: incompleteSubscription.id,
        paymentMethodId: testPaymentMethod.id
      })

      expect(reactivateResult.status).toMatch(/^(active|incomplete)$/)

      // Verify customer has default payment method
      const updatedCustomer = await mcpHelper.getStripeClient().customers.retrieve(testCustomer.id) as Stripe.Customer
      expect(updatedCustomer.invoice_settings?.default_payment_method).toBe(testPaymentMethod.id)
    })
  })

  describe('Checkout Session Management with MCP', () => {
    it('should create checkout session for subscription', async () => {
      const checkoutParams = {
        userId: 'test_user_123',
        planType: 'GROWTH' as PlanType,
        billingInterval: 'monthly' as const,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }

      const result = await stripeBillingService.createCheckoutSession(checkoutParams)

      expect(result.sessionId).toMatch(/^cs_/)
      expect(result.url).toMatch(/^https:\/\/checkout\.stripe\.com/)

      // Verify session exists in Stripe
      const session = await mcpHelper.getStripeClient().checkout.sessions.retrieve(result.sessionId)
      expect(session.id).toBe(result.sessionId)
      expect(session.mode).toBe('subscription')
      expect(session.line_items?.data?.[0]?.price).toBe(testPrices.GROWTH.monthly.id)
      expect(session.customer).toBe(testCustomer.id)
    })

    it('should create checkout session with trial period', async () => {
      const checkoutParams = {
        userId: 'test_user_123',
        planType: 'TENANTFLOW_MAX' as PlanType,
        billingInterval: 'annual' as const,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }

      const result = await stripeBillingService.createCheckoutSession(checkoutParams)

      const session = await mcpHelper.getStripeClient().checkout.sessions.retrieve(result.sessionId, {
        expand: ['subscription_data']
      })

      expect(session.subscription_data?.trial_period_days).toBe(14)
      expect(session.subscription_data?.metadata?.userId).toBe('test_user_123')
      expect(session.subscription_data?.metadata?.planType).toBe('TENANTFLOW_MAX')
    })

    it('should create checkout session with coupon', async () => {
      // Create a test coupon first
      const coupon = await mcpHelper.getStripeClient().coupons.create({
        id: `test-coupon-${Date.now()}`,
        percent_off: 20,
        duration: 'once',
        metadata: { testEnvironment: 'true' }
      })

      const checkoutParams = {
        userId: 'test_user_123',
        planType: 'STARTER' as PlanType,
        billingInterval: 'monthly' as const,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        couponId: coupon.id
      }

      const result = await stripeBillingService.createCheckoutSession(checkoutParams)

      const session = await mcpHelper.getStripeClient().checkout.sessions.retrieve(result.sessionId)
      expect(session.discounts?.[0]?.coupon?.id).toBe(coupon.id)

      // Cleanup coupon
      await mcpHelper.getStripeClient().coupons.del(coupon.id)
    })
  })

  describe('Customer Portal Management with MCP', () => {
    it('should create customer portal session', async () => {
      // Create a subscription first (required for portal access)
      const testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id
      })

      const portalParams = {
        userId: 'test_user_123',
        returnUrl: 'https://example.com/account'
      }

      const result = await stripeBillingService.createCustomerPortalSession(portalParams)

      expect(result.url).toMatch(/^https:\/\/billing\.stripe\.com/)

      // Note: We can't easily verify the portal session details as it's not exposed in the API
      // but the fact that it returns a valid URL indicates success
    })

    it('should handle portal session creation for customer without subscription', async () => {
      // Create a customer without subscription
      const customerWithoutSub = await mcpHelper.createTestCustomer({
        email: `no-sub-${Date.now()}@example.com`
      })

      // Mock the user lookup to return this customer
      vi.mocked(prismaService.user.findUnique).mockResolvedValueOnce({
        id: 'test_user_no_sub',
        email: customerWithoutSub.email,
        name: customerWithoutSub.name,
        Subscription: [{ stripeCustomerId: customerWithoutSub.id }]
      } as any)

      const portalParams = {
        userId: 'test_user_no_sub',
        returnUrl: 'https://example.com/account'
      }

      const result = await stripeBillingService.createCustomerPortalSession(portalParams)

      expect(result.url).toMatch(/^https:\/\/billing\.stripe\.com/)
    })
  })

  describe('Payment Intent Handling with MCP', () => {
    it('should create payment intent for one-time payment', async () => {
      const paymentIntent = await mcpHelper.createTestPaymentIntent({
        amount: 5000, // $50.00
        currency: 'usd',
        customerId: testCustomer.id,
        metadata: { purpose: 'one-time-payment' }
      })

      expect(paymentIntent.id).toMatch(/^pi_/)
      expect(paymentIntent.amount).toBe(5000)
      expect(paymentIntent.currency).toBe('usd')
      expect(paymentIntent.customer).toBe(testCustomer.id)
      expect(paymentIntent.status).toMatch(/^(requires_payment_method|requires_confirmation|succeeded)$/)
    })

    it('should handle payment intent with declined card', async () => {
      const { paymentIntent, error } = await mcpHelper.createDeclinedPaymentIntent({
        amount: 2000,
        declineType: 'GENERIC_DECLINE',
        customerId: testCustomer.id
      })

      expect(error).toBeDefined()
      expect(error.type).toMatch(/card_error|invalid_request_error/)
    })

    it('should handle payment intent with insufficient funds card', async () => {
      const { paymentIntent, error } = await mcpHelper.createDeclinedPaymentIntent({
        amount: 3000,
        declineType: 'INSUFFICIENT_FUNDS',
        customerId: testCustomer.id
      })

      expect(error).toBeDefined()
      expect(error.decline_code).toBe('insufficient_funds')
    })
  })

  describe('Webhook Event Processing with MCP', () => {
    let testSubscription: Stripe.Subscription

    beforeEach(async () => {
      const testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      testSubscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id
      })

      // Mock database operations for webhook processing
      vi.mocked(prismaService.subscription.findFirst).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'test_user_123',
        stripeCustomerId: testCustomer.id,
        User: {
          id: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User'
        }
      } as any)

      vi.mocked(prismaService.subscription.update).mockResolvedValue({
        id: 'sub_db_123',
        status: 'ACTIVE'
      } as any)
    })

    it('should process subscription created webhook', async () => {
      const { event, payload, signature } = await mcpHelper.simulateWebhookEvent({
        eventType: 'customer.subscription.created',
        objectId: testSubscription.id,
        objectType: 'subscription'
      })

      // Mock webhook signature verification
      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(event)

      await webhookService.handleWebhookEvent(event)

      expect(prismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { stripeCustomerId: testCustomer.id }
      })
    })

    it('should process subscription updated webhook', async () => {
      const { event } = await mcpHelper.simulateWebhookEvent({
        eventType: 'customer.subscription.updated',
        objectId: testSubscription.id,
        objectType: 'subscription',
        additionalData: {
          status: 'active',
          previous_attributes: { status: 'trialing' }
        }
      })

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(event)

      await webhookService.handleWebhookEvent(event)

      expect(prismaService.subscription.update).toHaveBeenCalled()
    })

    it('should process subscription deleted webhook', async () => {
      const { event } = await mcpHelper.simulateWebhookEvent({
        eventType: 'customer.subscription.deleted',
        objectId: testSubscription.id,
        objectType: 'subscription'
      })

      vi.mocked(prismaService.subscription.updateMany).mockResolvedValue({ count: 1 })
      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(event)

      await webhookService.handleWebhookEvent(event)

      expect(prismaService.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: testSubscription.id },
        data: {
          status: 'CANCELED',
          cancelAtPeriodEnd: false,
          canceledAt: expect.any(Date)
        }
      })
    })

    it('should process invoice payment succeeded webhook', async () => {
      // Create an invoice first
      const invoice = await mcpHelper.createTestInvoice({
        customerId: testCustomer.id,
        subscriptionId: testSubscription.id
      })

      const { event } = await mcpHelper.simulateWebhookEvent({
        eventType: 'invoice.payment_succeeded',
        objectId: invoice.id,
        objectType: 'invoice',
        additionalData: {
          subscription: testSubscription.id
        }
      })

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(event)

      await webhookService.handleWebhookEvent(event)

      expect(prismaService.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: testSubscription.id },
        data: { status: 'ACTIVE' }
      })
    })

    it('should process invoice payment failed webhook', async () => {
      const invoice = await mcpHelper.createTestInvoice({
        customerId: testCustomer.id,
        subscriptionId: testSubscription.id
      })

      const { event } = await mcpHelper.simulateWebhookEvent({
        eventType: 'invoice.payment_failed',
        objectId: invoice.id,
        objectType: 'invoice',
        additionalData: {
          subscription: testSubscription.id,
          attempt_count: 1,
          amount_due: 1900,
          currency: 'usd',
          customer_email: testCustomer.email
        }
      })

      vi.mocked(prismaService.subscription.update).mockResolvedValue({
        id: 'sub_db_123',
        User: {
          id: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User'
        },
        planType: 'STARTER'
      } as any)

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(event)

      await webhookService.handleWebhookEvent(event)

      expect(prismaService.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: testSubscription.id },
        data: { status: 'PAST_DUE' },
        include: { User: true }
      })
    })
  })

  describe('Error Handling and Edge Cases with MCP', () => {
    it('should handle Stripe API rate limiting', async () => {
      // Create many requests rapidly to potentially trigger rate limiting
      const promises = Array.from({ length: 10 }, (_, i) =>
        stripeService.createCustomer({
          email: `rate-limit-test-${i}-${Date.now()}@example.com`,
          name: `Rate Limit Test ${i}`
        })
      )

      // All should eventually succeed (Stripe test mode is lenient)
      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach(customer => {
        expect(customer.id).toMatch(/^cus_/)
      })

      // Cleanup
      await Promise.all(results.map(customer =>
        mcpHelper.getStripeClient().customers.del(customer.id).catch(() => {})
      ))
    })

    it('should handle network connectivity issues', async () => {
      // Test with invalid API key to simulate auth errors
      const invalidStripeService = new StripeService(
        {
          get: () => 'sk_' + 'test_' + 'invalid_' + 'key_' + 'G'.repeat(85)
        } as any,
        {
          wrapAsync: async (fn: Function) => await fn(),
          wrapSync: (fn: Function) => fn(),
          executeWithRetry: async (params: any) => await params.execute()
        } as any
      )

      await expect(invalidStripeService.createCustomer({
        email: 'invalid@example.com'
      })).rejects.toThrow()
    })

    it('should handle concurrent subscription operations', async () => {
      const testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      // Create multiple subscriptions concurrently (this should work in test mode)
      const promises = Array.from({ length: 3 }, (_, i) =>
        mcpHelper.createTestSubscription({
          customerId: testCustomer.id,
          priceId: testPrices.STARTER.monthly.id,
          paymentMethodId: testPaymentMethod.id,
          metadata: { concurrencyTest: `subscription-${i}` }
        })
      )

      const subscriptions = await Promise.all(promises)

      expect(subscriptions).toHaveLength(3)
      subscriptions.forEach(subscription => {
        expect(subscription.id).toMatch(/^sub_/)
        expect(subscription.customer).toBe(testCustomer.id)
      })

      // Cancel all subscriptions
      await Promise.all(subscriptions.map(sub =>
        mcpHelper.getStripeClient().subscriptions.cancel(sub.id).catch(() => {})
      ))
    })

    it('should handle subscription with multiple price changes', async () => {
      const testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      // Create initial subscription
      let subscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id
      })

      // Update to GROWTH
      subscription = await mcpHelper.getStripeClient().subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: testPrices.GROWTH.monthly.id
        }],
        proration_behavior: 'create_prorations'
      })

      expect(subscription.items.data[0].price.id).toBe(testPrices.GROWTH.monthly.id)

      // Update to TENANTFLOW_MAX
      subscription = await mcpHelper.getStripeClient().subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: testPrices.TENANTFLOW_MAX.monthly.id
        }],
        proration_behavior: 'create_prorations'
      })

      expect(subscription.items.data[0].price.id).toBe(testPrices.TENANTFLOW_MAX.monthly.id)

      // Verify final state
      const finalSubscription = await stripeService.getSubscription(subscription.id)
      expect(finalSubscription!.items.data[0].price.id).toBe(testPrices.TENANTFLOW_MAX.monthly.id)
    })

    it('should handle webhook event idempotency', async () => {
      const testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      const subscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id
      })

      const { event } = await mcpHelper.simulateWebhookEvent({
        eventType: 'customer.subscription.updated',
        objectId: subscription.id,
        objectType: 'subscription'
      })

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(event)

      // Process the same event multiple times
      await webhookService.handleWebhookEvent(event)
      await webhookService.handleWebhookEvent(event)
      await webhookService.handleWebhookEvent(event)

      // Should only process once (idempotency check)
      expect(prismaService.subscription.findFirst).toHaveBeenCalledTimes(1)
    })
  })

  describe('Complete Payment Flow Scenarios with MCP', () => {
    it('should handle complete subscription lifecycle', async () => {
      const scenario = await mcpHelper.createSubscriptionLifecycleScenario({
        planType: 'GROWTH',
        trialPeriodDays: 14
      })

      // Verify all components were created
      expect(scenario.customer.id).toMatch(/^cus_/)
      expect(scenario.paymentMethod.id).toMatch(/^pm_/)
      expect(scenario.product.id).toMatch(/^prod_/)
      expect(scenario.monthlyPrice.id).toMatch(/^price_/)
      expect(scenario.annualPrice.id).toMatch(/^price_/)
      expect(scenario.subscription.id).toMatch(/^sub_/)
      expect(scenario.checkoutSession.id).toMatch(/^cs_/)

      // Verify subscription is in trial
      expect(scenario.subscription.status).toBe('trialing')
      expect(scenario.subscription.trial_end).toBeDefined()

      // Simulate trial ending by updating subscription
      const updatedSubscription = await mcpHelper.getStripeClient().subscriptions.update(
        scenario.subscription.id,
        { trial_end: 'now' }
      )

      expect(updatedSubscription.status).toMatch(/^(active|past_due)$/)
    })

    it('should handle payment failure scenario', async () => {
      const failureScenario = await mcpHelper.createPaymentFailureScenario({
        failureType: 'CARD_DECLINED',
        amount: 2000
      })

      expect(failureScenario.customer.id).toMatch(/^cus_/)
      expect(failureScenario.paymentMethod.id).toMatch(/^pm_/)
      expect(failureScenario.paymentResult.error).toBeDefined()
      expect(failureScenario.paymentResult.error.type).toBe('StripeCardError')
    })

    it('should handle subscription with coupon application', async () => {
      // Create test coupon
      const coupon = await mcpHelper.getStripeClient().coupons.create({
        id: `test-lifecycle-${Date.now()}`,
        percent_off: 25,
        duration: 'repeating',
        duration_in_months: 3,
        metadata: { testEnvironment: 'true' }
      })

      const testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      // Create subscription with coupon
      const subscription = await mcpHelper.getStripeClient().subscriptions.create({
        customer: testCustomer.id,
        items: [{ price: testPrices.GROWTH.monthly.id }],
        default_payment_method: testPaymentMethod.id,
        coupon: coupon.id,
        metadata: { testEnvironment: 'true' }
      })

      expect(subscription.discount?.coupon?.id).toBe(coupon.id)
      expect(subscription.discount?.coupon?.percent_off).toBe(25)

      // Cleanup
      await mcpHelper.getStripeClient().coupons.del(coupon.id)
    })

    it('should handle subscription upgrade with proration', async () => {
      const testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      // Create STARTER subscription
      const subscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id,
        trialPeriodDays: 0 // No trial for immediate billing
      })

      // Wait a moment for subscription to be active
      await waitForWebhookProcessing(2000)

      // Upgrade to TENANTFLOW_MAX with proration
      const upgradeResult = await stripeBillingService.updateSubscription({
        subscriptionId: subscription.id,
        userId: 'test_user_123',
        newPlanType: 'TENANTFLOW_MAX',
        billingInterval: 'monthly',
        prorationBehavior: 'create_prorations'
      })

      expect(upgradeResult.priceId).toBe(testPrices.TENANTFLOW_MAX.monthly.id)

      // Verify proration invoice was created
      const invoices = await mcpHelper.getStripeClient().invoices.list({
        customer: testCustomer.id,
        subscription: subscription.id,
        limit: 5
      })

      expect(invoices.data.length).toBeGreaterThan(0)

      // Should have line items showing proration
      const latestInvoice = invoices.data[0]
      expect(latestInvoice.lines.data.length).toBeGreaterThan(1) // Original + proration
    })
  })
})
