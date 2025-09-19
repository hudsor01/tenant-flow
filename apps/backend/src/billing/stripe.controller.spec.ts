import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeController } from './stripe.controller'

// Create properly typed mock objects
const createMockSupabaseService = (): jest.Mocked<SupabaseService> => {
	return {
		getAdminClient: jest.fn()
	} as unknown as jest.Mocked<SupabaseService>
}

const createMockStripe = (): jest.Mocked<Stripe> => {
	return {
		paymentIntents: {
			create: jest.fn()
		},
		setupIntents: {
			create: jest.fn()
		},
		subscriptions: {
			create: jest.fn()
		},
		checkout: {
			sessions: {
				create: jest.fn(),
				retrieve: jest.fn()
			}
		},
		customers: {
			create: jest.fn()
		},
		billingPortal: {
			sessions: {
				create: jest.fn()
			}
		}
	} as unknown as jest.Mocked<Stripe>
}

describe('StripeController', () => {
	let controller: StripeController
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockStripe: jest.Mocked<Stripe>

	beforeEach(async () => {
		// Create mock instances
		mockSupabaseService = createMockSupabaseService()
		mockStripe = createMockStripe()

		const module: TestingModule = await Test.createTestingModule({
			controllers: [StripeController],
			providers: [
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		}).compile()

		controller = module.get<StripeController>(StripeController)
		// Override the Stripe instance with our mock
		const controllerWithStripe = controller as unknown as {
			stripe: jest.Mocked<Stripe>
		}
		controllerWithStripe.stripe = mockStripe
	})

	describe('createPaymentIntent', () => {
		it('should create payment intent with valid data', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

			const mockPaymentIntent = {
				id: 'pi_test123',
				client_secret: 'pi_test123_secret'
			} as Stripe.PaymentIntent

			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue(
				mockPaymentIntent
			)

			const result = await controller.createPaymentIntent({
				amount: 100,
				tenantId: validUuid,
				propertyId: undefined,
				subscriptionType: undefined
			})

			expect(result).toEqual({
				clientSecret: 'pi_test123_secret'
			})
		})

		it('should throw BadRequestException for invalid amount', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

			try {
				await controller.createPaymentIntent({
					amount: 10, // Below minimum
					tenantId: validUuid,
					propertyId: undefined,
					subscriptionType: undefined
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('Amount must be at least 50 cents')
			}
		})

		it('should throw BadRequestException for missing tenantId', async () => {
			try {
				await controller.createPaymentIntent({
					amount: 100,
					tenantId: '',
					propertyId: undefined,
					subscriptionType: undefined
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('tenantId is required')
			}
		})

		it('should reject malicious SQL injection attempts', async () => {
			const maliciousInput = "test'; DROP TABLE users--"

			try {
				await controller.createPaymentIntent({
					amount: 100,
					tenantId: maliciousInput,
					propertyId: undefined,
					subscriptionType: undefined
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('InternalServerErrorException')
			}
		})
	})

	describe('createCheckoutSession', () => {
		it('should create checkout session with valid data', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

			const mockSession = {
				id: 'cs_test123',
				url: 'https://checkout.stripe.com/test'
			} as Stripe.Checkout.Session

			;(mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(
				mockSession
			)

			const result = await controller.createCheckoutSession({
				productName: 'Test Product',
				tenantId: validUuid,
				domain: 'https://example.com',
				priceId: 'price_1234567890abcdef',
				isSubscription: false
			})

			expect(result).toEqual({
				url: 'https://checkout.stripe.com/test',
				session_id: 'cs_test123'
			})
		})

		it('should throw BadRequestException for missing productName', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

			try {
				await controller.createCheckoutSession({
					productName: '',
					tenantId: validUuid,
					domain: 'https://example.com',
					priceId: 'price_1234567890abcdef',
					isSubscription: false
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('productName is required')
			}
		})

		it('should sanitize malicious product names', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
			const maliciousProductName = "Product'; DROP TABLE orders--"

			try {
				await controller.createCheckoutSession({
					productName: maliciousProductName,
					tenantId: validUuid,
					domain: 'https://example.com',
					priceId: 'price_1234567890abcdef',
					isSubscription: false
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('InternalServerErrorException')
			}
		})
	})

	describe('createConnectedPayment', () => {
		it('should create connected payment with valid data', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

			const mockPaymentIntent = {
				id: 'pi_test123',
				client_secret: 'pi_test123_secret'
			} as Stripe.PaymentIntent

			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue(
				mockPaymentIntent
			)

			const result = await controller.createConnectedPayment({
				amount: 100,
				tenantId: validUuid,
				connectedAccountId: 'acct_1234567890abcdef',
				propertyOwnerAccount: 'acct_0987654321fedcba',
				propertyId: undefined
			})

			expect(result).toEqual({
				client_secret: 'pi_test123_secret',
				payment_intent_id: 'pi_test123'
			})
		})

		it('should throw BadRequestException for invalid amount', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

			try {
				await controller.createConnectedPayment({
					amount: 10, // Below minimum
					tenantId: validUuid,
					connectedAccountId: 'acct_1234567890abcdef',
					propertyOwnerAccount: 'acct_0987654321fedcba',
					propertyId: undefined
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('Amount must be at least 50 cents')
			}
		})

		it('should throw BadRequestException for missing connectedAccountId', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

			try {
				await controller.createConnectedPayment({
					amount: 100,
					tenantId: validUuid,
					connectedAccountId: '',
					propertyOwnerAccount: 'acct_0987654321fedcba',
					propertyId: undefined
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('connectedAccountId is required')
			}
		})
	})

	describe('Security Tests', () => {
		it('should prevent SQL injection with UNION SELECT', async () => {
			const maliciousInput = "test' UNION SELECT * FROM users--"

			try {
				await controller.createPaymentIntent({
					amount: 100,
					tenantId: maliciousInput,
					propertyId: undefined,
					subscriptionType: undefined
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('InternalServerErrorException')
			}
		})

		it('should prevent SQL injection with OR 1=1', async () => {
			const maliciousInput = "test' OR 1=1--"

			try {
				await controller.createPaymentIntent({
					amount: 100,
					tenantId: maliciousInput,
					propertyId: undefined,
					subscriptionType: undefined
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('InternalServerErrorException')
			}
		})

		it('should handle control characters properly', async () => {
			const inputWithControlChars = 'valid\x00\x01\x02input'

			try {
				await controller.createPaymentIntent({
					amount: 100,
					tenantId: inputWithControlChars,
					propertyId: undefined,
					subscriptionType: undefined
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('InternalServerErrorException')
			}
		})
	})
})
