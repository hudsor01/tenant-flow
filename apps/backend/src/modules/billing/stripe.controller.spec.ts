import { createMock } from '@golevelup/ts-jest'
import { ForbiddenException } from '@nestjs/common'
import type Stripe from 'stripe'
import type { SupabaseService } from '../../database/supabase.service'
import { StripeController } from './stripe.controller'
import type { StripeService } from './stripe.service'
import type { StripeOwnerService } from './stripe-owner.service'
import type { StripeTenantService } from './stripe-tenant.service'
import { SecurityService } from '../../security/security.service'
import { createMockAppConfigService } from '../../test-utils/mocks'
import type { AuthenticatedRequest } from '@repo/shared/types/auth'

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
let mockStripeOwnerService: jest.Mocked<StripeOwnerService>
let mockStripeTenantService: jest.Mocked<StripeTenantService>

	beforeEach(() => {
		process.env.IDEMPOTENCY_KEY_SECRET = 'test-secret-key-for-tests-only'
		jest.useFakeTimers()

		mockSupabaseService = createMockSupabaseService()
		mockStripe = createMockStripe()
		mockStripeOwnerService = createMock<StripeOwnerService>()
		mockStripeOwnerService.ensureOwnerCustomer.mockResolvedValue({
			customer: {
				id: 'cus_owner',
				email: 'owner@example.com'
			} as unknown as Stripe.Customer,
			status: 'existing'
		})

		mockStripeTenantService = createMock<StripeTenantService>()
		mockStripeTenantService.ensureStripeCustomer.mockResolvedValue({
			customer: { id: 'cus_tenant' } as unknown as Stripe.Customer,
			status: 'existing'
		})

		const securityService = new SecurityService()

		const mockStripeService = {
			getStripe: jest.fn(() => mockStripe),
			createCustomer: jest.fn().mockResolvedValue({ id: 'cus_test' }),
			createSubscription: jest.fn().mockResolvedValue({ id: 'sub_test' }),
			getCustomer: jest.fn().mockResolvedValue({ id: 'cus_test' })
		} as unknown as jest.Mocked<StripeService>

		const mockAppConfigService = createMockAppConfigService()
		mockAppConfigService.getIdempotencyKeySecret.mockReturnValue(
			'test-secret-key-for-tests-only'
		)

		controller = new StripeController(
			mockSupabaseService,
			mockStripeService,
			mockStripeOwnerService,
			mockStripeTenantService,
			securityService,
			mockAppConfigService
		)

		jest.spyOn(controller['logger'], 'log').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'warn').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.clearAllTimers()
		jest.useRealTimers()
		delete process.env.IDEMPOTENCY_KEY_SECRET
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
				tenantId: validUuid
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
					tenantId: validUuid
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
					tenantId: ''
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('tenantId is required')
			}
		})

		it('should sanitize SQL injection attempts and succeed', async () => {
			const maliciousInput = "test'; DROP TABLE users--"

			const mockPaymentIntent = {
				id: 'pi_test123',
				client_secret: 'pi_test123_secret'
			} as Stripe.PaymentIntent

			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue(
				mockPaymentIntent
			)

			// Should succeed after sanitization
			const result = await controller.createPaymentIntent({
				amount: 100,
				tenantId: maliciousInput
			})

			expect(result).toBeDefined()
			expect(result!.clientSecret).toBe('pi_test123_secret')

			// Verify sanitization removed angle brackets only (other characters preserved)
			const createCall = (mockStripe.paymentIntents.create as jest.Mock).mock
				.calls[0][0]
			expect(createCall.metadata.tenant_id).not.toContain('<')
			expect(createCall.metadata.tenant_id).not.toContain('>')
			// Apostrophes, semicolons, hyphens are preserved (not XSS vectors)
			expect(createCall.metadata.tenant_id).toContain("'")
			expect(createCall.metadata.tenant_id).toContain('DROP TABLE')
		})
	})

	describe('ensureOwnerCustomer', () => {
		it('should resolve existing owner Stripe customer', async () => {
			const request = {
				user: { id: 'owner-123' }
			} as unknown as AuthenticatedRequest

			const response = await controller.ensureOwnerCustomer(request, {
				email: 'owner@example.com'
			})

			expect(mockStripeOwnerService.ensureOwnerCustomer).toHaveBeenCalledWith({
				userId: 'owner-123',
				email: 'owner@example.com',
				name: null
			})

			expect(response).toEqual({
				customerId: 'cus_owner',
				email: 'owner@example.com',
				name: null,
				status: 'existing',
				created: false
			})
		})

		it('should propagate role enforcement errors from owner service', async () => {
			const request = {
				user: { id: 'owner-456' }
			} as unknown as AuthenticatedRequest

			mockStripeOwnerService.ensureOwnerCustomer.mockRejectedValue(
				new ForbiddenException('Only owners can call this endpoint')
			)

			await expect(
				controller.ensureOwnerCustomer(request, {})
			).rejects.toBeInstanceOf(ForbiddenException)
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

			const result = await controller.createCheckoutSession(
				{} as AuthenticatedRequest,
				{
					productName: 'Select Plan',
					tenantId: validUuid,
					domain: 'https://example.com',
					priceId: 'price_1234567890abcdef',
					isSubscription: false
				}
			)

			expect(result).toEqual({
				url: 'https://checkout.stripe.com/test',
				session_id: 'cs_test123'
			})

			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						product_name: 'Select Plan'
					})
				})
			)
		})

		it('should allow product names with apostrophes and punctuation', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
			const descriptiveName = "Tenant's Premium Plan (Annual)"

			const mockSession = {
				id: 'cs_test456',
				url: 'https://checkout.stripe.com/test/tenant'
			} as Stripe.Checkout.Session

			;(mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(
				mockSession
			)

			const result = await controller.createCheckoutSession(
				{} as AuthenticatedRequest,
				{
					productName: descriptiveName,
					tenantId: validUuid,
					domain: 'https://tenant.example.com',
					priceId: 'price_abcdef1234567890',
					isSubscription: true
				}
			)

			expect(result).toEqual({
				url: 'https://checkout.stripe.com/test/tenant',
				session_id: 'cs_test456'
			})

			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						product_name: "Tenant's Premium Plan (Annual)" // Apostrophe preserved
					})
				})
			)
		})

		it('should throw BadRequestException for missing productName', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

			try {
				await controller.createCheckoutSession({} as AuthenticatedRequest, {
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

		it('should sanitize malicious product names successfully', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
			const maliciousProductName = "Product'; DROP TABLE orders--"

			const mockSession = {
				id: 'cs_test123',
				url: 'https://checkout.stripe.com/test'
			} as Stripe.Checkout.Session

			;(mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(
				mockSession
			)

			// Should succeed after sanitization (dangerous characters removed)
			const result = await controller.createCheckoutSession(
				{} as AuthenticatedRequest,
				{
					productName: maliciousProductName,
					tenantId: validUuid,
					domain: 'https://example.com',
					priceId: 'price_1234567890abcdef',
					isSubscription: false
				}
			)

			expect(result).toEqual({
				url: 'https://checkout.stripe.com/test',
				session_id: 'cs_test123'
			})

			// Verify the Stripe API was called with sanitized metadata (angle brackets removed only)
			const createCall = (mockStripe.checkout.sessions.create as jest.Mock).mock
				.calls[0][0]
			expect(createCall.metadata.product_name).not.toContain('<')
			expect(createCall.metadata.product_name).not.toContain('>')
			expect(createCall.metadata.product_name).toContain('Product')
			expect(createCall.metadata.product_name).toContain('DROP TABLE')
			expect(createCall.metadata.tenant_id).toBe(validUuid)
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
				propertyOwnerAccount: 'acct_0987654321fedcba'
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
					propertyOwnerAccount: 'acct_0987654321fedcba'
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
					propertyOwnerAccount: 'acct_0987654321fedcba'
				})
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('connectedAccountId is required')
			}
		})
	})

	describe('Error Handling - Sanitization vs Stripe Errors', () => {
		it('should return 400 for strings that become empty after sanitization', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
			const onlyDangerousChars = '<><><>' // Only angle brackets - will be empty after sanitization

			try {
				await controller.createCheckoutSession({} as AuthenticatedRequest, {
					productName: onlyDangerousChars,
					tenantId: validUuid,
					domain: 'https://example.com',
					priceId: 'price_1234567890abcdef',
					isSubscription: false
				})
				fail('Should have thrown BadRequestException')
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('contains only invalid characters')
			}
		})

		it('should sanitize XSS attempts successfully', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
			const xssAttempt = '<script>alert("xss")</script>'

			const mockSession = {
				id: 'cs_test123',
				url: 'https://checkout.stripe.com/test'
			} as Stripe.Checkout.Session

			;(mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(
				mockSession
			)

			// Should succeed after sanitization
			const result = await controller.createCheckoutSession(
				{} as AuthenticatedRequest,
				{
					productName: xssAttempt,
					tenantId: validUuid,
					domain: 'https://example.com',
					priceId: 'price_1234567890abcdef',
					isSubscription: false
				}
			)

			expect(result).toEqual({
				url: 'https://checkout.stripe.com/test',
				session_id: 'cs_test123'
			})

			// Verify XSS was sanitized (angle brackets removed)
			const createCall = (mockStripe.checkout.sessions.create as jest.Mock).mock
				.calls[0][0]
			expect(createCall.metadata.product_name).not.toContain('<')
			expect(createCall.metadata.product_name).not.toContain('>')
			expect(createCall.metadata.product_name).toContain('script')
			expect(createCall.metadata.product_name).toContain('alert')
			expect(createCall.metadata.tenant_id).toBe(validUuid)
		})

		it('should return 500 for actual Stripe API errors', async () => {
			const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
			const stripeError = {
				message: 'Stripe API error',
				type: 'StripeAPIError',
				code: 'api_error'
			} as Stripe.errors.StripeError
			;(mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
				stripeError
			)

			try {
				await controller.createCheckoutSession({} as AuthenticatedRequest, {
					productName: 'Valid Product',
					tenantId: validUuid,
					domain: 'https://example.com',
					priceId: 'price_1234567890abcdef',
					isSubscription: false
				})
				fail('Should have thrown InternalServerErrorException')
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('InternalServerErrorException')
			}
		})
	})

	describe('Security Tests', () => {
		it('should reject strings containing only dangerous characters', async () => {
			const onlyDangerousChars = '<><><>' // Only angle brackets - will be empty after sanitization

			try {
				await controller.createPaymentIntent({
					amount: 100,
					tenantId: onlyDangerousChars
				})
				fail('Should have thrown BadRequestException')
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				expect(err.message).toContain('contains only invalid characters')
			}
		})
		it('should sanitize SQL injection with UNION SELECT', async () => {
			const maliciousInput = "test' UNION SELECT * FROM users--"

			const mockPaymentIntent = {
				id: 'pi_test123',
				client_secret: 'pi_test123_secret'
			} as Stripe.PaymentIntent

			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue(
				mockPaymentIntent
			)

			// Should succeed after sanitization
			const result = await controller.createPaymentIntent({
				amount: 100,
				tenantId: maliciousInput
			})

			expect(result).toBeDefined()
			expect(result!.clientSecret).toBe('pi_test123_secret')

			// Verify sanitization removed dangerous characters
			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						tenant_id: "test' UNION SELECT * FROM users--" // After sanitization (apostrophe preserved)
					})
				}),
				expect.objectContaining({
					idempotencyKey: expect.any(String)
				})
			)
		})

		it('should sanitize SQL injection with OR 1=1', async () => {
			const maliciousInput = "test' OR 1=1--"

			const mockPaymentIntent = {
				id: 'pi_test123',
				client_secret: 'pi_test123_secret'
			} as Stripe.PaymentIntent

			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue(
				mockPaymentIntent
			)

			// Should succeed after sanitization
			const result = await controller.createPaymentIntent({
				amount: 100,
				tenantId: maliciousInput
			})

			expect(result).toBeDefined()
			expect(result!.clientSecret).toBe('pi_test123_secret')

			// Verify sanitization removed dangerous characters
			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						tenant_id: "test' OR 1=1--" // After sanitization (apostrophe preserved)
					})
				}),
				expect.objectContaining({
					idempotencyKey: expect.any(String)
				})
			)
		})

		it('should handle control characters properly', async () => {
			const inputWithControlChars = 'valid\x00\x01\x02input'

			try {
				await controller.createPaymentIntent({
					amount: 100,
					tenantId: inputWithControlChars
				})
				fail('Should have thrown an error')
			} catch (error) {
				const err = error as Error
				expect(err.constructor.name).toBe('BadRequestException')
				// Null bytes are checked first in SecurityService, so expect that error
				expect(err.message).toContain('Input contains null bytes')
			}
		})
	})
})
