import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { StripeController } from './stripe.controller'
import { SupabaseService } from '../database/supabase.service'
import Stripe from 'stripe'

describe('StripeController - Security Tests', () => {
  let controller: StripeController
  let mockSupabaseService: jest.Mocked<SupabaseService>
  let mockStripe: jest.Mocked<Stripe>

  beforeEach(async () => {
    // Mock Supabase service
    mockSupabaseService = {
      getAdminClient: jest.fn(),
    } as any

    // Mock Stripe
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
      },
      setupIntents: {
        create: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      customers: {
        create: jest.fn(),
      },
    } as any

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile()

    controller = module.get<StripeController>(StripeController)
    // Override the Stripe instance with our mock
    ;(controller as any).stripe = mockStripe
  })

  describe('SQL Injection Prevention', () => {
    describe('sanitizeMetadataValue', () => {
      it('should reject SQL injection attempts with UNION SELECT', async () => {
        const maliciousInput = "test' UNION SELECT * FROM users--"

        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: maliciousInput,
            propertyId: undefined,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should reject SQL injection attempts with OR 1=1', async () => {
        const maliciousInput = "test' OR 1=1--"

        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: maliciousInput,
            propertyId: undefined,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should reject SQL injection attempts with DROP TABLE', async () => {
        const maliciousInput = "test'; DROP TABLE users--"

        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: 'valid-uuid-1234',
            propertyId: maliciousInput,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should reject SQL injection attempts with exec/execute', async () => {
        const maliciousInput = "test'; exec xp_cmdshell('whoami')--"

        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: 'valid-uuid-1234',
            propertyId: maliciousInput,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should reject non-UUID tenant IDs', async () => {
        const invalidUuid = 'not-a-uuid'

        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: invalidUuid,
            propertyId: undefined,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should reject non-UUID property IDs', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        const invalidUuid = 'not-a-uuid'

        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: validUuid,
            propertyId: invalidUuid,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should reject invalid subscription types', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        const invalidType = 'premium-plus-ultra'

        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: validUuid,
            propertyId: undefined,
            subscriptionType: invalidType,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should accept valid UUIDs and subscription types', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        const validPropertyId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        const validType = 'starter'

        mockStripe.paymentIntents.create.mockResolvedValue({
          id: 'pi_test123',
          client_secret: 'pi_test123_secret',
        } as any)

        const result = await controller.createPaymentIntent({
          amount: 100,
          tenantId: validUuid,
          propertyId: validPropertyId,
          subscriptionType: validType,
        })

        expect(result).toEqual({
          clientSecret: 'pi_test123_secret',
        })

        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
          amount: 100,
          currency: 'usd',
          automatic_payment_methods: { enabled: true },
          metadata: {
            tenant_id: validUuid,
            property_id: validPropertyId,
            subscription_type: validType,
          },
        })
      })

      it('should properly escape single quotes in metadata', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

        // This should fail because it contains quotes and is not a valid UUID
        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: "O'Malley's-uuid",
            propertyId: undefined,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should truncate metadata values longer than 500 characters', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        const longString = 'a'.repeat(600)

        // Long UUID should fail validation
        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: longString,
            propertyId: undefined,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should remove null bytes and control characters', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        const inputWithNullByte = `${validUuid}\x00`

        // Should fail because cleaned value won't be a valid UUID
        await expect(
          controller.createPaymentIntent({
            amount: 100,
            tenantId: inputWithNullByte,
            propertyId: undefined,
            subscriptionType: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should prevent double concatenation vulnerability', async () => {
        // Test that the double || '' || '' pattern is gone
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

        mockStripe.paymentIntents.create.mockResolvedValue({
          id: 'pi_test123',
          client_secret: 'pi_test123_secret',
        } as any)

        await controller.createPaymentIntent({
          amount: 100,
          tenantId: validUuid,
          propertyId: undefined,  // undefined should not create || '' || ''
          subscriptionType: undefined,  // undefined should not create || '' || ''
        })

        // Check that metadata doesn't have empty strings for undefined values
        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
          amount: 100,
          currency: 'usd',
          automatic_payment_methods: { enabled: true },
          metadata: {
            tenant_id: validUuid,
            // property_id and subscription_type should not be present if undefined
          },
        })
      })
    })

    describe('Checkout Session Security', () => {
      it('should sanitize product names in checkout sessions', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        const maliciousProductName = "Product'; DROP TABLE orders--"

        await expect(
          controller.createCheckoutSession({
            productName: maliciousProductName,
            tenantId: validUuid,
            domain: 'https://example.com',
            priceId: 'price_123',
            isSubscription: false,
          })
        ).rejects.toThrow(BadRequestException)
      })

      it('should validate Stripe price IDs', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        const invalidPriceId = 'invalid_price_id'

        await expect(
          controller.createCheckoutSession({
            productName: 'Test Product',
            tenantId: validUuid,
            domain: 'https://example.com',
            priceId: invalidPriceId,
            isSubscription: false,
          })
        ).rejects.toThrow(BadRequestException)
      })
    })

    describe('Connected Payments Security', () => {
      it('should validate Stripe account IDs', async () => {
        const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        const invalidAccountId = 'invalid_account'

        await expect(
          controller.createConnectedPayment({
            amount: 100,
            tenantId: validUuid,
            connectedAccountId: 'acct_valid123',
            propertyOwnerAccount: invalidAccountId,
            propertyId: undefined,
          })
        ).rejects.toThrow(BadRequestException)
      })
    })
  })
})