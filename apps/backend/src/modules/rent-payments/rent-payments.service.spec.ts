/**
 * RentPaymentsService (Facade) Tests
 * Tests delegation to specialized services and remaining methods
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { StripeTenantService } from '../billing/stripe-tenant.service'
import { RentPaymentsService } from './rent-payments.service'
import { RentPaymentQueryService } from './rent-payment-query.service'
import { RentPaymentAutopayService } from './rent-payment-autopay.service'
import { RentPaymentContextService } from './rent-payment-context.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

type TenantRow = Database['public']['Tables']['tenants']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type LeaseRow = Database['public']['Tables']['leases']['Row']
type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row']
type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']
type StripeOwnerRow = Database['public']['Tables']['stripe_connected_accounts']['Row']

type PaymentHistoryResponse = Awaited<
	ReturnType<RentPaymentQueryService['getPaymentHistory']>
>
type SubscriptionPaymentHistoryResponse = Awaited<
	ReturnType<RentPaymentQueryService['getSubscriptionPaymentHistory']>
>
type FailedPaymentResponse = Awaited<
	ReturnType<RentPaymentQueryService['getFailedPaymentAttempts']>
>
type SubscriptionFailedPaymentResponse = Awaited<
	ReturnType<RentPaymentQueryService['getSubscriptionFailedAttempts']>
>
type AutopaySetupResponse = Awaited<
	ReturnType<RentPaymentAutopayService['setupTenantAutopay']>
>
type AutopayStatusResponse = Awaited<
	ReturnType<RentPaymentAutopayService['getAutopayStatus']>
>
type TenantContext = Awaited<
	ReturnType<RentPaymentContextService['getTenantContext']>
>
type LeaseContext = Awaited<
	ReturnType<RentPaymentContextService['getLeaseContext']>
>

const createSingleQueryMock = <T>(data: T) => {
	const builder: {
		select: jest.Mock
		eq: jest.Mock
		single: jest.Mock
	} = {
		select: jest.fn(),
		eq: jest.fn(),
		single: jest.fn()
	}
	builder.select = jest.fn(() => builder)
	builder.eq = jest.fn(() => builder)
	builder.single = jest.fn(() => Promise.resolve({ data, error: null }))
	return builder
}

describe('RentPaymentsService (Facade)', () => {
	let service: RentPaymentsService
	let mockQueryService: jest.Mocked<RentPaymentQueryService>
	let mockAutopayService: jest.Mocked<RentPaymentAutopayService>
	let mockContextService: jest.Mocked<RentPaymentContextService>

	const adminClient: SupabaseClient<Database> = {
		from: jest.fn()
	} as unknown as SupabaseClient<Database>
	const mockSupabaseService = {
		getAdminClient: jest.fn(() => adminClient)
	}
	const mockStripe = {
		paymentIntents: { create: jest.fn(), retrieve: jest.fn() }
	}
	const mockStripeClientService = {
		getClient: jest.fn(() => mockStripe)
	}
	const mockStripeTenantService = {
		getStripeCustomerForTenant: jest.fn(),
		createStripeCustomerForTenant: jest.fn(),
		attachPaymentMethodToCustomer: jest.fn(),
		detachPaymentMethodFromCustomer: jest.fn()
	}

	const mockToken = 'valid-token'
	const mockUserId = 'user-123'
	const mockTenantId = 'tenant-456'
	const mockLeaseId = 'lease-789'
	const mockSubscriptionId = 'sub_test123'

	beforeEach(async () => {
		adminClient.from.mockReset()

		mockQueryService = {
			getPaymentHistory: jest.fn(),
			getSubscriptionPaymentHistory: jest.fn(),
			getFailedPaymentAttempts: jest.fn(),
			getSubscriptionFailedAttempts: jest.fn(),
			findLeaseBySubscription: jest.fn()
		} as unknown as jest.Mocked<RentPaymentQueryService>

		mockAutopayService = {
			setupTenantAutopay: jest.fn(),
			cancelTenantAutopay: jest.fn(),
			getAutopayStatus: jest.fn()
		} as unknown as jest.Mocked<RentPaymentAutopayService>

		mockContextService = {
			getTenantContext: jest.fn(),
			getLeaseContext: jest.fn(),
			verifyTenantAccess: jest.fn()
		} as unknown as jest.Mocked<RentPaymentContextService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RentPaymentsService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: StripeTenantService, useValue: mockStripeTenantService },
				{ provide: RentPaymentQueryService, useValue: mockQueryService },
				{ provide: RentPaymentAutopayService, useValue: mockAutopayService },
				{ provide: RentPaymentContextService, useValue: mockContextService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<RentPaymentsService>(RentPaymentsService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('Query method delegation', () => {
		it('should delegate getPaymentHistory to query service', async () => {
			const mockPayments = [{ id: 'payment-1' }] as RentPaymentRow[]
			mockQueryService.getPaymentHistory.mockResolvedValue(
				mockPayments as PaymentHistoryResponse
			)

			const result = await service.getPaymentHistory(mockToken)

			expect(mockQueryService.getPaymentHistory).toHaveBeenCalledWith(mockToken)
			expect(result).toBe(mockPayments)
		})

		it('should delegate getSubscriptionPaymentHistory to query service', async () => {
			const mockPayments = [{ id: 'payment-1' }] as RentPaymentRow[]
			mockQueryService.getSubscriptionPaymentHistory.mockResolvedValue(
				mockPayments as SubscriptionPaymentHistoryResponse
			)

			const result = await service.getSubscriptionPaymentHistory(mockSubscriptionId, mockToken)

			expect(mockQueryService.getSubscriptionPaymentHistory).toHaveBeenCalledWith(
				mockSubscriptionId,
				mockToken
			)
			expect(result).toBe(mockPayments)
		})

		it('should delegate getFailedPaymentAttempts to query service', async () => {
			const mockPayments = [{ id: 'payment-failed' }] as RentPaymentRow[]
			mockQueryService.getFailedPaymentAttempts.mockResolvedValue(
				mockPayments as FailedPaymentResponse
			)

			const result = await service.getFailedPaymentAttempts(mockToken)

			expect(mockQueryService.getFailedPaymentAttempts).toHaveBeenCalledWith(mockToken)
			expect(result).toBe(mockPayments)
		})

		it('should delegate getSubscriptionFailedAttempts to query service', async () => {
			const mockPayments = [{ id: 'payment-failed' }] as RentPaymentRow[]
			mockQueryService.getSubscriptionFailedAttempts.mockResolvedValue(
				mockPayments as SubscriptionFailedPaymentResponse
			)

			const result = await service.getSubscriptionFailedAttempts(mockSubscriptionId, mockToken)

			expect(mockQueryService.getSubscriptionFailedAttempts).toHaveBeenCalledWith(
				mockSubscriptionId,
				mockToken
			)
			expect(result).toBe(mockPayments)
		})
	})

	describe('Autopay method delegation', () => {
		it('should delegate setupTenantAutopay to autopay service', async () => {
			const mockResponse = { subscriptionId: mockSubscriptionId, status: 'active' }
			mockAutopayService.setupTenantAutopay.mockResolvedValue(
				mockResponse as AutopaySetupResponse
			)

			const params = { tenant_id: mockTenantId, lease_id: mockLeaseId }
			const result = await service.setupTenantAutopay(params, mockUserId)

			expect(mockAutopayService.setupTenantAutopay).toHaveBeenCalledWith(params, mockUserId)
			expect(result).toBe(mockResponse)
		})

		it('should delegate cancelTenantAutopay to autopay service', async () => {
			const mockResponse = { success: true }
			mockAutopayService.cancelTenantAutopay.mockResolvedValue(mockResponse)

			const params = { tenant_id: mockTenantId, lease_id: mockLeaseId }
			const result = await service.cancelTenantAutopay(params, mockUserId)

			expect(mockAutopayService.cancelTenantAutopay).toHaveBeenCalledWith(params, mockUserId)
			expect(result).toBe(mockResponse)
		})

		it('should delegate getAutopayStatus to autopay service', async () => {
			const mockResponse = {
				enabled: true,
				subscriptionId: mockSubscriptionId,
				status: 'active',
				nextPaymentDate: '2025-02-01'
			}
			mockAutopayService.getAutopayStatus.mockResolvedValue(
				mockResponse as AutopayStatusResponse
			)

			const params = { tenant_id: mockTenantId, lease_id: mockLeaseId }
			const result = await service.getAutopayStatus(params, mockUserId)

			expect(mockAutopayService.getAutopayStatus).toHaveBeenCalledWith(params, mockUserId)
			expect(result).toBe(mockResponse)
		})
	})

	describe('createOneTimePayment', () => {
		const tenantUser = {
			id: 'user123',
			stripe_customer_id: 'cus_existing',
			first_name: 'Test',
			last_name: 'Tenant',
			email: 'tenant@example.com'
		} as UserRow

		const tenant = {
			id: 'tenant123',
			user_id: 'user123',
			email: 'tenant@example.com',
			first_name: 'Test',
			last_name: 'Tenant'
		} as TenantRow

		const lease = {
			id: 'lease123',
			tenant_id: 'tenant123',
			primary_tenant_id: 'tenant123',
			rent_amount: 1500,
			unit_id: 'unit123'
		} as LeaseRow

		const ownerUser = {
			id: 'owner123',
			stripe_account_id: 'acct_456'
		} as StripeOwnerRow

		const tenantPaymentMethod = {
			stripe_payment_method_id: 'pm_123',
			stripe_customer_id: 'cus_existing',
			type: 'card',
			tenant_id: 'tenant123'
		} as PaymentMethodRow

		const rentPaymentRecord = {
			id: 'payment123',
			tenant_id: 'user123',
			owner_id: 'owner123',
			lease_id: 'lease123',
			amount: 150000,
			status: 'succeeded'
		} as RentPaymentRow

		beforeEach(() => {
			const paymentIntent = {
				id: 'pi_123',
				status: 'succeeded',
				amount: 150000,
				latest_charge: {
					id: 'ch_123',
					receiptUrl: 'https://stripe.com/receipt'
				}
			} as unknown as Stripe.Response<Stripe.PaymentIntent>

			const mockStripeCustomer = {
				id: 'cus_existing',
				email: 'tenant@example.com',
				name: 'Test Tenant'
			} as unknown as Stripe.Customer

			jest
				.spyOn(service['stripe'].paymentIntents, 'create')
				.mockResolvedValue(paymentIntent)

			mockStripeTenantService.getStripeCustomerForTenant.mockResolvedValue(
				mockStripeCustomer
			)

			mockContextService.getTenantContext.mockResolvedValue({
				tenant,
				tenantUser
			} as TenantContext)

			mockContextService.getLeaseContext.mockResolvedValue({
				lease,
				ownerUser,
				stripeAccountId: 'acct_456'
			} as LeaseContext)
		})

		it('creates destination charge and persists rent payment', async () => {
			adminClient.from.mockImplementation((table: string) => {
				switch (table) {
					case 'payment_methods':
						return createSingleQueryMock(tenantPaymentMethod)
					case 'rent_payments':
						return {
							insert: jest.fn(() => ({
								select: jest.fn(() => ({
									single: jest.fn(() =>
										Promise.resolve({ data: rentPaymentRecord, error: null })
									)
								}))
							}))
						}
					default:
						throw new Error(`Unexpected table ${table}`)
				}
			})

			const result = await service.createOneTimePayment(
				{
					tenant_id: 'tenant123',
					lease_id: 'lease123',
					amount: 1500,
					paymentMethodId: 'pm_record'
				},
				'owner123'
			)

			expect(result.payment.id).toBe('payment123')
			expect(mockContextService.getTenantContext).toHaveBeenCalledWith('tenant123')
			expect(mockContextService.getLeaseContext).toHaveBeenCalledWith(
				'lease123',
				'tenant123',
				'owner123'
			)
		})
	})
})
