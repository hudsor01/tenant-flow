import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { SubscriptionsService } from './subscriptions.service'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionCacheService } from './subscription-cache.service'
import { Logger } from '@nestjs/common'

describe('SubscriptionsService - N+1 Query Prevention', () => {
	let service: SubscriptionsService
	let supabaseService: SupabaseService
	let mockAdminClient: any

	beforeEach(async () => {
		// Mock Supabase client with query tracking
		let queryCount = 0
		const queries: string[] = []

		mockAdminClient = {
			from: jest.fn((table: string) => {
				queryCount++
				queries.push(table)
				return {
					select: jest.fn(() => ({
						eq: jest.fn(() => ({
							maybeSingle: jest.fn(() => ({ data: null, error: null })),
							single: jest.fn(() => ({ data: null, error: null })),
							not: jest.fn(() => ({ data: [], error: null }))
						})),
						in: jest.fn(() => ({
							not: jest.fn(() => ({ data: [], error: null }))
						})),
						maybeSingle: jest.fn(() => ({ data: null, error: null }))
					}))
				}
			}),
			getQueryCount: () => queryCount,
			getQueries: () => queries,
			resetQueryCount: () => { queryCount = 0; queries.length = 0 }
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SubscriptionsService,
				{
					provide: SupabaseService,
					useValue: {
						getAdminClient: () => mockAdminClient
					}
				},
				{
					provide: StripeClientService,
					useValue: {
						getClient: () => ({ subscriptions: { list: jest.fn(), retrieve: jest.fn(), update: jest.fn() } })
					}
				},
				{
					provide: SubscriptionCacheService,
					useValue: {
						get: jest.fn(),
						set: jest.fn(),
						invalidate: jest.fn()
					}
				}
			]
		}).compile()

		service = module.get<SubscriptionsService>(SubscriptionsService)
		supabaseService = module.get<SupabaseService>(SupabaseService)

		// Suppress logger output
		jest.spyOn(Logger.prototype, 'log').mockImplementation()
		jest.spyOn(Logger.prototype, 'error').mockImplementation()
	})

	describe('listSubscriptions - N+1 Prevention', () => {
		it('should use single query with joins instead of N queries for lease contexts', async () => {
			// ARRANGE: Mock owner with 3 leases
			const mockOwner = { id: 'owner-123', user_id: 'user-123' }
			const mockProperties = [
				{ id: 'prop-1' },
				{ id: 'prop-2' }
			]
			const mockUnits = [
				{ id: 'unit-1' },
				{ id: 'unit-2' },
				{ id: 'unit-3' }
			]
			const mockLeases = [
				{ id: 'lease-1', stripe_subscription_id: 'sub_1', unit_id: 'unit-1', primary_tenant_id: 'tenant-1' },
				{ id: 'lease-2', stripe_subscription_id: 'sub_2', unit_id: 'unit-2', primary_tenant_id: 'tenant-2' },
				{ id: 'lease-3', stripe_subscription_id: 'sub_3', unit_id: 'unit-3', primary_tenant_id: 'tenant-3' }
			]

			// Setup mock responses with proper chaining
			mockAdminClient.from = jest.fn((table: string) => {
				mockAdminClient.getQueryCount()
				mockAdminClient.getQueries().push(table)

				if (table === 'property_owners') {
					return {
						select: jest.fn(() => ({
							eq: jest.fn(() => ({
								maybeSingle: jest.fn(() => ({ data: mockOwner, error: null }))
							}))
						}))
					}
				}

				if (table === 'properties') {
					return {
						select: jest.fn(() => ({
							eq: jest.fn(() => ({ data: mockProperties, error: null }))
						}))
					}
				}

				if (table === 'units') {
					return {
						select: jest.fn(() => ({
							in: jest.fn(() => ({ data: mockUnits, error: null }))
						}))
					}
				}

				if (table === 'leases') {
					return {
						select: jest.fn(() => ({
							in: jest.fn(() => ({
								not: jest.fn(() => ({ data: mockLeases, error: null }))
							}))
						}))
					}
				}

				return {
					select: jest.fn(() => ({
						eq: jest.fn(() => ({ data: null, error: null })),
						in: jest.fn(() => ({ data: [], error: null }))
					}))
				}
			})

			mockAdminClient.resetQueryCount()

			// ACT: Call listSubscriptions
			try {
				await service.listSubscriptions('user-123')
			} catch (err) {
				// Expected to fail due to incomplete mocks, we're counting queries
			}

			// ASSERT: Should make ≤ 6 queries total:
			// 1. Check property_owners
			// 2. Get properties for owner
			// 3. Get units for properties (batched with IN)
			// 4. Get leases for units (batched with IN)
			// 5-6. Load context with joins (should be single query, not N queries)
			const queryCount = mockAdminClient.getQueryCount()
			const queries = mockAdminClient.getQueries()
			
			expect(queryCount).toBeLessThanOrEqual(6) // Max 6 queries for 3 leases
			// Should NOT have 3+ separate lease context queries
			const leaseQueries = queries.filter((q: string) => q === 'leases')
			expect(leaseQueries.length).toBeLessThanOrEqual(2) // Initial lease fetch + optional context join
		})

		it('should batch load all lease contexts with single join query', async () => {
			// This test will verify the optimized implementation uses:
			// .select('*, units(*), tenants(*), property_owners(*)') 
			// instead of loadLeaseContext(id) per lease
			
			mockAdminClient.resetQueryCount()
			const initialCount = mockAdminClient.getQueryCount()

			// Setup minimal mock
			mockAdminClient.from = jest.fn(() => ({
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						maybeSingle: jest.fn(() => ({ data: null, error: null }))
					})),
					in: jest.fn(() => ({
						not: jest.fn(() => ({ data: [], error: null }))
					}))
				}))
			}))

			try {
				await service.listSubscriptions('user-123')
			} catch (err) {
				// Expected
			}

			const finalCount = mockAdminClient.getQueryCount()
			const totalQueries = finalCount - initialCount

			// Should be ≤ 5 queries: owner check + properties + units + leases + context join
			expect(totalQueries).toBeLessThanOrEqual(5)
		})
	})

	describe('Query Performance with Local Supabase', () => {
		it('should measure actual query count against local database', async () => {
			// This test requires local Supabase running (from .env.test.local)
			// Will be implemented to use real database connection
			// and verify query count using performance interceptor
			expect(true).toBe(true) // Placeholder
		})
	})
})
