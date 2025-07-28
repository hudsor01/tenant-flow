import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { BillingService } from './billing.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      subscriptions: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        cancel: vi.fn(),
        list: vi.fn()
      },
      products: {
        list: vi.fn(),
        retrieve: vi.fn()
      },
      prices: {
        list: vi.fn(),
        retrieve: vi.fn()
      },
      invoices: {
        create: vi.fn(),
        finalize: vi.fn(),
        list: vi.fn()
      },
      webhooks: {
        constructEvent: vi.fn()
      }
    }))
  }
})

describe('BillingService', () => {
  let service: BillingService
  let mockPrisma: any
  let mockErrorHandler: any
  let mockStripe: any
  let mockConfigService: any

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn()
      },
      subscription: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      $transaction: vi.fn()
    }

    mockErrorHandler = {
      handleAsync: vi.fn((fn) => fn()),
      createError: vi.fn()
    }

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        const config = {
          'stripe.secretKey': 'sk_test_123',
          'stripe.webhookSecret': 'whsec_123',
          'stripe.publishableKey': 'pk_test_123'
        }
        return config[key]
      })
    }

    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: mockPrisma
        },
        {
          provide: ErrorHandlerService,
          useValue: mockErrorHandler
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: Logger,
          useValue: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn()
          }
        }
      ]
    }).compile()

    service = module.get<BillingService>(BillingService)
    mockStripe = (service as any).stripe
  })

  describe('createCustomer', () => {
    it('should create a Stripe customer and update user', async () => {
      const userId = 'user-123'
      const mockUser = {
        id: userId,
        email: 'test@tenantflow.app',
        name: 'Test User',
        stripeCustomerId: null
      }

      const mockCustomer = {
        id: 'cus_123',
        email: 'test@tenantflow.app',
        name: 'Test User'
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        stripeCustomerId: 'cus_123'
      })

      const result = await service.createCustomer(userId)

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@tenantflow.app',
        name: 'Test User',
        metadata: {
          userId: userId
        }
      })

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { stripeCustomerId: 'cus_123' }
      })

      expect(result).toEqual(mockCustomer)
    })

    it('should return existing customer if already exists', async () => {
      const userId = 'user-123'
      const mockUser = {
        id: userId,
        email: 'test@tenantflow.app',
        name: 'Test User',
        stripeCustomerId: 'cus_existing'
      }

      const mockCustomer = {
        id: 'cus_existing',
        email: 'test@tenantflow.app'
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer)

      const result = await service.createCustomer(userId)

      expect(mockStripe.customers.create).not.toHaveBeenCalled()
      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_existing')
      expect(result).toEqual(mockCustomer)
    })

    it('should handle user not found error', async () => {
      const userId = 'user-404'
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.createCustomer(userId)).rejects.toThrow()
    })
  })

  describe('createSubscription', () => {
    it('should create a subscription with valid parameters', async () => {
      const customerId = 'cus_123'
      const priceId = 'price_123'
      
      const mockSubscription = {
        id: 'sub_123',
        customer: customerId,
        items: {
          data: [{ price: { id: priceId } }]
        },
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30
      }

      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription)
      mockPrisma.subscription.create.mockResolvedValue({
        id: 'db-sub-123',
        stripeSubscriptionId: 'sub_123',
        userId: 'user-123'
      })

      const result = await service.createSubscription({
        customerId,
        priceId,
        userId: 'user-123'
      })

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      })

      expect(result).toEqual(mockSubscription)
    })

    it('should handle trial period subscriptions', async () => {
      const customerId = 'cus_123'
      const priceId = 'price_123'
      const trialDays = 14
      
      const mockSubscription = {
        id: 'sub_123',
        customer: customerId,
        trial_end: Math.floor(Date.now() / 1000) + (trialDays * 86400)
      }

      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription)
      mockPrisma.subscription.create.mockResolvedValue({})

      await service.createSubscription({
        customerId,
        priceId,
        userId: 'user-123',
        trialDays
      })

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_period_days: trialDays
        })
      )
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const subscriptionId = 'sub_123'
      
      const mockCanceledSubscription = {
        id: subscriptionId,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000)
      }

      mockStripe.subscriptions.cancel.mockResolvedValue(mockCanceledSubscription)
      mockPrisma.subscription.update.mockResolvedValue({})

      const result = await service.cancelSubscription(subscriptionId, { immediate: true })

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId)
      expect(result).toEqual(mockCanceledSubscription)
    })

    it('should schedule subscription cancellation at period end', async () => {
      const subscriptionId = 'sub_123'
      
      const mockUpdatedSubscription = {
        id: subscriptionId,
        cancel_at_period_end: true
      }

      mockStripe.subscriptions.update.mockResolvedValue(mockUpdatedSubscription)

      const result = await service.cancelSubscription(subscriptionId, { immediate: false })

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
        cancel_at_period_end: true
      })
      expect(result).toEqual(mockUpdatedSubscription)
    })
  })

  describe('handleWebhook', () => {
    it('should process subscription.created webhook', async () => {
      const webhookBody = JSON.stringify({
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active'
          }
        }
      })

      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active'
          }
        }
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockPrisma.subscription.create.mockResolvedValue({})

      const result = await service.handleWebhook(webhookBody, 'whsec_signature')

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        webhookBody,
        'whsec_signature',
        'whsec_123'
      )
      expect(result).toBe(true)
    })

    it('should process subscription.updated webhook', async () => {
      const webhookBody = JSON.stringify({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'past_due'
          }
        }
      })

      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'past_due'
          }
        }
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockPrisma.subscription.update.mockResolvedValue({})

      const result = await service.handleWebhook(webhookBody, 'whsec_signature')

      expect(result).toBe(true)
    })

    it('should handle webhook signature validation failure', async () => {
      const webhookBody = 'invalid body'
      const invalidSignature = 'invalid_signature'

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      await expect(
        service.handleWebhook(webhookBody, invalidSignature)
      ).rejects.toThrow('Invalid signature')
    })

    it('should handle unknown webhook events gracefully', async () => {
      const webhookBody = JSON.stringify({
        type: 'unknown.event.type',
        data: { object: {} }
      })

      const mockEvent = {
        type: 'unknown.event.type',
        data: { object: {} }
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const result = await service.handleWebhook(webhookBody, 'whsec_signature')

      expect(result).toBe(true) // Should not throw, just ignore unknown events
    })
  })

  describe('getSubscriptionUsage', () => {
    it('should calculate property count usage', async () => {
      const userId = 'user-123'
      
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-123',
        stripeSubscriptionId: 'sub_123',
        plan: 'STARTER'
      })

      // Mock property count query
      mockPrisma.property = {
        count: vi.fn().mockResolvedValue(5)
      }

      const result = await service.getSubscriptionUsage(userId)

      expect(result).toEqual({
        subscription: expect.objectContaining({
          plan: 'STARTER'
        }),
        usage: {
          properties: 5,
          limits: {
            properties: 10 // STARTER plan limit
          }
        }
      })
    })

    it('should handle user without subscription', async () => {
      const userId = 'user-123'
      
      mockPrisma.subscription.findFirst.mockResolvedValue(null)

      const result = await service.getSubscriptionUsage(userId)

      expect(result).toEqual({
        subscription: null,
        usage: {
          properties: 0,
          limits: {
            properties: 1 // Free tier limit
          }
        }
      })
    })
  })

  describe('validateSubscriptionLimits', () => {
    it('should allow creation within limits', async () => {
      const userId = 'user-123'
      
      mockPrisma.subscription.findFirst.mockResolvedValue({
        plan: 'PROFESSIONAL'
      })

      mockPrisma.property = {
        count: vi.fn().mockResolvedValue(25) // Under 50 property limit
      }

      const isValid = await service.validateSubscriptionLimits(userId, 'properties')

      expect(isValid).toBe(true)
    })

    it('should prevent creation when at limits', async () => {
      const userId = 'user-123'
      
      mockPrisma.subscription.findFirst.mockResolvedValue({
        plan: 'STARTER'
      })

      mockPrisma.property = {
        count: vi.fn().mockResolvedValue(10) // At 10 property limit
      }

      const isValid = await service.validateSubscriptionLimits(userId, 'properties')

      expect(isValid).toBe(false)
    })

    it('should handle free tier limits', async () => {
      const userId = 'user-123'
      
      mockPrisma.subscription.findFirst.mockResolvedValue(null) // No subscription

      mockPrisma.property = {
        count: vi.fn().mockResolvedValue(1) // At free tier limit
      }

      const isValid = await service.validateSubscriptionLimits(userId, 'properties')

      expect(isValid).toBe(false)
    })
  })
})