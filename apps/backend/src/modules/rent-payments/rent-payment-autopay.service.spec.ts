/**
 * RentPaymentAutopayService Tests (TDD Red Phase)
 * Tests written BEFORE implementation
 */

import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { StripeTenantService } from '../billing/stripe-tenant.service'
import { RentPaymentAutopayService } from './rent-payment-autopay.service'
import { RentPaymentContextService } from './rent-payment-context.service'
import type { Lease, Tenant, User } from './types'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'


describe('RentPaymentAutopayService', () => {
	let service: RentPaymentAutopayService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockStripeClientService: jest.Mocked<StripeClientService>
	let mockStripeTenantService: jest.Mocked<StripeTenantService>
	let mockContextService: jest.Mocked<RentPaymentContextService>

	// Test data
	const mockTenantUserId = 'tenant-user-123'
	const mockOwnerUserId = 'owner-user-456'
	const mockTenantId = 'tenant-789'
	const mockLeaseId = 'lease-abc'
	const mockSubscriptionId = 'sub_test123'
	const mockStripeCustomerId = 'cus_test123'
	const mockStripeAccountId = 'acct_test456'
	const mockPaymentMethodId = 'pm-xyz'

	const mockTenant: Partial<Tenant> = {
		id: mockTenantId,
		user_id: mockTenantUserId,
		stripe_customer_id: mockStripeCustomerId
	}

	const mockTenantUser: Partial<User> = {
		id: mockTenantUserId,
		email: 'tenant@example.com',
		first_name: 'Test',
		last_name: 'Tenant'
	}

	const mockLease: Partial<Lease> = {
		id: mockLeaseId,
		primary_tenant_id: mockTenantId,
		rent_amount: 150000,
		stripe_subscription_id: null,
		unit_id: 'unit-123'
	}

	const mockLeaseWithSub: Partial<Lease> = {
		...mockLease,
		stripe_subscription_id: mockSubscriptionId
	}

	const mockOwnerUser: Partial<User> = {
		id: mockOwnerUserId,
		email: 'owner@example.com'
	}

	const mockTenantContext = {
		tenant: mockTenant as Tenant,
		tenantUser: mockTenantUser as User
	}

	const mockLeaseContext = {
		lease: mockLease as Lease,
		ownerUser: mockOwnerUser as User,
		stripeAccountId: mockStripeAccountId
	}

	const mockLeaseContextWithSub = {
		...mockLeaseContext,
		lease: mockLeaseWithSub as Lease
	}

	const mockStripeCustomer = {
		id: mockStripeCustomerId,
		email: 'tenant@example.com'
	}

	const mockStripeSubscription = {
		id: mockSubscriptionId,
		status: 'active',
		current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30
	}

	// Helper to create query builder mock
	const createQueryBuilder = <T>(returnData: T, shouldError = false) => ({
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnValue({
			eq: jest.fn().mockResolvedValue({
				data: returnData,
				error: shouldError ? { message: 'Error' } : null
			})
		}),
		single: jest.fn().mockResolvedValue({
			data: shouldError ? null : returnData,
			error: shouldError ? { message: 'Error' } : null
		})
	})

	beforeEach(async () => {
		const mockStripe = {
			subscriptions: {
				create: jest.fn().mockResolvedValue(mockStripeSubscription),
				cancel: jest.fn().mockResolvedValue({ id: mockSubscriptionId, status: 'canceled' }),
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

		mockStripeTenantService = {
			getStripeCustomerForTenant: jest.fn().mockResolvedValue(mockStripeCustomer),
			createStripeCustomerForTenant: jest.fn().mockResolvedValue(mockStripeCustomer),
			attachPaymentMethod: jest.fn().mockResolvedValue({ success: true })
		} as unknown as jest.Mocked<StripeTenantService>

		mockContextService = {
			getTenantContext: jest.fn().mockResolvedValue(mockTenantContext),
			getLeaseContext: jest.fn().mockResolvedValue(mockLeaseContext)
		} as unknown as jest.Mocked<RentPaymentContextService>

		const module = await Test.createTestingModule({
			providers: [
				RentPaymentAutopayService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: StripeTenantService, useValue: mockStripeTenantService },
				{ provide: RentPaymentContextService, useValue: mockContextService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<RentPaymentAutopayService>(RentPaymentAutopayService)
	})

	describe('setupTenantAutopay', () => {
		it('should create Stripe subscription and update lease', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLeaseWithSub))

			const result = await service.setupTenantAutopay(
				{
					tenant_id: mockTenantId,
					lease_id: mockLeaseId,
					paymentMethodId: mockPaymentMethodId
				},
				mockTenantUserId
			)

			expect(result.subscriptionId).toBe(mockSubscriptionId)
			expect(result.status).toBe('active')
		})

		it('should throw BadRequestException if autopay already enabled', async () => {
			mockContextService.getLeaseContext.mockResolvedValue(mockLeaseContextWithSub)

			await expect(
				service.setupTenantAutopay(
					{
						tenant_id: mockTenantId,
						lease_id: mockLeaseId,
						paymentMethodId: mockPaymentMethodId
					},
					mockTenantUserId
				)
			).rejects.toThrow(BadRequestException)
		})

		it('should create Stripe customer if not exists', async () => {
			mockStripeTenantService.getStripeCustomerForTenant.mockResolvedValue(null)
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(mockLeaseWithSub))

			await service.setupTenantAutopay(
				{
					tenant_id: mockTenantId,
					lease_id: mockLeaseId,
					paymentMethodId: mockPaymentMethodId
				},
				mockTenantUserId
			)

			expect(mockStripeTenantService.createStripeCustomerForTenant).toHaveBeenCalled()
		})
	})

	describe('cancelTenantAutopay', () => {
		it('should cancel Stripe subscription and clear lease subscription_id', async () => {
			mockContextService.getLeaseContext.mockResolvedValue(mockLeaseContextWithSub)
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder({ stripe_subscription_id: mockSubscriptionId }))

			const result = await service.cancelTenantAutopay(
				{ tenant_id: mockTenantId, lease_id: mockLeaseId },
				mockTenantUserId
			)

			expect(result.success).toBe(true)

			const stripe = mockStripeClientService.getClient()
			expect(stripe.subscriptions.cancel).toHaveBeenCalledWith(mockSubscriptionId)
		})

		it('should throw BadRequestException if autopay not enabled', async () => {
			mockContextService.getLeaseContext.mockResolvedValue(mockLeaseContext)
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(
				createQueryBuilder({ stripe_subscription_id: null })
			)

			await expect(
				service.cancelTenantAutopay(
					{ tenant_id: mockTenantId, lease_id: mockLeaseId },
					mockTenantUserId
				)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getAutopayStatus', () => {
		it('should return enabled status with subscription details', async () => {
			mockContextService.getLeaseContext.mockResolvedValue(mockLeaseContextWithSub)
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(
				createQueryBuilder({ stripe_subscription_id: mockSubscriptionId })
			)

			const result = await service.getAutopayStatus(
				{ tenant_id: mockTenantId, lease_id: mockLeaseId },
				mockTenantUserId
			)

			expect(result.enabled).toBe(true)
			expect(result.subscriptionId).toBe(mockSubscriptionId)
			expect(result.status).toBe('active')
			expect(result.nextPaymentDate).not.toBeNull()
		})

		it('should return disabled status when no subscription', async () => {
			mockContextService.getLeaseContext.mockResolvedValue(mockLeaseContext)
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(
				createQueryBuilder({ stripe_subscription_id: null })
			)

			const result = await service.getAutopayStatus(
				{ tenant_id: mockTenantId, lease_id: mockLeaseId },
				mockTenantUserId
			)

			expect(result.enabled).toBe(false)
			expect(result.subscriptionId).toBeNull()
			expect(result.status).toBeNull()
		})

		it('should throw NotFoundException when lease not found', async () => {
			mockContextService.getLeaseContext.mockResolvedValue(mockLeaseContext)
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createQueryBuilder(null, true))

			await expect(
				service.getAutopayStatus(
					{ tenant_id: mockTenantId, lease_id: mockLeaseId },
					mockTenantUserId
				)
			).rejects.toThrow(NotFoundException)
		})
	})
})
