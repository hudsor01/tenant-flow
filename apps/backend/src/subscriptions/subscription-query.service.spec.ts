/**
 * SubscriptionQueryService Tests (TDD Red Phase)
 * Tests written BEFORE implementation
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { SilentLogger } from '../__test__/silent-logger'
import { AppLogger } from '../logger/app-logger.service'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionCacheService } from './subscription-cache.service'
import { SubscriptionQueryService } from './subscription-query.service'

describe('SubscriptionQueryService', () => {
	let service: SubscriptionQueryService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockStripeClientService: jest.Mocked<StripeClientService>

	// Test data
	const mockUserId = 'user-123'
	const mockTenantUserId = 'tenant-user-456'
	const mockOwnerUserId = 'owner-user-789'
	const mockLeaseId = 'lease-abc'
	const mockTenantId = 'tenant-def'
	const mockOwnerId = 'owner-ghi'
	const mockUnitId = 'unit-jkl'
	const mockPropertyId = 'property-mno'
	const mockStripeSubscriptionId = 'sub_test123'

	const mockLease = {
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

	const mockStripeSubscription = {
		id: mockStripeSubscriptionId,
		status: 'active',
		customer: 'cus_test123',
		current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
		items: { data: [{ id: 'si_test', price: { id: 'price_test', currency: 'usd' } }] },
		pause_collection: null,
		canceled_at: null
	}

	// Helper to create query builder mock
	const createQueryBuilder = (returnData: any, shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		in: jest.fn().mockReturnThis(),
		not: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		single: jest.fn().mockResolvedValue({
			data: shouldError ? null : returnData,
			error: shouldError ? { message: 'Not found' } : null
		}),
		maybeSingle: jest.fn().mockResolvedValue({
			data: returnData,
			error: null
		})
	})

	beforeEach(async () => {
		const mockStripe = {
			subscriptions: {
				retrieve: jest.fn().mockResolvedValue(mockStripeSubscription)
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

		const module = await Test.createTestingModule({
			providers: [
				SubscriptionQueryService,
				SubscriptionCacheService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: CACHE_MANAGER, useValue: mockCacheManager },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<SubscriptionQueryService>(SubscriptionQueryService)
	})

	describe('getSubscription', () => {
		it('should return subscription for valid lease when user is tenant', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			// Setup query chain for loadLeaseContext
			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder(mockLease)) // leases
				.mockReturnValueOnce(createQueryBuilder(mockTenant)) // tenants
				.mockReturnValueOnce(createQueryBuilder(mockTenantUser)) // users
				.mockReturnValueOnce(createQueryBuilder(mockUnit)) // units
				.mockReturnValueOnce(createQueryBuilder(mockProperty)) // properties
				.mockReturnValueOnce(createQueryBuilder(mockOwner)) // property_owners
				.mockReturnValueOnce(createQueryBuilder({ id: 'pm-123' })) // payment_methods (default)
				.mockReturnValueOnce(createQueryBuilder({ id: 'pm-123' })) // payment_methods (fallback)

			const result = await service.getSubscription(mockLeaseId, mockTenantUserId)

			expect(result).toBeDefined()
			expect(result.id).toBe(mockLeaseId)
			expect(result.leaseId).toBe(mockLeaseId)
			expect(result.tenantId).toBe(mockTenantId)
			expect(result.status).toBe('active')
		})

		it('should return subscription when user is owner', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder(mockLease))
				.mockReturnValueOnce(createQueryBuilder(mockTenant))
				.mockReturnValueOnce(createQueryBuilder(mockTenantUser))
				.mockReturnValueOnce(createQueryBuilder(mockUnit))
				.mockReturnValueOnce(createQueryBuilder(mockProperty))
				.mockReturnValueOnce(createQueryBuilder(mockOwner))
				.mockReturnValueOnce(createQueryBuilder({ id: 'pm-123' }))
				.mockReturnValueOnce(createQueryBuilder({ id: 'pm-123' }))

			const result = await service.getSubscription(mockLeaseId, mockOwnerUserId)

			expect(result).toBeDefined()
			expect(result.ownerId).toBe(mockOwnerUserId)
		})

		it('should throw NotFoundException when lease has no subscription', async () => {
			const leaseWithoutSubscription = { ...mockLease, stripe_subscription_id: null }
			const mockClient = mockSupabaseService.getAdminClient()

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder(leaseWithoutSubscription))
				.mockReturnValueOnce(createQueryBuilder(mockTenant))
				.mockReturnValueOnce(createQueryBuilder(mockTenantUser))
				.mockReturnValueOnce(createQueryBuilder(mockUnit))
				.mockReturnValueOnce(createQueryBuilder(mockProperty))
				.mockReturnValueOnce(createQueryBuilder(mockOwner))

			await expect(service.getSubscription(mockLeaseId, mockTenantUserId))
				.rejects.toThrow(NotFoundException)
		})

		it('should throw ForbiddenException for unauthorized user', async () => {
			const unauthorizedUserId = 'unauthorized-user'
			const mockClient = mockSupabaseService.getAdminClient()

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder(mockLease))
				.mockReturnValueOnce(createQueryBuilder(mockTenant))
				.mockReturnValueOnce(createQueryBuilder(mockTenantUser))
				.mockReturnValueOnce(createQueryBuilder(mockUnit))
				.mockReturnValueOnce(createQueryBuilder(mockProperty))
				.mockReturnValueOnce(createQueryBuilder(mockOwner))

			await expect(service.getSubscription(mockLeaseId, unauthorizedUserId))
				.rejects.toThrow(ForbiddenException)
		})

		it('should throw NotFoundException when lease not found', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValueOnce(createQueryBuilder(null, true))

			await expect(service.getSubscription('nonexistent-lease', mockUserId))
				.rejects.toThrow(NotFoundException)
		})
	})

	describe('listSubscriptions', () => {
		it('should return empty array when user has no tenant or owner profile', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder(null)) // no tenant
				.mockReturnValueOnce(createQueryBuilder(null)) // no owner

			const result = await service.listSubscriptions('unknown-user')

			expect(result).toEqual([])
		})

		it('should call findTenantByUserId and findOwnerByUserId', async () => {
			// Spy on the internal methods to verify they are called
			const findTenantSpy = jest.spyOn(service, 'findTenantByUserId').mockResolvedValue(null)
			const findOwnerSpy = jest.spyOn(service, 'findOwnerByUserId').mockResolvedValue(null)

			const result = await service.listSubscriptions('some-user')

			expect(findTenantSpy).toHaveBeenCalledWith('some-user')
			expect(findOwnerSpy).toHaveBeenCalledWith('some-user')
			expect(result).toEqual([])
		})

		it('should return subscriptions when tenant has leases', async () => {
			// Mock findTenantByUserId to return a tenant
			jest.spyOn(service, 'findTenantByUserId').mockResolvedValue({
				tenant: mockTenant as any,
				user: mockTenantUser as any
			})
			jest.spyOn(service, 'findOwnerByUserId').mockResolvedValue(null)

			// Mock the lease context loading
			const mockLeaseContext = {
				lease: mockLease as any,
				tenant: mockTenant as any,
				tenantUser: mockTenantUser as any,
				unit: mockUnit as any,
				property: mockProperty as any,
				owner: mockOwner as any
			}

			jest.spyOn(service, 'loadLeaseContext').mockResolvedValue(mockLeaseContext)

			// Mock the admin client for getLeasesForTenant
			const mockClient = mockSupabaseService.getAdminClient()
			const leasesQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				not: jest.fn().mockResolvedValue({ data: [mockLease], error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(leasesQueryBuilder)

			// Mock mapLeaseContextToResponse
			const mockResponse = {
				id: mockLeaseId,
				leaseId: mockLeaseId,
				tenantId: mockTenantId,
				ownerId: mockOwnerUserId,
				status: 'active',
				updatedAt: '2025-01-01T00:00:00Z'
			} as any

			jest.spyOn(service, 'mapLeaseContextToResponse').mockResolvedValue(mockResponse)

			const result = await service.listSubscriptions(mockTenantUserId)

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBe(1)
			expect(result[0]!.id).toBe(mockLeaseId)
		})
	})

	describe('loadLeaseContext', () => {
		it('should load full lease context with all relationships', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder(mockLease))
				.mockReturnValueOnce(createQueryBuilder(mockTenant))
				.mockReturnValueOnce(createQueryBuilder(mockTenantUser))
				.mockReturnValueOnce(createQueryBuilder(mockUnit))
				.mockReturnValueOnce(createQueryBuilder(mockProperty))
				.mockReturnValueOnce(createQueryBuilder(mockOwner))

			const result = await service.loadLeaseContext(mockLeaseId)

			expect(result).toEqual({
				lease: mockLease,
				tenant: mockTenant,
				tenantUser: mockTenantUser,
				unit: mockUnit,
				property: mockProperty,
				owner: mockOwner
			})
		})

		it('should throw NotFoundException when lease not found', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValueOnce(createQueryBuilder(null, true))

			await expect(service.loadLeaseContext('nonexistent'))
				.rejects.toThrow(NotFoundException)
		})
	})

	describe('mapLeaseContextToResponse', () => {
		it('should map lease context to response format', async () => {
			const context = {
				lease: mockLease,
				tenant: mockTenant,
				tenantUser: mockTenantUser,
				unit: mockUnit,
				property: mockProperty,
				owner: mockOwner
			}

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder({ id: 'pm-123' }))
				.mockReturnValueOnce(createQueryBuilder({ id: 'pm-123' }))

			const result = await service.mapLeaseContextToResponse(context as any)

			expect(result).toMatchObject({
				id: mockLeaseId,
				leaseId: mockLeaseId,
				tenantId: mockTenantId,
				ownerId: mockOwnerUserId,
				stripeSubscriptionId: mockStripeSubscriptionId,
				amount: 150000,
				currency: 'usd',
				billingDayOfMonth: 1,
				status: 'active'
			})
		})

		it('should use provided stripe subscription when passed', async () => {
			const context = {
				lease: mockLease,
				tenant: mockTenant,
				tenantUser: mockTenantUser,
				unit: mockUnit,
				property: mockProperty,
				owner: mockOwner
			}

			const customStripeSubscription = {
				...mockStripeSubscription,
				status: 'paused'
			}

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createQueryBuilder({ id: 'pm-123' }))
				.mockReturnValueOnce(createQueryBuilder({ id: 'pm-123' }))

			const result = await service.mapLeaseContextToResponse(context as any, {
				stripeSubscription: customStripeSubscription as any
			})

			expect(result.status).toBe('paused')
		})
	})

	describe('getPaymentMethod', () => {
		it('should return payment method by ID', async () => {
			const mockPaymentMethod = {
				id: 'pm-123',
				stripe_payment_method_id: 'pm_stripe123',
				tenant_id: mockTenantId
			}

			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValueOnce(createQueryBuilder(mockPaymentMethod))

			const result = await service.getPaymentMethod('pm-123')

			expect(result).toEqual(mockPaymentMethod)
		})

		it('should throw NotFoundException when payment method not found', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValueOnce(createQueryBuilder(null, true))

			await expect(service.getPaymentMethod('nonexistent'))
				.rejects.toThrow(NotFoundException)
		})
	})
})
