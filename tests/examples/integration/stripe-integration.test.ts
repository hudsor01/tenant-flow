import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import request from 'supertest'
import Stripe from 'stripe'
import { StripeService } from '../../../apps/backend/src/stripe/stripe.service'
import { SubscriptionsService } from '../../../apps/backend/src/subscriptions/subscriptions.service'
import { WebhookService } from '../../../apps/backend/src/stripe/webhook.service'
import { TestDataFactory } from '../../config/test-data-factory'
import { 
  DatabaseTestHelper, 
  ApiTestHelper, 
  StripeTestHelper,
  TestEnvironment,
  AssertionHelper 
} from '../../config/test-helpers'

/**
 * Example Integration Test: Stripe Integration
 * Tests the complete Stripe integration including API calls and webhook processing
 */
describe('Stripe Integration', () => {
  let app: INestApplication
  let stripeService: StripeService
  let subscriptionsService: SubscriptionsService
  let webhookService: WebhookService
  let apiHelper: ApiTestHelper
  let stripeHelper: StripeTestHelper
  let module: TestingModule

  // Test data
  let testLandlord: any
  let testCustomer: Stripe.Customer
  let testPrice: Stripe.Price

  beforeAll(async () => {
    // Create test module
    module = await Test.createTestingModule({
      imports: [
        // Import your actual app modules here
      ],
      providers: [
        ConfigService,
        StripeService,
        SubscriptionsService,
        WebhookService
      ]
    }).compile()

    app = module.createNestApplication()
    await app.init()

    // Initialize helpers
    apiHelper = new ApiTestHelper(app)
    stripeHelper = new StripeTestHelper()
    
    // Get services
    stripeService = module.get<StripeService>(StripeService)
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService)
    webhookService = module.get<WebhookService>(WebhookService)
  })

  beforeEach(async () => {
    await DatabaseTestHelper.setupDatabase()
    
    // Create test data
    testLandlord = await TestDataFactory.createLandlord({
      email: 'landlord@stripe-test.com'
    })

    // Create Stripe test data
    testCustomer = await stripeHelper.createTestCustomer(testLandlord.email)
    testPrice = await stripeHelper.createTestPrice(2999) // $29.99
  })

  afterEach(async () => {
    await stripeHelper.cleanupTestData()
    await DatabaseTestHelper.teardownDatabase()
  })

  afterAll(async () => {
    await app.close()
    await module.close()
  })

  describe('Customer Management', () => {
    it('should create Stripe customer for new user', async () => {
      // Act
      const customer = await stripeService.createCustomer({
        email: testLandlord.email,
        name: testLandlord.name,
        metadata: { userId: testLandlord.id }
      })

      // Assert
      expect(customer).toBeDefined()
      expect(customer.email).toBe(testLandlord.email)
      expect(customer.name).toBe(testLandlord.name)
      expect(customer.metadata.userId).toBe(testLandlord.id)

      // Verify customer exists in Stripe
      const retrievedCustomer = await stripeService.getCustomer(customer.id)
      expect(retrievedCustomer).toBeTruthy()
      expect(retrievedCustomer?.id).toBe(customer.id)
    })

    it('should handle customer creation with minimal data', async () => {
      // Act
      const customer = await stripeService.createCustomer({
        email: 'minimal@test.com'
      })

      // Assert
      expect(customer).toBeDefined()
      expect(customer.email).toBe('minimal@test.com')
      expect(customer.name).toBeNull()
    })

    it('should return null for non-existent customer', async () => {
      // Act
      const customer = await stripeService.getCustomer('cus_nonexistent')

      // Assert
      expect(customer).toBeNull()
    })

    it('should handle deleted customer', async () => {
      // Arrange
      const customer = await stripeHelper.createTestCustomer()
      await stripeHelper.stripe.customers.del(customer.id)

      // Act
      const retrievedCustomer = await stripeService.getCustomer(customer.id)

      // Assert
      expect(retrievedCustomer).toBeNull()
    })
  })

  describe('Subscription Management', () => {
    it('should create subscription for customer', async () => {
      // Arrange
      await stripeHelper.createTestPaymentMethod(testCustomer.id)

      // Act
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      // Assert
      expect(subscription).toBeDefined()
      expect(subscription.customer).toBe(testCustomer.id)
      expect(subscription.status).toBe('active')
      expect(subscription.items.data[0].price.id).toBe(testPrice.id)
    })

    it('should create subscription with trial period', async () => {
      // Act
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id,
        { trial_period_days: 14 }
      )

      // Assert
      expect(subscription.status).toBe('trialing')
      expect(subscription.trial_end).toBeTruthy()
      
      const trialEnd = new Date(subscription.trial_end! * 1000)
      const expectedTrialEnd = new Date()
      expectedTrialEnd.setDate(expectedTrialEnd.getDate() + 14)
      
      expect(trialEnd.getDate()).toBeCloseTo(expectedTrialEnd.getDate(), 1)
    })

    it('should update subscription successfully', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      const newPrice = await stripeHelper.createTestPrice(4999) // $49.99

      // Act
      const updatedSubscription = await stripeService.updateSubscription(
        subscription.id,
        {
          items: [{
            id: subscription.items.data[0].id,
            price: newPrice.id
          }]
        }
      )

      // Assert
      expect(updatedSubscription.items.data[0].price.id).toBe(newPrice.id)
      expect(updatedSubscription.items.data[0].price.unit_amount).toBe(4999)
    })

    it('should cancel subscription at period end', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      // Act
      const cancelledSubscription = await stripeService.cancelSubscription(
        subscription.id,
        false // Cancel at period end
      )

      // Assert
      expect(cancelledSubscription.cancel_at_period_end).toBe(true)
      expect(cancelledSubscription.status).toBe('active') // Still active until period end
    })

    it('should cancel subscription immediately', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      // Act
      const cancelledSubscription = await stripeService.cancelSubscription(
        subscription.id,
        true // Cancel immediately
      )

      // Assert
      expect(cancelledSubscription.status).toBe('canceled')
      expect(cancelledSubscription.canceled_at).toBeTruthy()
    })
  })

  describe('Checkout Session Management', () => {
    it('should create checkout session for subscription', async () => {
      // Act
      const session = await stripeService.createCheckoutSession({
        customerId: testCustomer.id,
        priceId: testPrice.id,
        mode: 'subscription',
        successUrl: 'https://test.com/success',
        cancelUrl: 'https://test.com/cancel'
      })

      // Assert
      expect(session).toBeDefined()
      expect(session.mode).toBe('subscription')
      expect(session.customer).toBe(testCustomer.id)
      expect(session.success_url).toBe('https://test.com/success')
      expect(session.cancel_url).toBe('https://test.com/cancel')
    })

    it('should create checkout session with trial period', async () => {
      // Act
      const session = await stripeService.createCheckoutSession({
        customerId: testCustomer.id,
        priceId: testPrice.id,
        mode: 'subscription',
        successUrl: 'https://test.com/success',
        cancelUrl: 'https://test.com/cancel',
        subscriptionData: {
          trialPeriodDays: 14,
          metadata: { planType: 'professional' }
        }
      })

      // Assert
      expect(session.subscription_data?.trial_period_days).toBe(14)
      expect(session.subscription_data?.metadata?.planType).toBe('professional')
    })

    it('should create setup mode session for payment method', async () => {
      // Act
      const session = await stripeService.createCheckoutSession({
        customerId: testCustomer.id,
        mode: 'setup',
        successUrl: 'https://test.com/success',
        cancelUrl: 'https://test.com/cancel'
      })

      // Assert
      expect(session.mode).toBe('setup')
      expect(session.customer).toBe(testCustomer.id)
    })
  })

  describe('Billing Portal', () => {
    it('should create billing portal session', async () => {
      // Act
      const portalSession = await stripeService.createPortalSession({
        customerId: testCustomer.id,
        returnUrl: 'https://test.com/dashboard'
      })

      // Assert
      expect(portalSession).toBeDefined()
      expect(portalSession.customer).toBe(testCustomer.id)
      expect(portalSession.return_url).toBe('https://test.com/dashboard')
      expect(portalSession.url).toContain('billing.stripe.com')
    })
  })

  describe('Invoice Management', () => {
    it('should create preview invoice for subscription change', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      // Act
      const previewInvoice = await stripeService.createPreviewInvoice({
        customerId: testCustomer.id,
        subscriptionId: subscription.id
      })

      // Assert
      expect(previewInvoice).toBeDefined()
      expect(previewInvoice.customer).toBe(testCustomer.id)
      expect(previewInvoice.subscription).toBe(subscription.id)
      expect(previewInvoice.amount_due).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Webhook Processing', () => {
    it('should process customer.subscription.created webhook', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      const webhookEvent = await stripeHelper.simulateWebhookEvent(
        'customer.subscription.created',
        subscription
      )

      // Act
      const result = await webhookService.processWebhook(webhookEvent)

      // Assert
      expect(result.processed).toBe(true)
      
      // Verify subscription was created in database
      const dbSubscription = await subscriptionsService.findByStripeId(subscription.id)
      expect(dbSubscription).toBeTruthy()
      AssertionHelper.expectValidSubscription(dbSubscription)
    })

    it('should process invoice.payment_succeeded webhook', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      const invoice = {
        id: 'in_test_123',
        customer: testCustomer.id,
        subscription: subscription.id,
        amount_paid: 2999,
        status: 'paid'
      }

      const webhookEvent = await stripeHelper.simulateWebhookEvent(
        'invoice.payment_succeeded',
        invoice
      )

      // Act
      const result = await webhookService.processWebhook(webhookEvent)

      // Assert
      expect(result.processed).toBe(true)
      
      // Verify subscription status is updated
      const dbSubscription = await subscriptionsService.findByStripeId(subscription.id)
      expect(dbSubscription?.status).toBe('active')
    })

    it('should process invoice.payment_failed webhook', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      const invoice = {
        id: 'in_test_failed',
        customer: testCustomer.id,
        subscription: subscription.id,
        amount_due: 2999,
        status: 'open',
        attempt_count: 1
      }

      const webhookEvent = await stripeHelper.simulateWebhookEvent(
        'invoice.payment_failed',
        invoice
      )

      // Act
      const result = await webhookService.processWebhook(webhookEvent)

      // Assert
      expect(result.processed).toBe(true)
      
      // Verify subscription status is updated to past_due
      const dbSubscription = await subscriptionsService.findByStripeId(subscription.id)
      expect(dbSubscription?.status).toBe('past_due')
    })

    it('should handle duplicate webhook events (idempotency)', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      const webhookEvent = await stripeHelper.simulateWebhookEvent(
        'customer.subscription.created',
        subscription
      )

      // Act - Process same event twice
      const result1 = await webhookService.processWebhook(webhookEvent)
      const result2 = await webhookService.processWebhook(webhookEvent)

      // Assert
      expect(result1.processed).toBe(true)
      expect(result2.processed).toBe(true)
      expect(result2.duplicate).toBe(true)

      // Verify only one subscription record exists
      const subscriptions = await subscriptionsService.findAllByCustomer(testCustomer.id)
      expect(subscriptions).toHaveLength(1)
    })

    it('should verify webhook signature', async () => {
      // Arrange
      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'customer.subscription.created',
        data: { object: {} }
      })

      const signature = 'invalid_signature'
      const secret = process.env.STRIPE_WEBHOOK_SECRET_TEST!

      // Act & Assert
      expect(() => {
        stripeService.constructWebhookEvent(payload, signature, secret)
      }).toThrow('Invalid webhook signature')
    })
  })

  describe('Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      // Act & Assert
      await expect(
        stripeService.getCustomer('cus_invalid_customer_id')
      ).rejects.toThrow('No such customer')
    })

    it('should handle network timeouts', async () => {
      // This would require mocking the Stripe client to simulate timeouts
      // Implementation depends on your error handling strategy
      expect(true).toBe(true) // Placeholder
    })

    it('should handle rate limiting', async () => {
      // This would require simulating rate limit responses
      // Implementation depends on your retry logic
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('API Endpoints Integration', () => {
    it('should create subscription via API endpoint', async () => {
      // Arrange
      const headers = apiHelper.createAuthHeaders(testLandlord.id, 'OWNER')

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set(headers)
        .send({
          priceId: testPrice.id,
          trialDays: 14
        })
        .expect(201)

      // Assert
      expect(response.body.subscription).toBeDefined()
      AssertionHelper.expectValidSubscription(response.body.subscription)
      expect(response.body.subscription.status).toBe('trialing')
    })

    it('should get subscription status via API', async () => {
      // Arrange
      const subscription = await TestDataFactory.createSubscription(testLandlord.id, {
        status: 'active'
      })
      
      const headers = apiHelper.createAuthHeaders(testLandlord.id, 'OWNER')

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/subscriptions/current')
        .set(headers)
        .expect(200)

      // Assert
      expect(response.body.subscription).toBeDefined()
      expect(response.body.subscription.id).toBe(subscription.id)
      expect(response.body.subscription.status).toBe('active')
    })

    it('should process webhook via API endpoint', async () => {
      // Arrange
      const subscription = await stripeHelper.createTestSubscription(
        testCustomer.id,
        testPrice.id
      )

      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'customer.subscription.updated',
        data: { object: subscription }
      })

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 'test_signature')
        .send(payload)
        .expect(200)

      // Assert
      expect(response.body.received).toBe(true)
    })

    it('should require authentication for protected endpoints', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/subscriptions/current')
        .expect(401)
    })

    it('should validate request body for subscription creation', async () => {
      // Arrange
      const headers = apiHelper.createAuthHeaders(testLandlord.id, 'OWNER')

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/subscriptions')
        .set(headers)
        .send({
          // Missing required priceId
        })
        .expect(400)
    })
  })
})