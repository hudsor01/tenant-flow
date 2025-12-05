/**
 * SubscriptionLifecycleService Tests (TDD Red Phase)
 * Tests written BEFORE implementation
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { SilentLogger } from '../__test__/silent-logger'
import { AppLogger } from '../logger/app-logger.service'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionCacheService } from './subscription-cache.service'
import { SubscriptionQueryService } from './subscription-query.service'
import type { LeaseContext } from './subscription-query.service'
import { SubscriptionLifecycleService } from './subscription-lifecycle.service'

describe('SubscriptionLifecycleService', () => {
	let service: SubscriptionLifecycleService
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

	const mockLeaseWithSubscription = {
		id: mockLeaseId,
		primary_tenant_id: mockTenantId,
		rent_amount: 150000,
		rent_currency: 'usd',
		payment_day: 1,
		auto_pay_enabled: true,
		stripe_subscription_id: mockStripeSubscriptionId,
		unit_id: mockUnitId,
		created_at: '2025-01-01T00:00:00Z',
		updated_at: '2025-01-01T00:00:00Z'
	}

	const mockLeaseNoSubscription = {
		...mockLeaseWithSubscription,
		stripe_subscription_id: null,
		auto_pay_enabled: false
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
		property_owner_id: mockOwnerId
	}

	const mockOwner = {
		id: mockOwnerId,
		user_id: mockOwnerUserId,
		stripe_account_id: 'acct_test123',
		charges_enabled: true,
		default_platform_fee_percent: 2.5
	}

	const mockLeaseContext: LeaseContext = {
		lease: mockLeaseWithSubscription as any,
		tenant: mockTenant as any,
		tenantUser: mockTenantUser as any,
		unit: mockUnit as any,
		property: mockProperty as any,
		owner: mockOwner as any
	}

	const mockLeaseContextNoSubscription: LeaseContext = {
		...mockLeaseContext,
		lease: mockLeaseNoSubscription as any
	}

	const mockStripeSubscription = {
		id: mockStripeSubscriptionId,
		status: 'active',
		customer: 'cus_test123',
		current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
		items: { data: [{ id: 'si_test', price: { id: 'price_test', currency: 'usd' } }] },
		pause_collection: null,
		canceled_at: null
	}

	const mockStripeSubscriptionCanceled = {
		...mockStripeSubscription,
		status: 'canceled',
		canceled_at: Math.floor(Date.now() / 1000)
	}

	// Helper to create query builder mock
	const createQueryBuilder = (returnData: any, shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		single: jest.fn().mockResolvedValue({
			data: shouldError ? null : returnData,
			error: shouldError ? { message: 'Error' } : null
		}),
		update: jest.fn().mockReturnValue({
			eq: jest.fn().mockResolvedValue({ data: returnData, error: null })
		})
	})

	beforeEach(async () => {
		const mockStripe = {
			subscriptions: {
				update: jest.fn().mockResolvedValue(mockStripeSubscription),
				cancel: jest.fn().mockResolvedValue(mockStripeSubscriptionCanceled)
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
			mapLeaseContextToResponse: jest.fn()
		} as unknown as jest.Mocked<SubscriptionQueryService>

		const module = await Test.createTestingModule({
			providers: [
				SubscriptionLifecycleService,
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

		service = module.get<SubscriptionLifecycleService>(SubscriptionLifecycleService)
	})

	describe('pauseSubscription', () => {
		it('should pause active subscription', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContext)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValue({
				id: mockLeaseId,
				status: 'paused'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLeaseWithSubscription))

			const result = await service.pauseSubscription(mockLeaseId, mockTenantUserId)

			expect(result.success).toBe(true)
			expect(result.message).toContain('paused')

			const stripe = mockStripeClientService.getClient()
			expect(stripe.subscriptions.update).toHaveBeenCalledWith(
				mockStripeSubscriptionId,
				expect.objectContaining({
					pause_collection: { behavior: 'keep_as_draft' }
				})
			)
		})

		it('should throw BadRequestException if no active subscription', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContextNoSubscription)

			await expect(
				service.pauseSubscription(mockLeaseId, mockTenantUserId)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw ForbiddenException if user is not tenant', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContext)

			await expect(
				service.pauseSubscription(mockLeaseId, 'wrong-user-id')
			).rejects.toThrow(ForbiddenException)
		})
	})

	describe('resumeSubscription', () => {
		it('should resume paused subscription', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContext)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValue({
				id: mockLeaseId,
				status: 'active'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLeaseWithSubscription))

			const result = await service.resumeSubscription(mockLeaseId, mockTenantUserId)

			expect(result.success).toBe(true)
			expect(result.message).toContain('resumed')

			const stripe = mockStripeClientService.getClient()
			expect(stripe.subscriptions.update).toHaveBeenCalledWith(
				mockStripeSubscriptionId,
				expect.objectContaining({
					pause_collection: null
				})
			)
		})

		it('should throw BadRequestException if no active subscription', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContextNoSubscription)

			await expect(
				service.resumeSubscription(mockLeaseId, mockTenantUserId)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('cancelSubscription', () => {
		it('should cancel subscription at period end', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValue(mockLeaseContext)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValue({
				id: mockLeaseId,
				status: 'canceled'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLeaseWithSubscription))

			const result = await service.cancelSubscription(mockLeaseId, mockTenantUserId)

			expect(result.success).toBe(true)
			expect(result.message).toContain('canceled')

			const stripe = mockStripeClientService.getClient()
			expect(stripe.subscriptions.update).toHaveBeenCalledWith(
				mockStripeSubscriptionId,
				expect.objectContaining({
					cancel_at_period_end: true
				})
			)
		})

		it('should throw BadRequestException if no active subscription', async () => {
			mockQueryService.loadLeaseContext.mockResolvedValueOnce(mockLeaseContextNoSubscription)

			await expect(
				service.cancelSubscription(mockLeaseId, mockTenantUserId)
			).rejects.toThrow(BadRequestException)
		})

		it('should clear stripe_subscription_id from lease after cancellation', async () => {
			// Fresh lease context for this test - need a fresh copy since implementation mutates it
			const freshLeaseContext: LeaseContext = {
				lease: {
					...mockLeaseWithSubscription,
					stripe_subscription_id: mockStripeSubscriptionId // Explicitly set to avoid mutation issues
				} as any,
				tenant: { ...mockTenant } as any,
				tenantUser: { ...mockTenantUser } as any,
				unit: { ...mockUnit } as any,
				property: { ...mockProperty } as any,
				owner: { ...mockOwner } as any
			}

			mockQueryService.loadLeaseContext.mockResolvedValueOnce(freshLeaseContext)
			mockQueryService.mapLeaseContextToResponse.mockResolvedValueOnce({
				id: mockLeaseId,
				status: 'canceled'
			} as any)

			const mockClient = mockSupabaseService.getAdminClient()
			const updateBuilder = createQueryBuilder(mockLeaseWithSubscription)
			;(mockClient.from as jest.Mock).mockReturnValue(updateBuilder)

			await service.cancelSubscription(mockLeaseId, mockTenantUserId)

			expect(updateBuilder.update).toHaveBeenCalledWith(
				expect.objectContaining({
					auto_pay_enabled: false,
					stripe_subscription_id: null
				})
			)
		})
	})
})
