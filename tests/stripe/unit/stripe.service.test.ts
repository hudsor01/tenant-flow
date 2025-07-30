import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { StripeService } from '../../../apps/backend/src/stripe/stripe.service'
import { StripeErrorHandler } from '../../../apps/backend/src/stripe/stripe-error.handler'
import { STRIPE_ERROR_CODES } from '@tenantflow/shared/types/stripe'
import { createMockStripeCustomer, createMockStripeSubscription, createMockStripeCheckoutSession } from '../test-data/stripe-factories'

// Mock Stripe SDK with comprehensive test scenarios
const mockStripe = {
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    del: vi.fn()
  },
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn()
    }
  },
  billingPortal: {
    sessions: {
      create: vi.fn()
    }
  },
  subscriptions: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    list: vi.fn()
  },
  invoices: {
    create: vi.fn(),
    createPreview: vi.fn(),
    retrieve: vi.fn(),
    list: vi.fn(),
    pay: vi.fn(),
    voidInvoice: vi.fn()
  },
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn()
  },
  paymentMethods: {
    create: vi.fn(),
    retrieve: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    list: vi.fn()
  },
  setupIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn()
  },
  prices: {
    retrieve: vi.fn(),
    list: vi.fn()
  },
  products: {
    retrieve: vi.fn(),
    list: vi.fn()
  },
  webhooks: {
    constructEvent: vi.fn()
  },
  // Test card tokens for different scenarios
  testHelpers: {
    testClocks: {
      create: vi.fn(),
      advance: vi.fn()
    }
  }
} as any

// Mock Stripe constructor with comprehensive error scenarios
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => mockStripe),
    errors: {
      StripeError: class extends Error {
        constructor(message: string, public type: string, public code?: string, public decline_code?: string) {
          super(message)
          this.name = 'StripeError'
        }
      },
      StripeCardError: class extends Error {
        constructor(message: string, public decline_code?: string, public payment_intent?: any) {
          super(message)
          this.name = 'StripeCardError'
          this.type = 'StripeCardError'
        }
      },
      StripeInvalidRequestError: class extends Error {
        constructor(message: string, public param?: string) {
          super(message)
          this.name = 'StripeInvalidRequestError'
          this.type = 'StripeInvalidRequestError'
        }
      },
      StripeAPIError: class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'StripeAPIError' 
          this.type = 'StripeAPIError'
        }
      },
      StripeConnectionError: class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'StripeConnectionError'
          this.type = 'StripeConnectionError'
        }
      },
      StripeAuthenticationError: class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'StripeAuthenticationError'
          this.type = 'StripeAuthenticationError'
        }
      },
      StripePermissionError: class extends Error {
        constructor(message: string) {     
          super(message)
          this.name = 'StripePermissionError'
          this.type = 'StripePermissionError'
        }
      },
      StripeRateLimitError: class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'StripeRateLimitError'
          this.type = 'StripeRateLimitError'
        }
      },
      StripeIdempotencyError: class extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'StripeIdempotencyError'
          this.type = 'StripeIdempotencyError'
        }
      }
    }
  }
})

// Mock dependencies
const mockConfigService = {
  get: vi.fn()
} as any

const mockErrorHandler = {
  wrapAsync: vi.fn(),
  wrapSync: vi.fn(),
  executeWithRetry: vi.fn()
} as any

describe('StripeService - Comprehensive Unit Tests', () => {
  let stripeService: StripeService
  let configService: ConfigService
  let errorHandler: StripeErrorHandler

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup config service with comprehensive test configuration
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'STRIPE_SECRET_KEY': 'sk_test_123456789abcdef',
        'STRIPE_PUBLISHABLE_KEY': 'pk_test_123456789abcdef',
        'STRIPE_WEBHOOK_SECRET': 'whsec_123456789abcdef',
        'STRIPE_API_VERSION': '2024-06-20'
      }
      return config[key]
    })

    // Setup error handler with comprehensive error scenarios
    mockErrorHandler.wrapAsync.mockImplementation(async (operation: Function) => {
      return await operation()
    })
    
    mockErrorHandler.wrapSync.mockImplementation((operation: Function) => {
      return operation()
    })

    mockErrorHandler.executeWithRetry.mockImplementation(async (params: any) => {
      return await params.execute()
    })

    configService = mockConfigService
    errorHandler = mockErrorHandler
    
    stripeService = new StripeService(configService, errorHandler)

    // Mock Logger to prevent console output during tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Initialization and Configuration', () => {
    it('should initialize without creating Stripe instance immediately', () => {
      expect(stripeService).toBeDefined()
      expect(vi.mocked(Stripe)).not.toHaveBeenCalled()
    })

    it('should throw error when STRIPE_SECRET_KEY is missing', () => {
      mockConfigService.get.mockReturnValue(undefined)
      
      expect(() => stripeService.client).toThrow('Missing STRIPE_SECRET_KEY')
    })

    it('should throw error when STRIPE_SECRET_KEY is empty string', () => {
      mockConfigService.get.mockReturnValue('')
      
      expect(() => stripeService.client).toThrow('Missing STRIPE_SECRET_KEY')
    })

    it('should create Stripe instance with correct configuration', () => {
      const client = stripeService.client

      expect(vi.mocked(Stripe)).toHaveBeenCalledWith('sk_test_123456789abcdef', {
        apiVersion: '2025-06-30.basil',
        typescript: true
      })
      expect(client).toBeDefined()
    })

    it('should reuse Stripe instance on subsequent calls', () => {
      const client1 = stripeService.client
      const client2 = stripeService.client
      const client3 = stripeService.client

      expect(vi.mocked(Stripe)).toHaveBeenCalledTimes(1)
      expect(client1).toBe(client2)
      expect(client2).toBe(client3)
    })

    it('should handle invalid secret key format', () => {
      mockConfigService.get.mockReturnValue('invalid_key_format')
      
      // Should still create instance but may fail on API calls
      expect(() => stripeService.client).not.toThrow()
    })
  })

  describe('Customer Management', () => {
    const customerParams = {
      email: 'customer@example.com',
      name: 'Test Customer',
      metadata: { userId: 'user123', source: 'website' }
    }

    describe('createCustomer', () => {
      it('should create customer successfully with all parameters', async () => {
        const mockCustomer = createMockStripeCustomer({
          email: customerParams.email,
          name: customerParams.name,
          metadata: customerParams.metadata
        })
        mockStripe.customers.create.mockResolvedValue(mockCustomer)

        const result = await stripeService.createCustomer(customerParams)

        expect(mockErrorHandler.wrapAsync).toHaveBeenCalledWith(
          expect.any(Function),
          {
            operation: 'createCustomer',
            resource: 'customer',
            metadata: { email: customerParams.email }
          }
        )
        expect(mockStripe.customers.create).toHaveBeenCalledWith({
          email: customerParams.email,
          name: customerParams.name,
          metadata: customerParams.metadata
        })
        expect(result).toEqual(mockCustomer)
      })

      it('should create customer with minimal required data', async () => {
        const minimalParams = { email: 'minimal@example.com' }
        const mockCustomer = createMockStripeCustomer({ email: minimalParams.email })
        mockStripe.customers.create.mockResolvedValue(mockCustomer)

        const result = await stripeService.createCustomer(minimalParams)

        expect(mockStripe.customers.create).toHaveBeenCalledWith({
          email: minimalParams.email,
          name: undefined,
          metadata: undefined
        })
        expect(result).toEqual(mockCustomer)
      })

      it('should handle customer creation with large metadata', async () => {
        const largeMetadata: Record<string, string> = {}
        for (let i = 0; i < 50; i++) {
          largeMetadata[`key${i}`] = `value${i}`.repeat(50)
        }

        const paramsWithLargeMetadata = {
          ...customerParams,
          metadata: largeMetadata
        }
        const mockCustomer = createMockStripeCustomer(paramsWithLargeMetadata)
        mockStripe.customers.create.mockResolvedValue(mockCustomer)

        const result = await stripeService.createCustomer(paramsWithLargeMetadata)

        expect(mockStripe.customers.create).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: largeMetadata
          })
        )
        expect(result).toEqual(mockCustomer)
      })

      it('should handle various customer creation errors', async () => {
        const errorScenarios = [
          {
            error: new (Stripe as any).errors.StripeInvalidRequestError('Invalid email', 'email'),
            description: 'invalid email format'
          },
          {
            error: new (Stripe as any).errors.StripeAPIError('Service temporarily unavailable'),
            description: 'API service error'
          },
          {
            error: new (Stripe as any).errors.StripeRateLimitError('Too many requests'),
            description: 'rate limit exceeded'
          }
        ]

        for (const scenario of errorScenarios) {
          mockErrorHandler.wrapAsync.mockRejectedValueOnce(scenario.error)
          
          await expect(stripeService.createCustomer(customerParams))
            .rejects.toThrow(scenario.error.message)
        }
      })

      it('should handle network timeout errors', async () => {
        const timeoutError = new (Stripe as any).errors.StripeConnectionError('Request timeout')
        mockErrorHandler.wrapAsync.mockRejectedValue(timeoutError)

        await expect(stripeService.createCustomer(customerParams))
          .rejects.toThrow('Request timeout')
      })
    })

    describe('getCustomer', () => {
      const customerId = 'cus_test123'

      it('should retrieve customer successfully', async () => {
        const mockCustomer = createMockStripeCustomer({ id: customerId })
        mockStripe.customers.retrieve.mockResolvedValue(mockCustomer)

        const result = await stripeService.getCustomer(customerId)

        expect(mockErrorHandler.wrapAsync).toHaveBeenCalledWith(
          expect.any(Function),
          {
            operation: 'getCustomer',
            resource: 'customer',
            metadata: { customerId }
          }
        )
        expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(customerId)
        expect(result).toEqual(mockCustomer)
      })

      it('should return null for deleted customer', async () => {
        const deletedCustomer = { ...createMockStripeCustomer({ id: customerId }), deleted: true }
        mockStripe.customers.retrieve.mockResolvedValue(deletedCustomer)

        const result = await stripeService.getCustomer(customerId)

        expect(result).toBeNull()
      })

      it('should return null for missing customer', async () => {
        const stripeError = new (Stripe as any).errors.StripeError('Customer not found', 'StripeInvalidRequestError', 'resource_missing')
        mockStripe.customers.retrieve.mockRejectedValue(stripeError)

        mockErrorHandler.wrapAsync.mockImplementation(async (operation: Function) => {
          try {
            return await operation()
          } catch (error: any) {
            if (error.code === 'resource_missing') {
              return null
            }
            throw error
          }
        })

        const result = await stripeService.getCustomer(customerId)

        expect(result).toBeNull()
      })

      it('should handle various retrieval errors', async () => {
        const errorScenarios = [
          {
            error: new (Stripe as any).errors.StripeAuthenticationError('Invalid API key'),
            description: 'authentication error'
          },
          {
            error: new (Stripe as any).errors.StripePermissionError('Insufficient permissions'),
            description: 'permission error'
          }
        ]

        for (const scenario of errorScenarios) {
          mockErrorHandler.wrapAsync.mockRejectedValueOnce(scenario.error)
          
          await expect(stripeService.getCustomer(customerId))
            .rejects.toThrow(scenario.error.message)
        }
      })

      it('should handle invalid customer ID format', async () => {
        const invalidCustomerId = 'invalid_id_format'
        const stripeError = new (Stripe as any).errors.StripeInvalidRequestError('Invalid customer ID')
        mockErrorHandler.wrapAsync.mockRejectedValue(stripeError)

        await expect(stripeService.getCustomer(invalidCustomerId))
          .rejects.toThrow('Invalid customer ID')
      })
    })
  })

  describe('Checkout Session Management', () => {
    const sessionParams = {
      customerId: 'cus_test123',
      priceId: 'price_test123',
      mode: 'subscription' as const,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      metadata: { orderId: 'order123', userId: 'user123' }
    }

    describe('createCheckoutSession', () => {
      it('should create checkout session for subscription with all options', async () => {
        const mockSession = createMockStripeCheckoutSession({
          customer: sessionParams.customerId,
          mode: sessionParams.mode,
          success_url: sessionParams.successUrl,
          cancel_url: sessionParams.cancelUrl,
          metadata: sessionParams.metadata
        })
        mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

        const result = await stripeService.createCheckoutSession(sessionParams)

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
          mode: 'subscription',
          success_url: sessionParams.successUrl,
          cancel_url: sessionParams.cancelUrl,
          metadata: sessionParams.metadata,
          allow_promotion_codes: true,
          payment_method_collection: undefined,
          ui_mode: undefined,
          automatic_tax: { enabled: true },
          customer: sessionParams.customerId,
          line_items: [{
            price: sessionParams.priceId,
            quantity: 1
          }]
        })
        expect(result).toEqual(mockSession)
      })

      it('should create session with customer email instead of ID', async () => {
        const paramsWithEmail = {
          ...sessionParams,
          customerId: undefined,
          customerEmail: 'customer@example.com'
        }
        const mockSession = createMockStripeCheckoutSession()
        mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

        await stripeService.createCheckoutSession(paramsWithEmail)

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer_email: 'customer@example.com'
          })
        )
      })

      it('should create session with comprehensive subscription data and trial settings', async () => {
        const paramsWithTrial = {
          ...sessionParams,
          subscriptionData: {
            trialPeriodDays: 14,
            metadata: { trialType: 'premium', campaignId: 'summer2024' },
            trialSettings: {
              endBehavior: {
                missingPaymentMethod: 'pause' as const
              }
            }
          }
        }
        const mockSession = createMockStripeCheckoutSession()
        mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

        await stripeService.createCheckoutSession(paramsWithTrial)

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            subscription_data: {
              trial_period_days: 14,
              metadata: { trialType: 'premium', campaignId: 'summer2024' },
              trial_settings: {
                end_behavior: {
                  missing_payment_method: 'pause'
                }
              }
            }
          })
        )
      })

      it('should create different mode sessions (payment, setup)', async () => {
        const modes: Array<'payment' | 'setup' | 'subscription'> = ['payment', 'setup', 'subscription']

        for (const mode of modes) {
          const modeParams = {
            ...sessionParams,
            mode,
            priceId: mode === 'setup' ? undefined : sessionParams.priceId
          }
          const mockSession = createMockStripeCheckoutSession({ mode })
          mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

          await stripeService.createCheckoutSession(modeParams)

          const expectedCall = expect.objectContaining({
            mode
          })

          if (mode === 'subscription' && modeParams.priceId) {
            expectedCall.line_items = [{
              price: modeParams.priceId,
              quantity: 1
            }]
          }

          expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expectedCall)
        }
      })

      it('should handle various UI modes and payment method collection options', async () => {
        const configurations = [
          { uiMode: 'embedded' as const, paymentMethodCollection: 'always' as const },
          { uiMode: 'hosted' as const, paymentMethodCollection: 'if_required' as const },
          { uiMode: undefined, paymentMethodCollection: undefined }
        ]

        for (const config of configurations) {
          const configParams = {
            ...sessionParams,
            uiMode: config.uiMode,
            paymentMethodCollection: config.paymentMethodCollection
          }
          const mockSession = createMockStripeCheckoutSession()
          mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

          await stripeService.createCheckoutSession(configParams)

          expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
              ui_mode: config.uiMode,
              payment_method_collection: config.paymentMethodCollection
            })
          )
        }
      })

      it('should handle checkout session creation errors', async () => {
        const errorScenarios = [
          {
            error: new (Stripe as any).errors.StripeInvalidRequestError('Invalid price ID', 'price'),
            description: 'invalid price ID'
          },
          {
            error: new (Stripe as any).errors.StripeCardError('Your card was declined'),
            description: 'card declined during setup'
          }
        ]

        for (const scenario of errorScenarios) {
          mockStripe.checkout.sessions.create.mockRejectedValueOnce(scenario.error)
          
          await expect(stripeService.createCheckoutSession(sessionParams))
            .rejects.toThrow(scenario.error.message)
        }
      })

      it('should handle promotion codes and custom configuration', async () => {
        const paramsWithPromoCodes = {
          ...sessionParams,
          allowPromotionCodes: false
        }
        const mockSession = createMockStripeCheckoutSession()
        mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

        await stripeService.createCheckoutSession(paramsWithPromoCodes)

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            allow_promotion_codes: false
          })
        )
      })
    })
  })

  describe('Subscription Management', () => {
    const subscriptionId = 'sub_test123'

    describe('getSubscription', () => {
      it('should retrieve subscription successfully', async () => {
        const mockSubscription = createMockStripeSubscription({ id: subscriptionId })
        mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription)

        const result = await stripeService.getSubscription(subscriptionId)

        expect(mockErrorHandler.wrapAsync).toHaveBeenCalledWith(
          expect.any(Function),
          {
            operation: 'getSubscription',
            resource: 'subscription',
            metadata: { subscriptionId }
          }
        )
        expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith(subscriptionId)
        expect(result).toEqual(mockSubscription)
      })

      it('should return null for missing subscription', async () => {
        const stripeError = new (Stripe as any).errors.StripeError('Subscription not found', 'StripeInvalidRequestError', 'resource_missing')
        mockStripe.subscriptions.retrieve.mockRejectedValue(stripeError)

        mockErrorHandler.wrapAsync.mockImplementation(async (operation: Function) => {
          try {
            return await operation()
          } catch (error: any) {
            if (error.code === 'resource_missing') {
              return null
            }
            throw error
          }
        })

        const result = await stripeService.getSubscription(subscriptionId)

        expect(result).toBeNull()
      })
    })

    describe('updateSubscription', () => {
      const updateParams: Stripe.SubscriptionUpdateParams = {
        metadata: { updated: 'true', updateReason: 'plan_change' },
        proration_behavior: 'create_prorations',
        items: [{
          id: 'si_test123',  
          price: 'price_new123'
        }]
      }

      it('should update subscription successfully', async () => {
        const mockSubscription = createMockStripeSubscription({ 
          id: subscriptionId,
          metadata: updateParams.metadata as Record<string, string>
        })
        mockStripe.subscriptions.update.mockResolvedValue(mockSubscription)

        const result = await stripeService.updateSubscription(subscriptionId, updateParams)

        expect(mockErrorHandler.executeWithRetry).toHaveBeenCalledWith({
          execute: expect.any(Function),
          context: {
            operation: 'updateSubscription',
            resource: 'subscription',
            metadata: { 
              subscriptionId, 
              updateKeys: ['metadata', 'proration_behavior', 'items'] 
            }
          }
        })
        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, updateParams)
        expect(result).toEqual(mockSubscription)
      })

      it('should handle subscription update errors', async () => {
        const errorScenarios = [
          {
            error: new (Stripe as any).errors.StripeInvalidRequestError('Invalid subscription item'),
            description: 'invalid subscription item'
          },
          {
            error: new (Stripe as any).errors.StripeAPIError('Temporary service error'),
            description: 'API service error'
          }
        ]

        for (const scenario of errorScenarios) {
          mockErrorHandler.executeWithRetry.mockRejectedValueOnce(scenario.error)
          
          await expect(stripeService.updateSubscription(subscriptionId, updateParams))
            .rejects.toThrow(scenario.error.message)
        }
      })
    })

    describe('cancelSubscription', () => {
      it('should cancel subscription at period end by default', async () => {
        const mockSubscription = createMockStripeSubscription({ 
          id: subscriptionId,
          cancel_at_period_end: true
        })
        mockStripe.subscriptions.update.mockResolvedValue(mockSubscription)

        const result = await stripeService.cancelSubscription(subscriptionId)

        expect(mockErrorHandler.executeWithRetry).toHaveBeenCalledWith({
          execute: expect.any(Function),
          context: {
            operation: 'cancelSubscription',
            resource: 'subscription',
            metadata: { subscriptionId, immediately: false }
          }
        })
        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
          cancel_at_period_end: true
        })
        expect(result).toEqual(mockSubscription)
      })

      it('should cancel subscription immediately when requested', async () => {
        const mockSubscription = createMockStripeSubscription({ 
          id: subscriptionId,
          status: 'canceled'
        })
        mockStripe.subscriptions.cancel.mockResolvedValue(mockSubscription)

        const result = await stripeService.cancelSubscription(subscriptionId, true)

        expect(mockErrorHandler.executeWithRetry).toHaveBeenCalledWith({
          execute: expect.any(Function),
          context: {
            operation: 'cancelSubscription',
            resource: 'subscription',
            metadata: { subscriptionId, immediately: true }
          }
        })
        expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId)
        expect(result).toEqual(mockSubscription)
      })

      it('should handle subscription cancellation errors', async () => {
        const errorScenarios = [
          {
            error: new (Stripe as any).errors.StripeInvalidRequestError('Subscription already canceled'),
            description: 'already canceled'
          },
          {
            error: new (Stripe as any).errors.StripePermissionError('Cannot cancel subscription'),
            description: 'permission denied'
          }
        ]

        for (const scenario of errorScenarios) {
          mockErrorHandler.executeWithRetry.mockRejectedValueOnce(scenario.error)
          
          await expect(stripeService.cancelSubscription(subscriptionId))
            .rejects.toThrow(scenario.error.message)
        }
      })
    })
  })

  describe('Billing Portal Session Management', () => {
    const portalParams = {
      customerId: 'cus_test123',
      returnUrl: 'https://example.com/account'
    }

    describe('createPortalSession', () => {
      it('should create portal session successfully', async () => {
        const mockPortalSession: Stripe.BillingPortal.Session = {
          id: 'bps_test123',
          object: 'billing_portal.session',
          created: Math.floor(Date.now() / 1000),
          customer: portalParams.customerId,
          livemode: false,
          locale: null,
          on_behalf_of: null,
          return_url: portalParams.returnUrl,
          url: 'https://billing.stripe.com/session/bps_test123'
        }
        mockStripe.billingPortal.sessions.create.mockResolvedValue(mockPortalSession)

        const result = await stripeService.createPortalSession(portalParams)

        expect(mockErrorHandler.executeWithRetry).toHaveBeenCalledWith({
          execute: expect.any(Function),
          context: {
            operation: 'createPortalSession',
            resource: 'portal_session',
            metadata: { customerId: portalParams.customerId }
          }
        })
        expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
          customer: portalParams.customerId,
          return_url: portalParams.returnUrl
        })
        expect(result).toEqual(mockPortalSession)
      })

      it('should handle portal session creation errors', async () => {
        const errorScenarios = [
          {
            error: new (Stripe as any).errors.StripeInvalidRequestError('Invalid customer ID'),
            description: 'invalid customer'
          },
          {
            error: new (Stripe as any).errors.StripePermissionError('Customer portal not enabled'),
            description: 'portal not enabled'
          }
        ]

        for (const scenario of errorScenarios) {
          mockErrorHandler.executeWithRetry.mockRejectedValueOnce(scenario.error)
          
          await expect(stripeService.createPortalSession(portalParams))
            .rejects.toThrow(scenario.error.message)
        }
      })
    })
  })

  describe('Webhook Event Handling', () => {
    const webhookPayload = JSON.stringify({
      id: 'evt_test123',
      object: 'event',
      type: 'customer.subscription.created',
      data: { object: {} }
    })
    const webhookSignature = 'test_signature'
    const webhookSecret = 'whsec_test123'

    describe('constructWebhookEvent', () => {
      it('should construct webhook event successfully', () => {
        const mockWebhookEvent: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          data: {
            object: {} as any,
            previous_attributes: {}
          },
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          },
          type: 'customer.subscription.created',
          api_version: '2024-06-20'
        }
        mockStripe.webhooks.constructEvent.mockReturnValue(mockWebhookEvent)

        const result = stripeService.constructWebhookEvent(
          webhookPayload,
          webhookSignature,
          webhookSecret,
          300
        )

        expect(mockErrorHandler.wrapSync).toHaveBeenCalledWith(
          expect.any(Function),
          {
            operation: 'constructWebhookEvent',
            resource: 'webhook',
            metadata: { hasPayload: true, hasSignature: true }
          }
        )
        expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
          webhookPayload,
          webhookSignature,
          webhookSecret,
          300
        )
        expect(result).toEqual(mockWebhookEvent)
      })

      it('should handle Buffer payload', () => {
        const bufferPayload = Buffer.from(webhookPayload)
        const mockWebhookEvent = {} as Stripe.Event
        mockStripe.webhooks.constructEvent.mockReturnValue(mockWebhookEvent)

        stripeService.constructWebhookEvent(
          bufferPayload,
          webhookSignature,
          webhookSecret
        )

        expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
          bufferPayload,
          webhookSignature,
          webhookSecret,
          undefined
        )
      })

      it('should handle webhook signature validation errors', () => {
        const signatureError = new (Stripe as any).errors.StripeError('Invalid signature', 'StripeSignatureVerificationError')
        mockErrorHandler.wrapSync.mockImplementation(() => {
          throw signatureError
        })

        expect(() => stripeService.constructWebhookEvent(
          webhookPayload,
          'invalid_signature',
          webhookSecret
        )).toThrow('Invalid signature')
      })

      it('should handle missing payload and signature in metadata', () => {
        const mockWebhookEvent = {} as Stripe.Event
        mockStripe.webhooks.constructEvent.mockReturnValue(mockWebhookEvent)

        stripeService.constructWebhookEvent('', '', webhookSecret)

        expect(mockErrorHandler.wrapSync).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({
            metadata: { hasPayload: false, hasSignature: false }
          })
        )
      })
    })
  })

  describe('Invoice Management', () => {
    const previewParams = {
      customerId: 'cus_test123',
      subscriptionId: 'sub_test123'
    }

    describe('createPreviewInvoice', () => {
      it('should create preview invoice successfully', async () => {
        const mockInvoice: Partial<Stripe.Invoice> = {
          id: 'in_test123',
          object: 'invoice',
          created: Math.floor(Date.now() / 1000),
          customer: previewParams.customerId,
          subscription: previewParams.subscriptionId,
          status: 'draft',
          amount_due: 2000,
          currency: 'usd'
        }
        mockStripe.invoices.createPreview.mockResolvedValue(mockInvoice as Stripe.Invoice)

        const result = await stripeService.createPreviewInvoice(previewParams)

        expect(mockErrorHandler.executeWithRetry).toHaveBeenCalledWith({
          execute: expect.any(Function),
          context: {
            operation: 'createPreviewInvoice',
            resource: 'invoice',
            metadata: { 
              customerId: previewParams.customerId, 
              subscriptionId: previewParams.subscriptionId 
            }
          }
        })
        expect(mockStripe.invoices.createPreview).toHaveBeenCalledWith({
          customer: previewParams.customerId,
          subscription: previewParams.subscriptionId
        })
        expect(result).toEqual(mockInvoice)
      })

      it('should handle preview invoice creation errors', async () => {
        const errorScenarios = [
          {
            error: new (Stripe as any).errors.StripeInvalidRequestError('Invalid customer'),
            description: 'invalid customer'
          },
          {
            error: new (Stripe as any).errors.StripeAPIError('Service unavailable'),
            description: 'service error'
          }
        ]

        for (const scenario of errorScenarios) {
          mockErrorHandler.executeWithRetry.mockRejectedValueOnce(scenario.error)
          
          await expect(stripeService.createPreviewInvoice(previewParams))
            .rejects.toThrow(scenario.error.message)
        }
      })
    })

    describe('updateSubscriptionWithProration', () => {
      const prorationParams = {
        items: [
          { id: 'si_test123', price: 'price_new123', quantity: 2 }
        ],
        prorationBehavior: 'create_prorations' as const,
        prorationDate: Math.floor(Date.now() / 1000)
      }

      it('should update subscription with proration successfully', async () => {
        const mockSubscription = createMockStripeSubscription({ 
          id: 'sub_test123',
          items: {
            object: 'list',
            data: prorationParams.items as any,
            has_more: false,
            url: ''
          }
        })
        mockStripe.subscriptions.update.mockResolvedValue(mockSubscription)

        const result = await stripeService.updateSubscriptionWithProration('sub_test123', prorationParams)

        expect(mockErrorHandler.executeWithRetry).toHaveBeenCalledWith({
          execute: expect.any(Function),
          context: {
            operation: 'updateSubscriptionWithProration',
            resource: 'subscription',
            metadata: { 
              subscriptionId: 'sub_test123', 
              prorationBehavior: 'create_prorations' 
            }
          }
        })
        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
          items: prorationParams.items,
          proration_behavior: 'create_prorations',
          proration_date: prorationParams.prorationDate
        })
        expect(result).toEqual(mockSubscription)
      })

      it('should use default proration behavior when not specified', async () => {
        const paramsWithoutBehavior = {
          items: [{ id: 'si_test123', price: 'price_new123' }]
        }
        const mockSubscription = createMockStripeSubscription()
        mockStripe.subscriptions.update.mockResolvedValue(mockSubscription)

        await stripeService.updateSubscriptionWithProration('sub_test123', paramsWithoutBehavior)

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
          items: paramsWithoutBehavior.items,
          proration_behavior: 'create_prorations',
          proration_date: undefined
        })
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent API calls without interference', async () => {
      const customerPromises = [
        stripeService.getCustomer('cus_1'),
        stripeService.getCustomer('cus_2'),
        stripeService.getCustomer('cus_3')
      ]

      const mockCustomers = [
        createMockStripeCustomer({ id: 'cus_1' }),
        createMockStripeCustomer({ id: 'cus_2' }),
        createMockStripeCustomer({ id: 'cus_3' })
      ]

      mockStripe.customers.retrieve
        .mockResolvedValueOnce(mockCustomers[0])
        .mockResolvedValueOnce(mockCustomers[1])
        .mockResolvedValueOnce(mockCustomers[2])

      const results = await Promise.all(customerPromises)

      expect(results).toHaveLength(3)
      expect(results[0].id).toBe('cus_1')
      expect(results[1].id).toBe('cus_2')
      expect(results[2].id).toBe('cus_3')
    })

    it('should maintain singleton pattern for Stripe client under load', () => {
      const clients = Array.from({ length: 100 }, () => stripeService.client)
      
      // All clients should be the same instance
      expect(clients.every(client => client === clients[0])).toBe(true)
      expect(vi.mocked(Stripe)).toHaveBeenCalledTimes(1)
    })

    it('should handle malformed response data gracefully', async () => {
      const malformedCustomer = {
        id: 'cus_malformed',
        object: 'customer',
        // Missing required fields
        created: null,
        email: undefined
      }
      mockStripe.customers.retrieve.mockResolvedValue(malformedCustomer as any)

      const result = await stripeService.getCustomer('cus_malformed')

      expect(result).toEqual(malformedCustomer)
    })

    it('should handle extremely large request payloads', async () => {
      const largeMetadata: Record<string, string> = {}
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`.repeat(1000)
      }

      const mockCustomer = createMockStripeCustomer({ metadata: largeMetadata })
      mockStripe.customers.create.mockResolvedValue(mockCustomer)

      const result = await stripeService.createCustomer({
        email: 'large@example.com',
        metadata: largeMetadata
      })

      expect(result).toEqual(mockCustomer)
    })

    it('should handle various network conditions', async () => {
      const networkErrors = [
        new (Stripe as any).errors.StripeConnectionError('Connection timeout'),
        new (Stripe as any).errors.StripeConnectionError('DNS resolution failed'),
        new (Stripe as any).errors.StripeAPIError('Service temporarily unavailable')
      ]

      for (const error of networkErrors) {
        mockErrorHandler.wrapAsync.mockRejectedValueOnce(error)
        
        await expect(stripeService.getCustomer('cus_test'))
          .rejects.toThrow(error.message)
      }
    })

    it('should handle rate limiting gracefully', async () => {
      const rateLimitError = new (Stripe as any).errors.StripeRateLimitError('Rate limit exceeded')
      mockErrorHandler.executeWithRetry.mockRejectedValue(rateLimitError)

      await expect(stripeService.updateSubscription('sub_test', {}))
        .rejects.toThrow('Rate limit exceeded')
    })

    it('should handle authentication and permission errors', async () => {
      const authErrors = [
        new (Stripe as any).errors.StripeAuthenticationError('Invalid API key'),
        new (Stripe as any).errors.StripePermissionError('Insufficient permissions')
      ]

      for (const error of authErrors) {
        mockErrorHandler.wrapAsync.mockRejectedValueOnce(error)
        
        await expect(stripeService.createCustomer({ email: 'test@example.com' }))
          .rejects.toThrow(error.message)
      }
    })

    it('should handle idempotency errors appropriately', async () => {
      const idempotencyError = new (Stripe as any).errors.StripeIdempotencyError('Idempotency key already used')
      mockErrorHandler.executeWithRetry.mockRejectedValue(idempotencyError)

      await expect(stripeService.cancelSubscription('sub_test'))
        .rejects.toThrow('Idempotency key already used')
    })
  })

  describe('Configuration Edge Cases', () => {
    it('should handle null configuration values', () => {
      mockConfigService.get.mockReturnValue(null)

      expect(() => stripeService.client).toThrow('Missing STRIPE_SECRET_KEY')
    })

    it('should handle whitespace-only configuration values', () => {
      mockConfigService.get.mockReturnValue('   ')

      expect(() => stripeService.client).toThrow('Missing STRIPE_SECRET_KEY')
    })

    it('should handle extremely long configuration values', () => {
      const longKey = 'sk_test_' + 'a'.repeat(10000)
      mockConfigService.get.mockReturnValue(longKey)

      expect(() => stripeService.client).not.toThrow()
    })

    it('should handle special characters in configuration', () => {
      const specialKey = 'sk_test_!@#$%^&*()_+-=[]{}|;:,.<>?'
      mockConfigService.get.mockReturnValue(specialKey)

      expect(() => stripeService.client).not.toThrow()
    })
  })
})