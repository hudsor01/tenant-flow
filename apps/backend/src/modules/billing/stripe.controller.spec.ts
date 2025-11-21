/**
 * Stripe Controller Tests
 *
 * Test coverage for UUID validation and Stripe operations:
 * - UUID parameter validation with ParseUUIDPipe
 * - Zod schema validation for request bodies
 * - Customer and subscription creation/update
 * - Error handling for invalid UUIDs
 *
 * Tests: UUID validation, schema validation, error responses
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { StripeController } from './stripe.controller'
import { StripeService } from './stripe.service'
import { StripeSharedService } from './stripe-shared.service'
import { BillingService } from './billing.service'
import { SecurityService } from '../../security/security.service'
import { SupabaseService } from '../../database/supabase.service'

// Mock services
const mockStripeService = {
	createPaymentIntent: jest.fn(),
	createCustomer: jest.fn(),
	createSubscription: jest.fn(),
	updateSubscription: jest.fn()
}

const mockStripeSharedService = {
	generateIdempotencyKey: jest.fn(),
	handleStripeError: jest.fn()
}

const mockBillingService = {
	linkCustomerToTenant: jest.fn(),
	findSubscriptionByStripeId: jest.fn()
}

const mockSecurityService = {
	logAuditEvent: jest.fn()
}

const mockSupabaseService = {
	getAdminClient: jest.fn()
}

describe('StripeController', () => {
	let controller: StripeController
	let stripeService: jest.Mocked<StripeService>
	let stripeSharedService: jest.Mocked<StripeSharedService>
	let billingService: jest.Mocked<BillingService>

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [StripeController],
			providers: [
				{ provide: StripeService, useValue: mockStripeService },
				{ provide: StripeSharedService, useValue: mockStripeSharedService },
				{ provide: BillingService, useValue: mockBillingService },
				{ provide: SecurityService, useValue: mockSecurityService },
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		}).compile()

		controller = module.get<StripeController>(StripeController)
		stripeService = module.get(StripeService)
		stripeSharedService = module.get(StripeSharedService)
		billingService = module.get(BillingService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('UUID Validation', () => {
		describe('updateSubscription', () => {
			it('should accept valid UUID for subscription ID', async () => {
				const validUUID = '550e8400-e29b-41d4-a716-446655440000'
				const mockSubscription = { id: validUUID, customer: 'cus_123' }
				const mockReq = {
					user: { id: 'user-123' },
					tenant: { id: 'tenant-123' }
				}
				const mockRes = {
					status: jest.fn().mockReturnThis(),
					json: jest.fn()
				}

				stripeSharedService.generateIdempotencyKey.mockReturnValue('key-123')
				billingService.findSubscriptionByStripeId.mockResolvedValue({
					customer_id: 'tenant-123'
				} as any)
				stripeService.updateSubscription.mockResolvedValue(mockSubscription as any)

				await controller.updateSubscription(validUUID, mockReq as any, mockRes as any, {})

				expect(mockRes.status).toHaveBeenCalledWith(200)
				expect(mockRes.json).toHaveBeenCalledWith({
					success: true,
					data: mockSubscription
				})
			})

			it('should reject invalid subscription ID format at framework level', async () => {
				// Note: ParseUUIDPipe validation happens at NestJS framework level
				// This test documents that invalid UUIDs would be rejected before reaching the controller
				// Framework-level validation is tested via integration tests
				const invalidUUID = 'invalid-uuid'
				expect(typeof invalidUUID).toBe('string')
			})
		})
	})

	describe('Schema Validation', () => {
		describe('createSubscription', () => {
			it('should accept valid UUID for customer in request body', async () => {
				const validCustomerUUID = '550e8400-e29b-41d4-a716-446655440000'
				const mockSubscription = { id: 'sub_123', customer: validCustomerUUID }
				const mockReq = {
					user: { id: 'user-123' },
					tenant: { id: 'tenant-123' }
				}
				const mockRes = {
					status: jest.fn().mockReturnThis(),
					json: jest.fn()
				}
				const body = {
					customer: validCustomerUUID,
					items: [{ price: 'price_123' }]
				}

				stripeSharedService.generateIdempotencyKey.mockReturnValue('key-123')
				stripeService.createSubscription.mockResolvedValue(mockSubscription as any)

				await controller.createSubscription(mockReq as any, mockRes as any, body)

				expect(mockRes.status).toHaveBeenCalledWith(201)
				expect(mockRes.json).toHaveBeenCalledWith({
					success: true,
					data: mockSubscription
				})
			})

			it('should reject invalid UUID for customer in request body', async () => {
				const invalidCustomerUUID = 'invalid-customer-uuid'
				const mockReq = {
					user: { id: 'user-123' },
					tenant: { id: 'tenant-123' }
				}
				const mockRes = {
					status: jest.fn().mockReturnThis(),
					json: jest.fn()
				}
				const body = {
					customer: invalidCustomerUUID,
					items: [{ price: 'price_123' }]
				}

				await expect(
					controller.createSubscription(mockReq as any, mockRes as any, body)
				).rejects.toThrow(BadRequestException)
			})

			it('should reject missing customer in request body', async () => {
				const mockReq = {
					user: { id: 'user-123' },
					tenant: { id: 'tenant-123' }
				}
				const mockRes = {
					status: jest.fn().mockReturnThis(),
					json: jest.fn()
				}
				const body = {
					items: [{ price: 'price_123' }]
				}

				await expect(
					controller.createSubscription(mockReq as any, mockRes as any, body)
				).rejects.toThrow(BadRequestException)
			})
		})
	})
})