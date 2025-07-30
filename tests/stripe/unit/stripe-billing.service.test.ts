import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeBillingService } from '../../../apps/backend/src/stripe/stripe-billing.service'
import { StripeService } from '../../../apps/backend/src/stripe/stripe.service'
import { PrismaService } from '../../../apps/backend/src/prisma/prisma.service'
import { ErrorHandlerService } from '../../../apps/backend/src/common/errors/error-handler.service'
import { createMockStripeCustomer, createMockStripeSubscription, createMockStripeCheckoutSession } from '../test-data/stripe-factories'

// Mock PrismaService
const mockPrismaService = {
  user: {
    findUnique: vi.fn(),
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
    count: vi.fn()
  }
} as any

// Mock StripeService
const mockStripeService = {
  client: {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn()
    },
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn()
    },
    checkout: {
      sessions: {
        create: vi.fn()
      }
    },
    billingPortal: {
      sessions: {
        create: vi.fn()
      }
    }
  },
  createCustomer: vi.fn(),
  getCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn()
} as any

// Mock ConfigService
const mockConfigService = {
  get: vi.fn()
} as any

// Mock ErrorHandlerService
const mockErrorHandler = {
  createValidationError: vi.fn(),
  createNotFoundError: vi.fn(),
  handleErrorEnhanced: vi.fn()
} as any

describe('StripeBillingService - Comprehensive Unit Tests', () => {
  let billingService: StripeBillingService
  let stripeService: StripeService
  let prismaService: PrismaService
  let configService: ConfigService
  let errorHandler: ErrorHandlerService

  // Mock user data
  const mockUser = {
    id: 'user123',
    email: 'user@example.com',
    name: 'Test User',
    Subscription: []
  }

  const mockUserWithSubscription = {
    ...mockUser,
    Subscription: [{
      stripeCustomerId: 'cus_existing123',
      id: 'sub_db_123',
      userId: 'user123',
      planType: 'STARTER',
      status: 'ACTIVE',
      stripeSubscriptionId: 'sub_stripe_123'
    }]
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'STRIPE_SECRET_KEY': 'sk_test_123456789',
        'STRIPE_PUBLISHABLE_KEY': 'pk_test_123456789'
      }
      return config[key]
    })

    mockErrorHandler.createValidationError.mockImplementation((message: string) => {
      const error = new Error(message)
      error.name = 'ValidationError'
      return error
    })

    mockErrorHandler.createNotFoundError.mockImplementation((resource: string, id: string) => {
      const error = new Error(`${resource} with ID ${id} not found`)
      error.name = 'NotFoundError'
      return error
    })

    mockErrorHandler.handleErrorEnhanced.mockImplementation((error: Error) => {
      throw error
    })

    // Initialize services
    stripeService = mockStripeService
    prismaService = mockPrismaService
    configService = mockConfigService
    errorHandler = mockErrorHandler

    billingService = new StripeBillingService(
      stripeService,
      prismaService,
      configService,
      errorHandler
    )

    // Mock Logger
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Subscription Creation', () => {
    describe('createSubscription', () => {
      const createSubscriptionParams = {
        userId: 'user123',
        planType: 'STARTER' as const,
        billingInterval: 'monthly' as const,
        paymentMethodId: 'pm_test123',
        automaticTax: true,
        trialDays: 14,
        couponId: 'coupon_test123'
      }

      beforeEach(() => {
        // Setup default mocks for successful subscription creation
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
        mockStripeService.createCustomer.mockResolvedValue(
          createMockStripeCustomer({ id: 'cus_new123' })
        )
        
        const mockStripeSubscription = createMockStripeSubscription({
          id: 'sub_new123',
          customer: 'cus_new123',
          status: 'active',
          latest_invoice: {
            id: 'in_test123',
            payment_intent: {
              id: 'pi_test123',
              client_secret: 'pi_test123_secret_abc123'
            }
          }
        })
        
        mockStripeService.client.subscriptions.create.mockResolvedValue(mockStripeSubscription)
        mockPrismaService.subscription.upsert.mockResolvedValue({
          id: 'sub_db_123',
          userId: 'user123',
          planType: 'STARTER',
          status: 'ACTIVE'
        })
      })

      it('should create subscription successfully with plan type', async () => {
        const result = await billingService.createSubscription(createSubscriptionParams)

        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user123' },
          include: { Subscription: true }
        })

        expect(mockStripeService.createCustomer).toHaveBeenCalledWith({
          email: mockUser.email,
          name: mockUser.name,
          metadata: { userId: mockUser.id }
        })

        expect(mockStripeService.client.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_new123',
            items: [{ price: expect.any(String) }],
            payment_behavior: 'default_incomplete',
            trial_period_days: 14,
            automatic_tax: { enabled: true },
            discounts: [{ coupon: 'coupon_test123' }],
            default_payment_method: 'pm_test123'
          })
        )

        expect(result).toEqual({
          subscriptionId: 'sub_new123',
          clientSecret: 'pi_test123_secret_abc123',
          status: 'active',
          paymentIntentId: 'pi_test123',
          priceId: expect.any(String),
          customerId: 'cus_new123'
        })
      })

      it('should create subscription with direct price ID', async () => {
        const paramsWithPriceId = {
          ...createSubscriptionParams,
          planType: undefined,
          priceId: 'price_direct123'
        }

        await billingService.createSubscription(paramsWithPriceId)

        expect(mockStripeService.client.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [{ price: 'price_direct123' }]
          })
        )
      })

      it('should reuse existing Stripe customer', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithSubscription)

        await billingService.createSubscription(createSubscriptionParams)

        expect(mockStripeService.createCustomer).not.toHaveBeenCalled()
        expect(mockStripeService.client.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_existing123'
          })
        )
      })

      it('should handle subscription creation without payment method', async () => {
        const paramsWithoutPaymentMethod = {
          ...createSubscriptionParams,
          paymentMethodId: undefined
        }

        await billingService.createSubscription(paramsWithoutPaymentMethod)

        expect(mockStripeService.client.subscriptions.create).toHaveBeenCalledWith(
          expect.not.objectContaining({
            default_payment_method: expect.any(String)
          })
        )
      })

      it('should handle subscription creation without coupon', async () => {
        const paramsWithoutCoupon = {
          ...createSubscriptionParams,
          couponId: undefined
        }

        await billingService.createSubscription(paramsWithoutCoupon)

        expect(mockStripeService.client.subscriptions.create).toHaveBeenCalledWith(
          expect.not.objectContaining({
            discounts: expect.any(Array)
          })
        )
      })

      it('should throw error when neither planType nor priceId provided', async () => {
        const invalidParams = {
          ...createSubscriptionParams,
          planType: undefined,
          priceId: undefined
        }

        await expect(billingService.createSubscription(invalidParams as any))
          .rejects.toThrow('Either planType or priceId must be provided')

        expect(mockErrorHandler.createValidationError).toHaveBeenCalledWith(
          'Either planType or priceId must be provided'
        )
      })

      it('should handle user not found error', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null)

        await expect(billingService.createSubscription(createSubscriptionParams))
          .rejects.toThrow('User with ID user123 not found')

        expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('User', 'user123')
      })

      it('should handle Stripe subscription creation errors', async () => {
        const stripeError = new Error('Payment method required')
        mockStripeService.client.subscriptions.create.mockRejectedValue(stripeError)

        await expect(billingService.createSubscription(createSubscriptionParams))
          .rejects.toThrow('Payment method required')

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          stripeError,
          {
            operation: 'createSubscription',
            resource: 'subscription',
            metadata: { userId: 'user123', planType: 'STARTER' }
          }
        )
      })

      it('should handle database storage errors', async () => {
        const dbError = new Error('Database connection failed')
        mockPrismaService.subscription.upsert.mockRejectedValue(dbError)

        await expect(billingService.createSubscription(createSubscriptionParams))
          .rejects.toThrow('Database connection failed')
      })

      it('should handle complex invoice structure with payment intent', async () => {
        const complexInvoice = {
          id: 'in_complex123',
          payment_intent: {
            id: 'pi_complex123',
            client_secret: 'pi_complex123_secret_xyz789',
            status: 'requires_payment_method'
          }
        }
        
        const mockSubscription = createMockStripeSubscription({
          latest_invoice: complexInvoice
        })
        
        mockStripeService.client.subscriptions.create.mockResolvedValue(mockSubscription)

        const result = await billingService.createSubscription(createSubscriptionParams)

        expect(result.clientSecret).toBe('pi_complex123_secret_xyz789')
        expect(result.paymentIntentId).toBe('pi_complex123')
      })

      it('should handle invoice with string payment intent ID', async () => {
        const invoiceWithStringPI = {
          id: 'in_string123',
          payment_intent: 'pi_string123'
        }
        
        const mockSubscription = createMockStripeSubscription({
          latest_invoice: invoiceWithStringPI
        })
        
        mockStripeService.client.subscriptions.create.mockResolvedValue(mockSubscription)

        const result = await billingService.createSubscription(createSubscriptionParams)

        expect(result.paymentIntentId).toBe('pi_string123')
        expect(result.clientSecret).toBeUndefined()
      })
    })

    describe('updateSubscription', () => {
      const updateParams = {
        subscriptionId: 'sub_test123',
        userId: 'user123',
        newPriceId: 'price_new123',
        newPlanType: 'GROWTH' as const,
        billingInterval: 'monthly' as const,
        prorationBehavior: 'create_prorations' as const
      }

      beforeEach(() => {
        const mockStripeSubscription = createMockStripeSubscription({
          id: 'sub_test123',
          customer: 'cus_test123',
          items: {
            object: 'list',
            data: [{ id: 'si_test123', price: { id: 'price_old123' } }],
            has_more: false,
            url: ''
          }
        })

        mockStripeService.client.subscriptions.retrieve.mockResolvedValue(mockStripeSubscription)
        mockStripeService.client.subscriptions.update.mockResolvedValue({
          ...mockStripeSubscription,
          items: {
            object: 'list',
            data: [{ id: 'si_test123', price: { id: 'price_new123' } }],
            has_more: false,
            url: ''
          }
        })
        
        mockPrismaService.subscription.updateMany.mockResolvedValue({ count: 1 })
      })

      it('should update subscription successfully', async () => {
        const result = await billingService.updateSubscription(updateParams)

        expect(mockStripeService.client.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123')
        
        expect(mockStripeService.client.subscriptions.update).toHaveBeenCalledWith(
          'sub_test123',
          {
            items: [{
              id: 'si_test123',
              price: 'price_new123'
            }],
            proration_behavior: 'create_prorations'
          }
        )

        expect(mockPrismaService.subscription.updateMany).toHaveBeenCalledWith({
          where: { 
            userId: 'user123',
            stripeSubscriptionId: 'sub_test123'
          },
          data: expect.objectContaining({
            planType: 'GROWTH',
            stripePriceId: 'price_new123',
            status: 'active'
          })
        })

        expect(result).toEqual({
          subscriptionId: 'sub_test123',
          status: 'active',
          priceId: 'price_new123',
          customerId: 'cus_test123'
        })
      })

      it('should handle subscription not found', async () => {
        mockStripeService.client.subscriptions.retrieve.mockResolvedValue(null)

        await expect(billingService.updateSubscription(updateParams))
          .rejects.toThrow('Subscription with ID sub_test123 not found')

        expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Subscription', 'sub_test123')
      })

      it('should use direct price ID when provided', async () => {
        const paramsWithDirectPrice = {
          ...updateParams,
          newPlanType: undefined,
          newPriceId: 'price_direct123'
        }

        await billingService.updateSubscription(paramsWithDirectPrice)

        expect(mockStripeService.client.subscriptions.update).toHaveBeenCalledWith(
          'sub_test123',
          expect.objectContaining({
            items: [{
              id: 'si_test123',
              price: 'price_direct123'
            }]
          })
        )
      })

      it('should handle different proration behaviors', async () => {
        const prorationBehaviors: Array<'none' | 'create_prorations' | 'always_invoice'> = [
          'none', 'create_prorations', 'always_invoice'
        ]

        for (const behavior of prorationBehaviors) {
          const params = { ...updateParams, prorationBehavior: behavior }
          await billingService.updateSubscription(params)

          expect(mockStripeService.client.subscriptions.update).toHaveBeenCalledWith(
            'sub_test123',
            expect.objectContaining({
              proration_behavior: behavior
            })
          )
        }
      })

      it('should handle Stripe update errors', async () => {
        const stripeError = new Error('Invalid price ID')
        mockStripeService.client.subscriptions.update.mockRejectedValue(stripeError)

        await expect(billingService.updateSubscription(updateParams))
          .rejects.toThrow('Invalid price ID')

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          stripeError,
          {
            operation: 'updateSubscription',
            resource: 'subscription',
            metadata: { subscriptionId: 'sub_test123', userId: 'user123' }
          }
        )
      })
    })
  })

  describe('Checkout Session Management', () => {
    describe('createCheckoutSession', () => {
      const checkoutParams = {
        userId: 'user123',
        planType: 'GROWTH' as const,
        billingInterval: 'annual' as const,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        couponId: 'coupon_test123'
      }

      beforeEach(() => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithSubscription)
        
        const mockSession = createMockStripeCheckoutSession({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/pay/cs_test123'
        })
        
        mockStripeService.client.checkout.sessions.create.mockResolvedValue(mockSession)
      })

      it('should create checkout session successfully', async () => {
        const result = await billingService.createCheckoutSession(checkoutParams)

        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user123' },
          include: { Subscription: true }
        })

        expect(mockStripeService.client.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_existing123',
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
              price: expect.any(String),
              quantity: 1
            }],
            success_url: checkoutParams.successUrl,
            cancel_url: checkoutParams.cancelUrl,
            subscription_data: expect.objectContaining({
              trial_period_days: 14,
              metadata: {
                userId: 'user123',
                planType: 'GROWTH'
              },
              trial_settings: {
                end_behavior: {
                  missing_payment_method: 'pause'
                }
              }
            }),
            discounts: [{ coupon: 'coupon_test123' }],
            automatic_tax: { enabled: true },
            payment_method_collection: 'if_required'
          })
        )

        expect(result).toEqual({
          sessionId: 'cs_test123',
          url: 'https://checkout.stripe.com/pay/cs_test123'
        })
      })

      it('should create checkout session without coupon', async () => {
        const paramsWithoutCoupon = {
          ...checkoutParams,
          couponId: undefined
        }

        await billingService.createCheckoutSession(paramsWithoutCoupon)

        expect(mockStripeService.client.checkout.sessions.create).toHaveBeenCalledWith(
          expect.not.objectContaining({
            discounts: expect.any(Array)
          })
        )
      })

      it('should handle user not found for checkout', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null)

        await expect(billingService.createCheckoutSession(checkoutParams))
          .rejects.toThrow('User with ID user123 not found')
      })

      it('should handle checkout session creation errors', async () => {
        const stripeError = new Error('Invalid price configuration')
        mockStripeService.client.checkout.sessions.create.mockRejectedValue(stripeError)

        await expect(billingService.createCheckoutSession(checkoutParams))
          .rejects.toThrow('Invalid price configuration')

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          stripeError,
          {
            operation: 'createCheckoutSession',
            resource: 'checkout',
            metadata: { userId: 'user123' }
          }
        )
      })
    })
  })

  describe('Customer Portal Management', () => {
    describe('createCustomerPortalSession', () => {
      const portalParams = {
        userId: 'user123',
        returnUrl: 'https://example.com/account'
      }

      beforeEach(() => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithSubscription)
        
        mockStripeService.client.billingPortal.sessions.create.mockResolvedValue({
          id: 'bps_test123',
          url: 'https://billing.stripe.com/session/bps_test123'
        })
      })

      it('should create customer portal session successfully', async () => {
        const result = await billingService.createCustomerPortalSession(portalParams)

        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user123' },
          include: { Subscription: true }
        })

        expect(mockStripeService.client.billingPortal.sessions.create).toHaveBeenCalledWith({
          customer: 'cus_existing123',
          return_url: 'https://example.com/account'
        })

        expect(result).toEqual({
          url: 'https://billing.stripe.com/session/bps_test123'
        })
      })

      it('should handle user not found for portal', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null)

        await expect(billingService.createCustomerPortalSession(portalParams))
          .rejects.toThrow('User with ID user123 not found')
      })

      it('should handle portal session creation errors', async () => {
        const stripeError = new Error('Customer not eligible for portal')
        mockStripeService.client.billingPortal.sessions.create.mockRejectedValue(stripeError)

        await expect(billingService.createCustomerPortalSession(portalParams))
          .rejects.toThrow('Customer not eligible for portal')

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          stripeError,
          {
            operation: 'createCustomerPortalSession',
            resource: 'portal_session',
            metadata: { userId: 'user123' }
          }
        )
      })
    })
  })

  describe('Subscription Cancellation', () => {
    describe('cancelSubscription', () => {
      const cancelParams = {
        subscriptionId: 'sub_test123',
        userId: 'user123',
        immediately: false,
        cancellationReason: 'user_requested'
      }

      beforeEach(() => {
        const mockCanceledSubscription = createMockStripeSubscription({
          id: 'sub_test123',
          cancel_at_period_end: true,
          status: 'active',
          canceled_at: null
        })

        mockStripeService.client.subscriptions.update.mockResolvedValue(mockCanceledSubscription)
        mockStripeService.client.subscriptions.cancel.mockResolvedValue({
          ...mockCanceledSubscription,
          status: 'canceled',
          canceled_at: Math.floor(Date.now() / 1000)
        })
        
        mockPrismaService.subscription.updateMany.mockResolvedValue({ count: 1 })
      })

      it('should cancel subscription at period end by default', async () => {
        const result = await billingService.cancelSubscription(cancelParams)

        expect(mockStripeService.client.subscriptions.update).toHaveBeenCalledWith(
          'sub_test123',
          {
            cancel_at_period_end: true,
            metadata: {
              cancellation_reason: 'user_requested'
            }
          }
        )

        expect(mockPrismaService.subscription.updateMany).toHaveBeenCalledWith({
          where: {
            stripeSubscriptionId: 'sub_test123',
            userId: 'user123'
          },
          data: {
            status: 'ACTIVE',
            canceledAt: null
          }
        })

        expect(result).toEqual({
          status: 'active',
          canceledAt: undefined
        })
      })

      it('should cancel subscription immediately when requested', async () => {
        const immediateParams = { ...cancelParams, immediately: true }
        
        const canceledSubscription = createMockStripeSubscription({
          status: 'canceled',
          canceled_at: Math.floor(Date.now() / 1000)
        })
        
        mockStripeService.client.subscriptions.cancel.mockResolvedValue(canceledSubscription)

        const result = await billingService.cancelSubscription(immediateParams)

        expect(mockStripeService.client.subscriptions.cancel).toHaveBeenCalledWith('sub_test123')
        
        expect(mockPrismaService.subscription.updateMany).toHaveBeenCalledWith({
          where: {
            stripeSubscriptionId: 'sub_test123',
            userId: 'user123'
          },
          data: {
            status: 'CANCELED',
            canceledAt: expect.any(Date)
          }
        })

        expect(result.status).toBe('canceled')
        expect(result.canceledAt).toBeDefined()
      })

      it('should handle cancellation with custom reason', async () => {
        const customReasonParams = {
          ...cancelParams,
          cancellationReason: 'pricing_too_high'
        }

        await billingService.cancelSubscription(customReasonParams)

        expect(mockStripeService.client.subscriptions.update).toHaveBeenCalledWith(
          'sub_test123',
          expect.objectContaining({
            metadata: {
              cancellation_reason: 'pricing_too_high'
            }
          })
        )
      })

      it('should handle cancellation errors', async () => {
        const stripeError = new Error('Subscription already canceled')
        mockStripeService.client.subscriptions.update.mockRejectedValue(stripeError)

        await expect(billingService.cancelSubscription(cancelParams))
          .rejects.toThrow('Subscription already canceled')

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          stripeError,
          {
            operation: 'cancelSubscription',
            resource: 'subscription',
            metadata: { subscriptionId: 'sub_test123', userId: 'user123' }
          }
        )
      })
    })
  })

  describe('Subscription Reactivation', () => {
    describe('reactivateSubscription', () => {
      const reactivateParams = {
        userId: 'user123',
        subscriptionId: 'sub_test123',
        paymentMethodId: 'pm_new123'
      }

      beforeEach(() => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithSubscription)
        
        mockStripeService.client.customers.update.mockResolvedValue(
          createMockStripeCustomer({ id: 'cus_existing123' })
        )
        
        const reactivatedSubscription = createMockStripeSubscription({
          id: 'sub_test123',
          status: 'active',
          pause_collection: null
        })
        
        mockStripeService.client.subscriptions.update.mockResolvedValue(reactivatedSubscription)
        mockPrismaService.subscription.updateMany.mockResolvedValue({ count: 1 })
      })

      it('should reactivate subscription successfully', async () => {
        const result = await billingService.reactivateSubscription(reactivateParams)

        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user123' },
          include: { Subscription: true }
        })

        expect(mockStripeService.client.customers.update).toHaveBeenCalledWith(
          'cus_existing123',
          {
            invoice_settings: {
              default_payment_method: 'pm_new123'
            }
          }
        )

        expect(mockStripeService.client.subscriptions.update).toHaveBeenCalledWith(
          'sub_test123',
          {
            default_payment_method: 'pm_new123',
            pause_collection: null
          }
        )

        expect(mockPrismaService.subscription.updateMany).toHaveBeenCalledWith({
          where: {
            stripeSubscriptionId: 'sub_test123',
            userId: 'user123'
          },
          data: {
            status: 'ACTIVE'
          }
        })

        expect(result).toEqual({ status: 'active' })
      })

      it('should handle user not found for reactivation', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null)

        await expect(billingService.reactivateSubscription(reactivateParams))
          .rejects.toThrow('User with ID user123 not found')
      })

      it('should handle reactivation errors', async () => {
        const stripeError = new Error('Payment method invalid')
        mockStripeService.client.subscriptions.update.mockRejectedValue(stripeError)

        await expect(billingService.reactivateSubscription(reactivateParams))
          .rejects.toThrow('Payment method invalid')

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          stripeError,
          {
            operation: 'reactivateSubscription',
            resource: 'subscription',
            metadata: { subscriptionId: 'sub_test123', userId: 'user123' }
          }
        )
      })
    })
  })

  describe('Webhook Synchronization', () => {
    describe('syncSubscriptionFromStripe', () => {
      const mockStripeSubscription = createMockStripeSubscription({
        id: 'sub_stripe123',
        customer: 'cus_existing123',
        status: 'active',
        items: {
          object: 'list',
          data: [{
            id: 'si_test123',
            price: { id: 'price_test123' },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000 // 30 days
          }],
          has_more: false,
          url: ''
        },
        trial_start: Math.floor(Date.now() / 1000),
        trial_end: Math.floor(Date.now() / 1000) + 1209600, // 14 days
        cancel_at_period_end: false,
        canceled_at: null
      })

      beforeEach(() => {
        mockPrismaService.subscription.findFirst.mockResolvedValue({
          id: 'sub_db_123',
          userId: 'user123',
          planType: 'STARTER',
          stripeCustomerId: 'cus_existing123'
        })
        
        mockPrismaService.subscription.update.mockResolvedValue({
          id: 'sub_db_123',
          status: 'ACTIVE'
        })
      })

      it('should sync subscription from Stripe successfully', async () => {
        await billingService.syncSubscriptionFromStripe(mockStripeSubscription as any)

        expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
          where: { stripeCustomerId: 'cus_existing123' }
        })

        expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
          where: { id: 'sub_db_123' },
          data: expect.objectContaining({
            stripeSubscriptionId: 'sub_stripe123',
            status: 'ACTIVE',
            currentPeriodStart: expect.any(Date),
            currentPeriodEnd: expect.any(Date),
            trialStart: expect.any(Date),
            trialEnd: expect.any(Date),
            cancelAtPeriodEnd: false,
            canceledAt: null
          })
        })
      })

      it('should handle subscription not found in database', async () => {
        mockPrismaService.subscription.findFirst.mockResolvedValue(null)

        await billingService.syncSubscriptionFromStripe(mockStripeSubscription as any)

        // Should log warning but not throw error
        expect(mockPrismaService.subscription.update).not.toHaveBeenCalled()
      })

      it('should handle subscription with canceled status', async () => {
        const canceledSubscription = {
          ...mockStripeSubscription,
          status: 'canceled',
          canceled_at: Math.floor(Date.now() / 1000)
        }

        await billingService.syncSubscriptionFromStripe(canceledSubscription as any)

        expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
          where: { id: 'sub_db_123' },
          data: expect.objectContaining({
            status: 'CANCELED',
            canceledAt: expect.any(Date)
          })
        })
      })
    })

    describe('handleSubscriptionDeleted', () => {
      it('should handle subscription deletion', async () => {
        mockPrismaService.subscription.updateMany.mockResolvedValue({ count: 1 })

        await billingService.handleSubscriptionDeleted('sub_deleted123')

        expect(mockPrismaService.subscription.updateMany).toHaveBeenCalledWith({
          where: { stripeSubscriptionId: 'sub_deleted123' },
          data: {
            status: 'CANCELED',
            cancelAtPeriodEnd: false,
            canceledAt: expect.any(Date)
          }
        })
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      const dbError = new Error('Database unavailable')
      mockPrismaService.user.findUnique.mockRejectedValue(dbError)

      const createParams = {
        userId: 'user123',
        planType: 'STARTER' as const,
        billingInterval: 'monthly' as const
      }

      await expect(billingService.createSubscription(createParams))
        .rejects.toThrow('Database unavailable')
    })

    it('should handle Stripe API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'StripeRateLimitError'
      mockStripeService.client.subscriptions.create.mockRejectedValue(rateLimitError)

      const createParams = {
        userId: 'user123',
        planType: 'STARTER' as const,
        billingInterval: 'monthly' as const
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockStripeService.createCustomer.mockResolvedValue(createMockStripeCustomer())

      await expect(billingService.createSubscription(createParams))
        .rejects.toThrow('Rate limit exceeded')
    })

    it('should handle malformed Stripe responses', async () => {
      const malformedSubscription = {
        id: 'sub_malformed',
        // Missing required fields
        customer: null,
        status: undefined
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockStripeService.createCustomer.mockResolvedValue(createMockStripeCustomer())
      mockStripeService.client.subscriptions.create.mockResolvedValue(malformedSubscription as any)

      const createParams = {
        userId: 'user123',
        planType: 'STARTER' as const,
        billingInterval: 'monthly' as const
      }

      // Should handle gracefully without crashing
      await expect(billingService.createSubscription(createParams))
        .resolves.toBeDefined()
    })

    it('should handle concurrent subscription operations', async () => {
      const createParams = {
        userId: 'user123',
        planType: 'STARTER' as const,
        billingInterval: 'monthly' as const
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockStripeService.createCustomer.mockResolvedValue(createMockStripeCustomer())
      mockStripeService.client.subscriptions.create.mockResolvedValue(createMockStripeSubscription())
      mockPrismaService.subscription.upsert.mockResolvedValue({
        id: 'sub_db_123',
        status: 'ACTIVE'
      })

      const promises = [
        billingService.createSubscription(createParams),
        billingService.createSubscription(createParams),
        billingService.createSubscription(createParams)
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.subscriptionId).toBeDefined()
      })
    })
  })
})