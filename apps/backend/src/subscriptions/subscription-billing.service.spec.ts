/**
 * SubscriptionBillingService Tests (TDD Red Phase)
 * Tests written BEFORE implementation
 */

import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { SilentLogger } from '../__test__/silent-logger'
import { AppLogger } from '../logger/app-logger.service'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionCacheService } from './subscription-cache.service'
import { SubscriptionQueryService } from './subscription-query.service'
import type { LeaseContext } from './subscription-query.service'
import { SubscriptionBillingService } from './subscription-billing.service'

describe('SubscriptionBillingService', () => {
	let service: SubscriptionBillingService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockStripeClientService: jest.Mocked<StripeClientService>
	let mockQueryService: jest.Mocked<SubscriptionQueryService>

	// Test data
	const mockTenantUserId = 'tenant-user-456'
	const mockLeaseId = 'lease-abc'
	const mockTenantId = 'tenant-def'
	const mockOwnerId = 'owner-ghi'
	const mockOwnerUserId = 'owner-user-789'
	const mockUnitId = 'unit-jkl'
	const mockPropertyId = 'property-mno'
	const mockStripeSubscriptionId = 'sub_test123'
	const mockPaymentMethodId = 'pm-xyz'

	const mockLease = {
		id: mockLeaseId,
		primary_tenant_id: mockTenantId,
		rent_amount: 150000,
		rent_currency: 'usd',
		payment_day: 1,
		auto_pay_enabled: false,
		stripe_subscription_id: null,
		unit_id: mockUnitId,
		created_at: '2025-01-01T00:00:00Z',
		updated_at: '2025-01-01T00:00:00Z'
	}

	const mockLeaseWithSubscription = {
		...mockLease,
		stripe_subscription_id: mockStripeSubscriptionId,
		auto_pay_enabled: true
	}

	const mockTenant = {
		id: mockTenantId,
		user_id: mockTenantUserId,
		stripe_customer_id: 'cus_test123'
	}

	const mockTenantUser = {
		id: mockTenantUserId,
		email: 'tenant@example.com',
		first_name: 'Test',
		last_name: 'Tenant'
	}

	const mockUnit = {
		id: mockUnitId,
		unit_number: '101',
		property_id: mockPropertyId
	}

	const mockProperty = {
		id: mockPropertyId,
		name: 'Test Property',
		owner_user_id: mockOwnerId
	}

	const mockOwner = {
		id: mockOwnerId,
		user_id: mockOwnerUserId,
		stripe_account_id: 'acct_test123',
		charges_enabled: true,
		default_platform_fee_percent: 2.5
	}

	const mockOwnerNotConnected = {
		...mockOwner,
		stripe_account_id: null,
		charges_enabled: false
	}

	const mockPaymentMethod = {
		id: mockPaymentMethodId,
		stripe_payment_method_id: 'pm_stripe_test',
		tenant_id: mockTenantId,
		stripe_customer_id: 'cus_test123'
	}

	const mockLeaseContext: LeaseContext = {
		lease: mockLease as any,
		tenant: mockTenant as any,
		tenantUser: mockTenantUser as any,
		unit: mockUnit as any,
		property: mockProperty as any,
		owner: mockOwner as any
	}

	const mockLeaseContextWithSubscription: LeaseContext = {
		...mockLeaseContext,
		lease: mockLeaseWithSubscription as any
	}

	const mockStripeSubscription = {
		id: mockStripeSubscriptionId,
		status: 'active',
		customer: 'cus_test123',
		items: { data: [{ id: 'si_test', price: { id: 'price_test', currency: 'usd', product: 'prod_test123' } }] }
	}

	// Helper to create query builder mock
	const createQueryBuilder = (returnData: any, shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		single: jest.fn().mockResolvedValue({
			data: shouldError ? null : returnData,
			error: shouldError ? { message: 'Not found' } : null
		}),
		update: jest.fn().mockReturnValue({
			eq: jest.fn().mockResolvedValue({ data: returnData, error: null })
		})
	})

	beforeEach(async () => {
		const mockStripe = {
			prices: {
				create: jest.fn().mockResolvedValue({ id: 'price_test123', product: 'prod_test123' })
			},
			subscriptions: {
				create: jest.fn().mockResolvedValue(mockStripeSubscription),
				update: jest.fn().mockResolvedValue(mockStripeSubscription),
				retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
				cancel: jest.fn().mockResolvedValue({ id: mockStripeSubscriptionId, status: 'canceled' })
			},
			customers: {
				create: jest.fn().mockResolvedValue({ id: 'cus_new123' })
			}
		}

		mockStripeClientService = {
			getClient: jest.fn().mockReturnValue(mockStripe)
		} as unknown as jest.Mocked<StripeClientService>

		const mockAdminClient = {
			from: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		const mockCacheManager = {
			get: jest.fn().mockResolvedValue(undefined),
			set: jest.fn().mockResolvedValue(undefined),
			del: jest.fn().mockResolvedValue(undefined)
		}

		mockQueryService = {
			loadLeaseContext: jest.fn(),
			mapLeaseContextToResponse: jest.fn(),
			getPaymentMethod: jest.fn(),
			findTenantByUserId: jest.fn()
		} as unknown as jest.Mocked<SubscriptionQueryService>

		const module = await Test.createTestingModule({
			providers: [
				SubscriptionBillingService,
				SubscriptionCacheService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: SubscriptionQueryService, useValue: mockQueryService },
				{ provide: CACHE_MANAGER, useValue: mockCacheManager },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<SubscriptionBillingService>(SubscriptionBillingService)
	})

	describe('createSubscription', () => {
		it('should create subscription with destination charges', async () => {
			// Setup mocks
			mockQueryService.findTenantByUserId.mockResolvedValue({
				tenant: mockTenant as any,
				user: mockTenantUser as any
			})
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContext)
			mockQueryService.getPaymentMethod.mockResolvedValue(mockPaymentMethod as any)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValue({
				id: mockLeaseId,
				status: 'active'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLease))

			const result = await service.createSubscription(mockTenantUserId, {
				leaseId: mockLeaseId,
				paymentMethodId: mockPaymentMethodId,
				amount: 1500,
				billingDayOfMonth: 1,
				currency: 'usd'
			})

			expect(result).toBeDefined()
			expect(result.status).toBe('active')

			// Verify Stripe was called with destination charges
			const stripe = mockStripeClientService.getClient()
			expect(stripe.subscriptions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					transfer_data: {
						destination: mockOwner.stripe_account_id
					}
				})
			)
		})

		it('should validate billing day between 1 and 28', async () => {
			mockQueryService.findTenantByUserId.mockResolvedValue({
				tenant: mockTenant as any,
				user: mockTenantUser as any
			})
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContext)
			mockQueryService.getPaymentMethod.mockResolvedValue(mockPaymentMethod as any)

			// Invalid billing day (29)
			await expect(
				service.createSubscription(mockTenantUserId, {
					leaseId: mockLeaseId,
					paymentMethodId: mockPaymentMethodId,
					amount: 1500,
					billingDayOfMonth: 29,
					currency: 'usd'
				})
			).rejects.toThrow(BadRequestException)

			// Invalid billing day (0)
			await expect(
				service.createSubscription(mockTenantUserId, {
					leaseId: mockLeaseId,
					paymentMethodId: mockPaymentMethodId,
					amount: 1500,
					billingDayOfMonth: 0,
					currency: 'usd'
				})
			).rejects.toThrow(BadRequestException)
		})

		it('should normalize amount to cents', async () => {
			// Use a lease context WITHOUT subscription (stripe_subscription_id is null)
			const leaseContextNoSub = {
				...mockLeaseContext,
				lease: { ...mockLease, stripe_subscription_id: null } as any
			}

			mockQueryService.findTenantByUserId.mockResolvedValue({
				tenant: mockTenant as any,
				user: mockTenantUser as any
			})
			mockQueryService.loadLeaseContext.mockResolvedValue(leaseContextNoSub)
			mockQueryService.getPaymentMethod.mockResolvedValue(mockPaymentMethod as any)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValue({
				id: mockLeaseId,
				status: 'active'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLease))

			await service.createSubscription(mockTenantUserId, {
				leaseId: mockLeaseId,
				paymentMethodId: mockPaymentMethodId,
				amount: 1500, // $15.00
				billingDayOfMonth: 1,
				currency: 'usd'
			})

			const stripe = mockStripeClientService.getClient()
			expect(stripe.prices.create).toHaveBeenCalledWith(
				expect.objectContaining({
					unit_amount: 150000 // 1500 * 100 cents
				})
			)
		})

		it('should throw BadRequestException if lease already has subscription', async () => {
			mockQueryService.findTenantByUserId.mockResolvedValue({
				tenant: mockTenant as any,
				user: mockTenantUser as any
			})
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContextWithSubscription)
			mockQueryService.getPaymentMethod.mockResolvedValue(mockPaymentMethod as any)

			await expect(
				service.createSubscription(mockTenantUserId, {
					leaseId: mockLeaseId,
					paymentMethodId: mockPaymentMethodId,
					amount: 1500,
					billingDayOfMonth: 1,
					currency: 'usd'
				})
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException if owner not Stripe connected', async () => {
			const contextWithUnconnectedOwner: LeaseContext = {
				...mockLeaseContext,
				owner: mockOwnerNotConnected as any
			}

			mockQueryService.findTenantByUserId.mockResolvedValue({
				tenant: mockTenant as any,
				user: mockTenantUser as any
			})
			mockQueryService.loadLeaseContext.mockResolvedValue(contextWithUnconnectedOwner)
			mockQueryService.getPaymentMethod.mockResolvedValue(mockPaymentMethod as any)

			await expect(
				service.createSubscription(mockTenantUserId, {
					leaseId: mockLeaseId,
					paymentMethodId: mockPaymentMethodId,
					amount: 1500,
					billingDayOfMonth: 1,
					currency: 'usd'
				})
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException if payment method belongs to different tenant', async () => {
			const wrongTenantPaymentMethod = {
				...mockPaymentMethod,
				tenant_id: 'different-tenant-id'
			}

			mockQueryService.findTenantByUserId.mockResolvedValue({
				tenant: mockTenant as any,
				user: mockTenantUser as any
			})
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContext)
			mockQueryService.getPaymentMethod.mockResolvedValue(wrongTenantPaymentMethod as any)

			await expect(
				service.createSubscription(mockTenantUserId, {
					leaseId: mockLeaseId,
					paymentMethodId: mockPaymentMethodId,
					amount: 1500,
					billingDayOfMonth: 1,
					currency: 'usd'
				})
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('updateSubscription', () => {
		it('should update amount with new price', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContextWithSubscription)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValue({
				id: mockLeaseId,
				amount: 2000,
				status: 'active'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLeaseWithSubscription))

			const result = await service.updateSubscription(mockLeaseId, mockTenantUserId, {
				amount: 2000
			})

			expect(result).toBeDefined()
			expect(result.amount).toBe(2000)

			const stripe = mockStripeClientService.getClient()
			expect(stripe.prices.create).toHaveBeenCalled()
			expect(stripe.subscriptions.update).toHaveBeenCalled()
		})

		it('should update billing day', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContextWithSubscription)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValue({
				id: mockLeaseId,
				billingDayOfMonth: 15,
				status: 'active'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLeaseWithSubscription))

			const result = await service.updateSubscription(mockLeaseId, mockTenantUserId, {
				billingDayOfMonth: 15
			})

			expect(result).toBeDefined()
			expect(result.billingDayOfMonth).toBe(15)

			const stripe = mockStripeClientService.getClient()
			expect(stripe.subscriptions.update).toHaveBeenCalledWith(
				mockStripeSubscriptionId,
				expect.objectContaining({
					billing_cycle_anchor: 'now',
					proration_behavior: 'none'
				})
			)
		})

		it('should update payment method', async () => {
			const newPaymentMethodId = 'pm-new-xyz'
			const newPaymentMethod = {
				...mockPaymentMethod,
				id: newPaymentMethodId,
				stripe_payment_method_id: 'pm_new_stripe'
			}

			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContextWithSubscription)
			mockQueryService.getPaymentMethod.mockResolvedValue(newPaymentMethod as any)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValue({
				id: mockLeaseId,
				paymentMethodId: newPaymentMethodId,
				status: 'active'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLeaseWithSubscription))

			const result = await service.updateSubscription(mockLeaseId, mockTenantUserId, {
				paymentMethodId: newPaymentMethodId
			})

			expect(result).toBeDefined()
			expect(result.paymentMethodId).toBe(newPaymentMethodId)

			const stripe = mockStripeClientService.getClient()
			expect(stripe.subscriptions.update).toHaveBeenCalledWith(
				mockStripeSubscriptionId,
				expect.objectContaining({
					default_payment_method: newPaymentMethod.stripe_payment_method_id
				})
			)
		})

		it('should throw BadRequestException if no active subscription', async () => {
			// Lease without stripe_subscription_id
			const leaseContextNoSub = {
				...mockLeaseContext,
				lease: { ...mockLease, stripe_subscription_id: null } as any
			}
			mockQueryService.loadLeaseContext.mockResolvedValue(leaseContextNoSub)

			await expect(
				service.updateSubscription(mockLeaseId, mockTenantUserId, { amount: 2000 })
			).rejects.toThrow(BadRequestException)
		})
	})
})
