import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { StripeService } from '../../../apps/backend/src/stripe/stripe.service'
import { StripeBillingService } from '../../../apps/backend/src/stripe/stripe-billing.service'
import { WebhookService } from '../../../apps/backend/src/stripe/webhook.service'
import { SubscriptionsManagerService } from '../../../apps/backend/src/subscriptions/subscriptions-manager.service'
import { PrismaService } from '../../../apps/backend/src/prisma/prisma.service'
import { ErrorHandlerService } from '../../../apps/backend/src/common/errors/error-handler.service'
import { MCPStripeTestHelper, createMCPStripeHelper, waitForWebhookProcessing } from '../test-utilities/mcp-stripe-helpers'
import type { PlanType } from '@repo/database'
import type Stripe from 'stripe'

/**
 * End-to-End Stripe Payment Flow Tests
 *
 * These tests simulate complete user journeys through the payment system,
 * from signup to subscription management, using real Stripe API calls
 * through the MCP server.
 */
describe('Stripe Payment Flows E2E Tests', () => {
  let app: TestingModule
  let stripeService: StripeService
  let stripeBillingService: StripeBillingService
  let webhookService: WebhookService
  let subscriptionsManager: SubscriptionsManagerService
  let prismaService: PrismaService
  let mcpHelper: MCPStripeTestHelper
  let cleanup: () => Promise<void>

  // Test infrastructure
  let testPrices: Record<string, { monthly: Stripe.Price; annual: Stripe.Price }>
  let testProducts: Record<string, Stripe.Product>
  let webhookSecret: string

  beforeAll(async () => {
    // Skip E2E tests if MCP Stripe is not configured
    if (!process.env.STRIPE_TEST_SECRET_KEY) {
      console.log('⚠️  Skipping Stripe E2E tests - STRIPE_TEST_SECRET_KEY not configured')
      return
    }

    // Initialize MCP Stripe helper
    const mcpSetup = createMCPStripeHelper()
    mcpHelper = mcpSetup.helper
    cleanup = mcpSetup.cleanup

    webhookSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET || 'whsec_test_secret'

    // Create comprehensive test module
    app = await Test.createTestingModule({
      providers: [
        StripeService,
        StripeBillingService,
        WebhookService,
        SubscriptionsManagerService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'STRIPE_SECRET_KEY': process.env.STRIPE_TEST_SECRET_KEY,
                'STRIPE_PUBLISHABLE_KEY': process.env.STRIPE_TEST_PUBLISHABLE_KEY,
                'STRIPE_WEBHOOK_SECRET': webhookSecret
              }
              return config[key]
            }
          }
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn()
            },
            subscription: {
              findFirst: vi.fn(),
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              updateMany: vi.fn(),
              upsert: vi.fn()
            },
            property: {
              count: vi.fn().mockResolvedValue(0)
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

    // Get service instances
    stripeService = app.get<StripeService>(StripeService)
    stripeBillingService = app.get<StripeBillingService>(StripeBillingService)
    webhookService = app.get<WebhookService>(WebhookService)
    subscriptionsManager = app.get<SubscriptionsManagerService>(SubscriptionsManagerService)
    prismaService = app.get<PrismaService>(PrismaService)

    // Create test data infrastructure
    const planSetup = await mcpHelper.createTestPlanPrices()
    testPrices = planSetup.prices
    testProducts = planSetup.products

    console.log('✅ Stripe E2E test setup complete')
  })

  afterAll(async () => {
    if (cleanup && mcpHelper) {
      await cleanup()
      console.log('✅ Stripe E2E test cleanup complete')
    }

    if (app) {
      await app.close()
    }
  })

  beforeEach(() => {
    // Reset all mocks between tests
    vi.clearAllMocks()
  })

  describe('Complete New User Subscription Journey', () => {
    it('should handle new user signup with free trial', async () => {
      const userId = `e2e_user_${Date.now()}`
      const userEmail = `e2e-test-${Date.now()}@example.com`

      // Mock user data
      const mockUser = {
        id: userId,
        email: userEmail,
        name: 'E2E Test User',
        Subscription: []
      }

      vi.mocked(prismaService.user.findUnique).mockResolvedValue(mockUser as any)
      vi.mocked(prismaService.subscription.upsert).mockResolvedValue({
        id: 'sub_db_123',
        userId,
        planType: 'STARTER',
        status: 'TRIALING'
      } as any)

      // Step 1: Create customer and subscription with trial
      const subscriptionResult = await stripeBillingService.createSubscription({
        userId,
        planType: 'STARTER',
        billingInterval: 'monthly',
        trialDays: 14
      })

      expect(subscriptionResult.subscriptionId).toMatch(/^sub_/)
      expect(subscriptionResult.status).toMatch(/^(trialing|active|incomplete)$/)

      // Step 2: Verify subscription in Stripe
      const stripeSubscription = await stripeService.getSubscription(
        subscriptionResult.subscriptionId
      )

      expect(stripeSubscription).toBeDefined()
      expect(stripeSubscription!.status).toMatch(/^(trialing|active|incomplete)$/)

      if (stripeSubscription!.trial_end) {
        const trialEndDate = new Date(stripeSubscription!.trial_end * 1000)
        const now = new Date()
        const daysDifference = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        expect(daysDifference).toBeGreaterThanOrEqual(13) // Allow for timing differences
        expect(daysDifference).toBeLessThanOrEqual(15)
      }

      // Step 3: Simulate trial ending - add payment method
      const customer = await stripeService.getCustomer(subscriptionResult.customerId)
      expect(customer).toBeDefined()

      const paymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: customer!.id
      })

      // Step 4: Update subscription with payment method before trial ends
      await mcpHelper.getStripeClient().customers.update(customer!.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id
        }
      })

      // Step 5: Simulate trial end by updating the subscription
      const updatedSubscription = await mcpHelper.getStripeClient().subscriptions.update(
        subscriptionResult.subscriptionId,
        { trial_end: 'now' }
      )

      expect(updatedSubscription.status).toMatch(/^(active|past_due)$/)

      console.log('✅ New user subscription journey completed successfully')
    })

    it('should handle new user checkout session flow', async () => {
      const userId = `e2e_checkout_${Date.now()}`
      const userEmail = `e2e-checkout-${Date.now()}@example.com`

      const mockUser = {
        id: userId,
        email: userEmail,
        name: 'E2E Checkout User',
        Subscription: []
      }

      vi.mocked(prismaService.user.findUnique).mockResolvedValue(mockUser as any)

      // Step 1: Create checkout session
      const checkoutResult = await stripeBillingService.createCheckoutSession({
        userId,
        planType: 'GROWTH',
        billingInterval: 'annual',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      })

      expect(checkoutResult.sessionId).toMatch(/^cs_/)
      expect(checkoutResult.url).toMatch(/^https:\/\/checkout\.stripe\.com/)

      // Step 2: Verify checkout session details
      const session = await mcpHelper.getStripeClient().checkout.sessions.retrieve(
        checkoutResult.sessionId,
        { expand: ['line_items', 'subscription_data'] }
      )

      expect(session.mode).toBe('subscription')
      expect(session.line_items?.data?.[0]?.price).toBe(testPrices.GROWTH.annual.id)
      expect(session.subscription_data?.trial_period_days).toBe(14)
      expect(session.subscription_data?.metadata?.userId).toBe(userId)
      expect(session.subscription_data?.metadata?.planType).toBe('GROWTH')

      console.log('✅ Checkout session flow completed successfully')
    })
  })

  describe('Subscription Management Journey', () => {
    let testCustomer: Stripe.Customer
    let testPaymentMethod: Stripe.PaymentMethod
    let activeSubscription: Stripe.Subscription

    beforeEach(async () => {
      // Create test customer and payment method for each test
      testCustomer = await mcpHelper.createTestCustomer({
        email: `sub-mgmt-${Date.now()}@example.com`,
        name: 'Subscription Management Test User'
      })

      testPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      activeSubscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: testPaymentMethod.id,
        trialPeriodDays: 0 // Start active immediately
      })

      // Wait for subscription to be processed
      await waitForWebhookProcessing(1000)
    })

    it('should handle subscription upgrade flow', async () => {
      const userId = `e2e_upgrade_${Date.now()}`

      vi.mocked(prismaService.subscription.updateMany).mockResolvedValue({ count: 1 })

      // Step 1: Upgrade from STARTER to GROWTH
      const upgradeResult = await stripeBillingService.updateSubscription({
        subscriptionId: activeSubscription.id,
        userId,
        newPlanType: 'GROWTH',
        billingInterval: 'monthly',
        prorationBehavior: 'create_prorations'
      })

      expect(upgradeResult.subscriptionId).toBe(activeSubscription.id)
      expect(upgradeResult.priceId).toBe(testPrices.GROWTH.monthly.id)
      expect(upgradeResult.status).toMatch(/^(active|incomplete)$/)

      // Step 2: Verify upgrade in Stripe
      const upgradedSubscription = await stripeService.getSubscription(activeSubscription.id)
      expect(upgradedSubscription!.items.data[0].price.id).toBe(testPrices.GROWTH.monthly.id)

      // Step 3: Check for proration invoice
      const invoices = await mcpHelper.getStripeClient().invoices.list({
        customer: testCustomer.id,
        subscription: activeSubscription.id,
        limit: 3
      })

      expect(invoices.data.length).toBeGreaterThan(0)

      // Should have proration line items
      const latestInvoice = invoices.data[0]
      expect(latestInvoice.lines.data.length).toBeGreaterThan(1)

      // Step 4: Upgrade to annual billing
      const annualUpgrade = await stripeBillingService.updateSubscription({
        subscriptionId: activeSubscription.id,
        userId,
        newPlanType: 'GROWTH',
        billingInterval: 'annual',
        prorationBehavior: 'create_prorations'
      })

      expect(annualUpgrade.priceId).toBe(testPrices.GROWTH.annual.id)

      console.log('✅ Subscription upgrade flow completed successfully')
    })

    it('should handle subscription downgrade flow', async () => {
      const userId = `e2e_downgrade_${Date.now()}`

      // Start with TENANTFLOW_MAX subscription
      const tenantflow_maxSubscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.TENANTFLOW_MAX.monthly.id,
        paymentMethodId: testPaymentMethod.id,
        trialPeriodDays: 0
      })

      vi.mocked(prismaService.subscription.updateMany).mockResolvedValue({ count: 1 })

      // Step 1: Downgrade to STARTER
      const downgradeResult = await stripeBillingService.updateSubscription({
        subscriptionId: tenantflow_maxSubscription.id,
        userId,
        newPlanType: 'STARTER',
        billingInterval: 'monthly',
        prorationBehavior: 'create_prorations'
      })

      expect(downgradeResult.priceId).toBe(testPrices.STARTER.monthly.id)

      // Step 2: Verify downgrade created credit for overpayment
      const invoices = await mcpHelper.getStripeClient().invoices.list({
        customer: testCustomer.id,
        subscription: tenantflow_maxSubscription.id,
        limit: 3
      })

      const prorationInvoice = invoices.data.find(inv =>
        inv.lines.data.some(line => line.amount < 0) // Credit line item
      )

      expect(prorationInvoice).toBeDefined()

      console.log('✅ Subscription downgrade flow completed successfully')
    })

    it('should handle subscription cancellation flow', async () => {
      const userId = `e2e_cancel_${Date.now()}`

      vi.mocked(prismaService.subscription.updateMany).mockResolvedValue({ count: 1 })

      // Step 1: Cancel at period end
      const cancelResult = await stripeBillingService.cancelSubscription({
        subscriptionId: activeSubscription.id,
        userId,
        cancellationReason: 'user_requested'
      })

      expect(cancelResult.status).toBe('active') // Still active until period end
      expect(cancelResult.canceledAt).toBeUndefined()

      // Step 2: Verify cancellation scheduled in Stripe
      const scheduledCancellation = await stripeService.getSubscription(activeSubscription.id)
      expect(scheduledCancellation!.cancel_at_period_end).toBe(true)
      expect(scheduledCancellation!.status).toBe('active')

      // Step 3: Test immediate cancellation
      const immediateCancelResult = await stripeBillingService.cancelSubscription({
        subscriptionId: activeSubscription.id,
        userId,
        immediately: true,
        cancellationReason: 'user_requested_immediate'
      })

      expect(immediateCancelResult.status).toBe('canceled')
      expect(immediateCancelResult.canceledAt).toBeDefined()

      // Step 4: Verify immediate cancellation in Stripe
      const canceledSubscription = await stripeService.getSubscription(activeSubscription.id)
      expect(canceledSubscription!.status).toBe('canceled')
      expect(canceledSubscription!.canceled_at).toBeDefined()

      console.log('✅ Subscription cancellation flow completed successfully')
    })

    it('should handle subscription reactivation flow', async () => {
      const userId = `e2e_reactivate_${Date.now()}`

      // Step 1: Pause subscription (simulate trial ended without payment)
      const pausedSubscription = await mcpHelper.getStripeClient().subscriptions.update(
        activeSubscription.id,
        {
          pause_collection: {
            behavior: 'void'
          }
        }
      )

      expect(pausedSubscription.pause_collection).toBeDefined()

      // Step 2: Mock user lookup
      vi.mocked(prismaService.user.findUnique).mockResolvedValue({
        id: userId,
        email: testCustomer.email,
        name: testCustomer.name,
        Subscription: [{ stripeCustomerId: testCustomer.id }]
      } as any)

      vi.mocked(prismaService.subscription.updateMany).mockResolvedValue({ count: 1 })

      // Step 3: Reactivate with new payment method
      const newPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      const reactivateResult = await stripeBillingService.reactivateSubscription({
        userId,
        subscriptionId: activeSubscription.id,
        paymentMethodId: newPaymentMethod.id
      })

      expect(reactivateResult.status).toMatch(/^(active|incomplete)$/)

      // Step 4: Verify reactivation in Stripe
      const reactivatedSubscription = await stripeService.getSubscription(activeSubscription.id)
      expect(reactivatedSubscription!.pause_collection).toBeNull()
      expect(reactivatedSubscription!.default_payment_method).toBe(newPaymentMethod.id)

      console.log('✅ Subscription reactivation flow completed successfully')
    })
  })

  describe('Payment Processing Journey', () => {
    let testCustomer: Stripe.Customer

    beforeEach(async () => {
      testCustomer = await mcpHelper.createTestCustomer({
        email: `payment-${Date.now()}@example.com`,
        name: 'Payment Test User'
      })
    })

    it('should handle successful payment flow', async () => {
      // Step 1: Create payment method
      const paymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      // Step 2: Create payment intent
      const paymentIntent = await mcpHelper.createTestPaymentIntent({
        amount: 2500, // $25.00
        customerId: testCustomer.id,
        paymentMethodId: paymentMethod.id,
        confirmImmediately: true
      })

      expect(paymentIntent.id).toMatch(/^pi_/)
      expect(paymentIntent.amount).toBe(2500)
      expect(paymentIntent.status).toMatch(/^(succeeded|requires_payment_method|processing)$/)

      console.log('✅ Successful payment flow completed')
    })

    it('should handle payment failure scenarios', async () => {
      const failureScenarios = [
        { type: 'CARD_DECLINED', expectedError: 'card_error' },
        { type: 'INSUFFICIENT_FUNDS', expectedError: 'card_error' },
        { type: 'EXPIRED_CARD', expectedError: 'card_error' }
      ] as const

      for (const scenario of failureScenarios) {
        const { paymentResult } = await mcpHelper.createPaymentFailureScenario({
          failureType: scenario.type,
          amount: 1500
        })

        expect(paymentResult.error).toBeDefined()
        expect(paymentResult.error.type).toMatch(/card_error|invalid_request_error/)
      }

      console.log('✅ Payment failure scenarios completed')
    })

    it('should handle recurring payment flow', async () => {
      const userId = `e2e_recurring_${Date.now()}`

      // Mock user
      vi.mocked(prismaService.user.findUnique).mockResolvedValue({
        id: userId,
        email: testCustomer.email,
        name: testCustomer.name,
        Subscription: []
      } as any)

      vi.mocked(prismaService.subscription.upsert).mockResolvedValue({
        id: 'sub_db_123',
        userId,
        planType: 'GROWTH',
        status: 'ACTIVE'
      } as any)

      // Step 1: Create subscription (sets up recurring billing)
      const paymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      const subscriptionResult = await stripeBillingService.createSubscription({
        userId,
        planType: 'GROWTH',
        billingInterval: 'monthly',
        paymentMethodId: paymentMethod.id,
        trialDays: 0 // No trial for immediate billing
      })

      // Step 2: Verify initial invoice was created and paid
      const invoices = await mcpHelper.getStripeClient().invoices.list({
        customer: testCustomer.id,
        subscription: subscriptionResult.subscriptionId,
        limit: 5
      })

      expect(invoices.data.length).toBeGreaterThan(0)

      const initialInvoice = invoices.data[0]
      expect(initialInvoice.status).toMatch(/^(paid|draft|open)$/)
      expect(initialInvoice.amount_due).toBeGreaterThan(0)

      console.log('✅ Recurring payment flow setup completed')
    })
  })

  describe('Webhook Processing Journey', () => {
    let testCustomer: Stripe.Customer
    let testSubscription: Stripe.Subscription

    beforeEach(async () => {
      testCustomer = await mcpHelper.createTestCustomer({
        email: `webhook-${Date.now()}@example.com`,
        name: 'Webhook Test User'
      })

      const paymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      testSubscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: paymentMethod.id
      })

      // Mock database operations
      vi.mocked(prismaService.subscription.findFirst).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'webhook_user_123',
        stripeCustomerId: testCustomer.id,
        User: {
          id: 'webhook_user_123',
          email: testCustomer.email,
          name: testCustomer.name
        }
      } as any)
    })

    it('should process complete subscription lifecycle webhooks', async () => {
      // Step 1: Process subscription created webhook
      const { event: createdEvent } = await mcpHelper.simulateWebhookEvent({
        eventType: 'customer.subscription.created',
        objectId: testSubscription.id,
        objectType: 'subscription'
      })

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(createdEvent)
      vi.mocked(prismaService.subscription.update).mockResolvedValue({ id: 'sub_db_123' } as any)

      await webhookService.handleWebhookEvent(createdEvent)

      expect(prismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { stripeCustomerId: testCustomer.id }
      })

      // Step 2: Process subscription updated webhook (status change)
      const { event: updatedEvent } = await mcpHelper.simulateWebhookEvent({
        eventType: 'customer.subscription.updated',
        objectId: testSubscription.id,
        objectType: 'subscription',
        additionalData: {
          status: 'active',
          previous_attributes: { status: 'trialing' }
        }
      })

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(updatedEvent)

      await webhookService.handleWebhookEvent(updatedEvent)

      // Step 3: Process payment succeeded webhook
      const invoice = await mcpHelper.createTestInvoice({
        customerId: testCustomer.id,
        subscriptionId: testSubscription.id
      })

      const { event: paymentSucceededEvent } = await mcpHelper.simulateWebhookEvent({
        eventType: 'invoice.payment_succeeded',
        objectId: invoice.id,
        objectType: 'invoice',
        additionalData: {
          subscription: testSubscription.id
        }
      })

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(paymentSucceededEvent)

      await webhookService.handleWebhookEvent(paymentSucceededEvent)

      expect(prismaService.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: testSubscription.id },
        data: { status: 'ACTIVE' }
      })

      // Step 4: Process subscription deleted webhook
      const { event: deletedEvent } = await mcpHelper.simulateWebhookEvent({
        eventType: 'customer.subscription.deleted',
        objectId: testSubscription.id,
        objectType: 'subscription'
      })

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(deletedEvent)
      vi.mocked(prismaService.subscription.updateMany).mockResolvedValue({ count: 1 })

      await webhookService.handleWebhookEvent(deletedEvent)

      expect(prismaService.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: testSubscription.id },
        data: {
          status: 'CANCELED',
          cancelAtPeriodEnd: false,
          canceledAt: expect.any(Date)
        }
      })

      console.log('✅ Complete webhook lifecycle processing completed')
    })

    it('should handle webhook event failures and retries', async () => {
      // Simulate database error on first attempt
      vi.mocked(prismaService.subscription.update)
        .mockRejectedValueOnce(new Error('Database temporarily unavailable'))
        .mockResolvedValueOnce({ id: 'sub_db_123' } as any)

      const { event } = await mcpHelper.simulateWebhookEvent({
        eventType: 'customer.subscription.updated',
        objectId: testSubscription.id,
        objectType: 'subscription'
      })

      vi.spyOn(stripeService, 'constructWebhookEvent').mockReturnValue(event)

      // First attempt should fail
      await expect(webhookService.handleWebhookEvent(event)).rejects.toThrow(
        'Database temporarily unavailable'
      )

      // Second attempt should succeed
      await webhookService.handleWebhookEvent(event)

      expect(prismaService.subscription.update).toHaveBeenCalledTimes(2)

      console.log('✅ Webhook failure and retry handling completed')
    })
  })

  describe('Customer Portal Integration Journey', () => {
    let testCustomer: Stripe.Customer
    let activeSubscription: Stripe.Subscription

    beforeEach(async () => {
      testCustomer = await mcpHelper.createTestCustomer({
        email: `portal-${Date.now()}@example.com`,
        name: 'Portal Test User'
      })

      const paymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      activeSubscription = await mcpHelper.createTestSubscription({
        customerId: testCustomer.id,
        priceId: testPrices.STARTER.monthly.id,
        paymentMethodId: paymentMethod.id
      })
    })

    it('should create customer portal session for subscription management', async () => {
      const userId = `e2e_portal_${Date.now()}`

      // Mock user with subscription
      vi.mocked(prismaService.user.findUnique).mockResolvedValue({
        id: userId,
        email: testCustomer.email,
        name: testCustomer.name,
        Subscription: [{ stripeCustomerId: testCustomer.id }]
      } as any)

      // Step 1: Create portal session
      const portalResult = await stripeBillingService.createCustomerPortalSession({
        userId,
        returnUrl: 'https://example.com/account/billing'
      })

      expect(portalResult.url).toMatch(/^https:\/\/billing\.stripe\.com/)

      // Step 2: Verify portal session is accessible (we can't actually navigate to it in tests)
      // But we can verify the URL structure is correct
      const urlParts = new URL(portalResult.url)
      expect(urlParts.hostname).toBe('billing.stripe.com')
      expect(urlParts.pathname).toMatch(/^\/session\/bps_/)

      console.log('✅ Customer portal session creation completed')
    })
  })

  describe('Error Recovery and Edge Cases Journey', () => {
    it('should handle partial payment failures with recovery', async () => {
      const testCustomer = await mcpHelper.createTestCustomer({
        email: `recovery-${Date.now()}@example.com`,
        name: 'Recovery Test User'
      })

      // Step 1: Attempt subscription with declined card
      const declinedPaymentMethod = await mcpHelper.createDeclinedPaymentMethod('CARD_DECLINED')

      await mcpHelper.getStripeClient().paymentMethods.attach(declinedPaymentMethod.id, {
        customer: testCustomer.id
      })

      let subscription: Stripe.Subscription
      try {
        subscription = await mcpHelper.createTestSubscription({
          customerId: testCustomer.id,
          priceId: testPrices.STARTER.monthly.id,
          paymentMethodId: declinedPaymentMethod.id,
          trialPeriodDays: 0
        })
      } catch (error) {
        // Create subscription without payment method to simulate incomplete state
        subscription = await mcpHelper.createTestSubscription({
          customerId: testCustomer.id,
          priceId: testPrices.STARTER.monthly.id,
          trialPeriodDays: 0
        })
      }

      // Step 2: Verify subscription is in incomplete state
      const incompleteSubscription = await stripeService.getSubscription(subscription.id)
      expect(incompleteSubscription!.status).toMatch(/^(incomplete|past_due)$/)

      // Step 3: Add valid payment method for recovery
      const validPaymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      // Step 4: Update subscription with valid payment method
      await mcpHelper.getStripeClient().subscriptions.update(subscription.id, {
        default_payment_method: validPaymentMethod.id
      })

      // Step 5: Retry the latest invoice
      const invoices = await mcpHelper.getStripeClient().invoices.list({
        customer: testCustomer.id,
        subscription: subscription.id,
        limit: 1
      })

      if (invoices.data.length > 0) {
        const latestInvoice = invoices.data[0]
        if (latestInvoice.status === 'open') {
          try {
            await mcpHelper.getStripeClient().invoices.pay(latestInvoice.id)
          } catch (error) {
            // May still fail in test mode, but that's expected
          }
        }
      }

      // Step 6: Verify recovery attempt was made
      const recoveredSubscription = await stripeService.getSubscription(subscription.id)
      expect(recoveredSubscription!.default_payment_method).toBe(validPaymentMethod.id)

      console.log('✅ Payment failure recovery flow completed')
    })

    it('should handle concurrent operations gracefully', async () => {
      const testCustomer = await mcpHelper.createTestCustomer({
        email: `concurrent-${Date.now()}@example.com`,
        name: 'Concurrent Test User'
      })

      const paymentMethod = await mcpHelper.createTestPaymentMethod({
        customerId: testCustomer.id
      })

      // Step 1: Create multiple subscriptions concurrently
      const concurrentPromises = [
        mcpHelper.createTestSubscription({
          customerId: testCustomer.id,
          priceId: testPrices.STARTER.monthly.id,
          paymentMethodId: paymentMethod.id,
          metadata: { test: 'concurrent-1' }
        }),
        mcpHelper.createTestSubscription({
          customerId: testCustomer.id,
          priceId: testPrices.GROWTH.monthly.id,
          paymentMethodId: paymentMethod.id,
          metadata: { test: 'concurrent-2' }
        }),
        mcpHelper.createTestSubscription({
          customerId: testCustomer.id,
          priceId: testPrices.TENANTFLOW_MAX.monthly.id,
          paymentMethodId: paymentMethod.id,
          metadata: { test: 'concurrent-3' }
        })
      ]

      const subscriptions = await Promise.all(concurrentPromises)

      expect(subscriptions).toHaveLength(3)
      subscriptions.forEach((sub, index) => {
        expect(sub.id).toMatch(/^sub_/)
        expect(sub.customer).toBe(testCustomer.id)
        expect(sub.metadata?.test).toBe(`concurrent-${index + 1}`)
      })

      // Step 2: Cancel all subscriptions concurrently
      const cancelPromises = subscriptions.map(sub =>
        mcpHelper.getStripeClient().subscriptions.cancel(sub.id)
      )

      const canceledSubscriptions = await Promise.all(cancelPromises)
      canceledSubscriptions.forEach(sub => {
        expect(sub.status).toBe('canceled')
      })

      console.log('✅ Concurrent operations handling completed')
    })
  })
})
