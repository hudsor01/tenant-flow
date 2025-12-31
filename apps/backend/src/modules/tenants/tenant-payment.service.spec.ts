import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'

import { TenantPaymentService } from './tenant-payment.service'
import { TenantPaymentQueryService } from './tenant-payment-query.service'
import { TenantPaymentMapperService } from './tenant-payment-mapper.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('TenantPaymentService', () => {
	let service: TenantPaymentService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockLogger: jest.Mocked<AppLogger>
	let mockQueryService: Partial<TenantPaymentQueryService>
	let mockMapperService: Partial<TenantPaymentMapperService>

	// Helper to create a flexible Supabase query chain
	const createMockChain = (
		resolveData: unknown = [],
		resolveError: unknown = null
	) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = [
			'select',
			'insert',
			'update',
			'delete',
			'eq',
			'neq',
			'is',
			'in',
			'or',
			'gte',
			'lte',
			'order',
			'contains',
			'not'
		]

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.range = jest.fn(() =>
			Promise.resolve({
				data: resolveData,
				error: resolveError,
				count: Array.isArray(resolveData) ? resolveData.length : 0
			})
		)
		chain.limit = jest.fn(() => chain) // Return chain to allow .maybeSingle() after .limit()
		chain.single = jest.fn(() =>
			Promise.resolve({
				data:
					Array.isArray(resolveData) && resolveData.length > 0
						? resolveData[0]
						: resolveData,
				error: resolveError
			})
		)
		chain.maybeSingle = jest.fn(() =>
			Promise.resolve({
				data:
					Array.isArray(resolveData) && resolveData.length > 0
						? resolveData[0]
						: resolveData,
				error: resolveError
			})
		)
		chain.then = jest.fn(resolve =>
			Promise.resolve({ data: resolveData, error: resolveError }).then(resolve)
		)

		return chain
	}

	// Helper to create a mock Supabase client with schema support
	const createMockClient = (
		fromFn?: (table: string) => ReturnType<typeof createMockChain>,
		rpcFn?: (
			fn: string,
			args?: Record<string, unknown>
		) => Promise<{ data: unknown; error: unknown }>
	): SupabaseClient<Database> => {
		const mockClient = {
			from: fromFn || jest.fn(() => createMockChain()),
			rpc: rpcFn || jest.fn(() => Promise.resolve({ data: null, error: null })),
			schema: jest.fn(() => mockClient)
		} as unknown as SupabaseClient<Database>
		return mockClient
	}

	beforeEach(async () => {
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		} as jest.Mocked<AppLogger>

		mockSupabaseService = {
			getAdminClient: jest.fn(() => createMockClient())
		} as jest.Mocked<SupabaseService>

		mockQueryService = {
			getTenantByAuthUserId: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
			ensureTenantOwnedByUser: jest.fn().mockResolvedValue(undefined),
			getOwnerPropertyIds: jest.fn().mockResolvedValue(['property-1']),
			getTenantIdsForOwner: jest.fn().mockResolvedValue(['tenant-1', 'tenant-2']),
			queryTenantPayments: jest.fn().mockResolvedValue([])
		}

		mockMapperService = {
			mapStripePaymentIntentToRecord: jest.fn().mockImplementation(intent => ({
				id: intent.id,
				amount: intent.amount ?? 0,
				currency: intent.currency ?? 'usd',
				status: intent.status ?? 'unknown',
				created_at: new Date((intent.created ?? 0) * 1000).toISOString()
			})),
			mapPaymentIntentToRecord: jest.fn().mockImplementation(intent => ({
				id: intent.id ?? `pi_${Date.now()}`,
				amount: intent.amount ?? 0,
				status: intent.status ?? 'pending'
			})),
			isLateFeeRecord: jest.fn().mockReturnValue(false),
			hasLateFeeFlag: jest.fn().mockReturnValue(false)
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TenantPaymentService,
				{ provide: Logger, useValue: mockLogger },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				},
				{
					provide: TenantPaymentQueryService,
					useValue: mockQueryService
				},
				{
					provide: TenantPaymentMapperService,
					useValue: mockMapperService
				}
			]
		}).compile()

		service = module.get<TenantPaymentService>(TenantPaymentService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('calculatePaymentStatus', () => {
		it('should return payment status for a tenant with recent payment', async () => {
			const mockPayment = {
				id: 'payment-1',
				tenant_id: 'tenant-1',
				status: 'succeeded',
				amount_cents: 100000,
				late_fee_amount: 0,
				created_at: '2025-01-15T00:00:00Z'
			}

			mockSupabaseService.getAdminClient = jest.fn(() =>
				createMockClient(jest.fn(() => createMockChain([mockPayment], null)))
			)

			const result = await service.calculatePaymentStatus('tenant-1')

			expect(result).toBeDefined()
			expect(result.status).toBe('succeeded')
			expect(result.amount_due).toBe(0)
			expect(result.late_fees).toBe(0)
			expect(result.last_payment).toBe('2025-01-15T00:00:00Z')
		})

		it('should return NO_PAYMENTS status when tenant has no payments', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() =>
				createMockClient(jest.fn(() => createMockChain([], null)))
			)

			const result = await service.calculatePaymentStatus('tenant-1')

			expect(result).toEqual({
				status: 'NO_PAYMENTS',
				amount_due: 0,
				late_fees: 0
			})
		})

		it('should handle payment with late fees', async () => {
			const mockPayment = {
				id: 'payment-1',
				tenant_id: 'tenant-1',
				status: 'succeeded',
				amount_cents: 100000,
				late_fee_amount: 5000,
				created_at: '2025-01-15T00:00:00Z'
			}

			mockSupabaseService.getAdminClient = jest.fn(() =>
				createMockClient(jest.fn(() => createMockChain([mockPayment], null)))
			)

			const result = await service.calculatePaymentStatus('tenant-1')

			expect(result.status).toBe('succeeded')
			expect(result.late_fees).toBe(5000)
		})

		it('should return NO_PAYMENTS when database query returns error', async () => {
			mockSupabaseService.getAdminClient = jest.fn(() =>
				createMockClient(
					jest.fn(() => createMockChain(null, { message: 'DB error' }))
				)
			)

			const result = await service.calculatePaymentStatus('tenant-1')

			expect(result.status).toBe('NO_PAYMENTS')
			expect(result.amount_due).toBe(0)
			expect(result.late_fees).toBe(0)
		})

		it('should handle payment without created_at timestamp', async () => {
			const mockPayment = {
				id: 'payment-1',
				tenant_id: 'tenant-1',
				status: 'succeeded',
				amount_cents: 100000,
				late_fee_amount: 0
			}

			mockSupabaseService.getAdminClient = jest.fn(() =>
				createMockClient(jest.fn(() => createMockChain([mockPayment], null)))
			)

			const result = await service.calculatePaymentStatus('tenant-1')

			expect(result.status).toBe('succeeded')
			expect(result.last_payment).toBeUndefined()
		})
	})

	describe('getOwnerPaymentSummary', () => {
		it('should return payment summary for an owner', async () => {
			const mockPayments = [
				{
					id: 'payment-1',
					tenant_id: 'tenant-1',
					amount_cents: 100000,
					status: 'succeeded',
					is_late_fee: false,
					created_at: '2025-01-15T00:00:00Z'
				},
				{
					id: 'payment-2',
					tenant_id: 'tenant-2',
					amount_cents: 120000,
					status: 'succeeded',
					is_late_fee: false,
					created_at: '2025-01-16T00:00:00Z'
				}
			]

			let callCount = 0
			mockSupabaseService.getAdminClient = jest.fn(() =>
				createMockClient(
					jest.fn((table: string) => {
						callCount++
						if (table === 'properties' || callCount === 1) {
							return createMockChain([{ id: 'property-1' }], null)
						}
						if (table === 'units' || callCount === 2) {
							return createMockChain([{ id: 'unit-1' }], null)
						}
						if (table === 'leases' || callCount === 3) {
							return createMockChain(
								[
									{ primary_tenant_id: 'tenant-1' },
									{ primary_tenant_id: 'tenant-2' }
								],
								null
							)
						}
						return createMockChain(mockPayments, null)
					})
				)
			)

			const result = await service.getOwnerPaymentSummary('owner-1')

			expect(result).toBeDefined()
			expect(result.lateFeeTotal).toBeDefined()
			expect(result.unpaidTotal).toBeDefined()
			expect(result.unpaidCount).toBeDefined()
			expect(result.tenantCount).toBeDefined()
		})

		it('should handle owner with no tenants', async () => {
			// Override the query service mock to return empty tenants
			;(mockQueryService.getTenantIdsForOwner as jest.Mock).mockResolvedValueOnce([])

			const result = await service.getOwnerPaymentSummary('owner-1')

			expect(result).toEqual({
				lateFeeTotal: 0,
				unpaidTotal: 0,
				unpaidCount: 0,
				tenantCount: 0
			})
		})
	})

	describe('getTenantPaymentHistory', () => {
		it('should return payment history for a tenant owned by user', async () => {
			const mockLease = { id: 'lease-1', unit_id: 'unit-1' }
			const mockUnit = { property_id: 'property-1' }
			const mockProperty = { owner_user_id: 'user-1' }
			const mockPayments = [
				{
					id: 'pi_1',
					amount: 100000,
					status: 'succeeded',
					created: 1234567890,
					metadata: { tenant_id: 'tenant-1' }
				}
			]

			let callCount = 0
			mockSupabaseService.getAdminClient = jest.fn(() =>
				createMockClient(
					jest.fn((table: string) => {
						callCount++
						if (table === 'leases') {
							return createMockChain(mockLease, null)
						}
						if (table === 'units') {
							return createMockChain(mockUnit, null)
						}
						if (table === 'properties') {
							return createMockChain(mockProperty, null)
						}
						if (table === 'stripe_payment_intents') {
							return createMockChain(mockPayments, null)
						}
						return createMockChain([], null)
					})
				)
			)

			const result = await service.getTenantPaymentHistory('user-1', 'tenant-1')

			expect(result).toBeDefined()
			expect(result.payments).toBeDefined()
			expect(Array.isArray(result.payments)).toBe(true)
		})
	})

	describe('getTenantPaymentHistoryForTenant', () => {
		it('should return payment history for tenant portal view', async () => {
			const mockPayments = [
				{
					id: 'pi_1',
					amount: 100000,
					status: 'succeeded',
					created: 1234567890,
					metadata: { tenant_id: 'tenant-1' }
				}
			]

			// The service uses mockQueryService.getTenantByAuthUserId (already mocked)
			// and then calls fetchPaymentIntents which queries stripe schema
			const mockChain = createMockChain(mockPayments, null)
			mockSupabaseService.getAdminClient = jest.fn(() =>
				createMockClient(jest.fn(() => mockChain))
			)

			const result =
				await service.getTenantPaymentHistoryForTenant('auth-user-1')

			expect(result).toBeDefined()
			expect(result.payments).toBeDefined()
			expect(Array.isArray(result.payments)).toBe(true)
		})
	})
})
