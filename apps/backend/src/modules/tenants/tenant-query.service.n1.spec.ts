import { Test } from '@nestjs/testing'
import { TenantRelationService } from './tenant-relation.service'
import { SupabaseService } from '../../database/supabase.service'
import { Logger } from '@nestjs/common'

/**
 * N+1 Query Prevention Tests
 *
 * These tests verify that TenantRelationService uses optimized Supabase joins
 * instead of sequential queries when fetching tenant relationships.
 */
describe('TenantRelationService - N+1 Query Prevention', () => {
	let service: TenantRelationService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let queryCount: number

	beforeEach(async () => {
		queryCount = 0

		// Create mock client that tracks query count
		const createMockClient = () => {
			const mockClient = {
				from: jest.fn().mockImplementation(() => {
					queryCount++ // Count each .from() call as a query
					return mockClient
				}),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				not: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				then: jest.fn((cb) => {
					cb({ data: [], error: null })
					return Promise.resolve({ data: [], error: null })
				})
			}
			return mockClient
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(createMockClient())
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				TenantRelationService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: Logger,
					useValue: {
						log: jest.fn(),
						warn: jest.fn(),
						error: jest.fn(),
						debug: jest.fn()
					}
				}
			]
		}).compile()

		service = module.get<TenantRelationService>(TenantRelationService)
		// Override logger to suppress output
		;(service as any).logger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		} as unknown as Logger
	})

	describe('getTenantIdsForOwner - N+1 Prevention', () => {
		it('should use single query with joins instead of 3 sequential queries', async () => {
			// Setup: Mock owner with properties → units → leases chain
			const mockOwnerRecord = { id: 'owner-1' }
			const mockProperties = [
				{
					id: 'prop-1',
					units: [
						{
							id: 'unit-1',
							leases: [{ primary_tenant_id: 'tenant-1' }]
						}
					]
				},
				{
					id: 'prop-2',
					units: [
						{
							id: 'unit-2',
							leases: [{ primary_tenant_id: 'tenant-2' }]
						}
					]
				}
			]

			const mockClient = mockSupabaseService.getAdminClient()

			let callIndex = 0
			mockClient.select = jest.fn().mockImplementation((columns: string) => {
				callIndex++

				// First call: get owner record
				if (callIndex === 1) {
					mockClient.maybeSingle = jest.fn().mockResolvedValue({
						data: mockOwnerRecord,
						error: null
					})
				}
				// Second call: should be SINGLE query with nested joins
				else if (callIndex === 2) {
					;(mockClient as any).then = (cb: (result: any) => void) => {
						cb({ data: mockProperties, error: null })
						return Promise.resolve({ data: mockProperties, error: null })
					}
				}

				return mockClient
			})

			// Reset query counter
			queryCount = 0

			// Execute
			const result = await service.getTenantIdsForOwner('auth-user-123')

			// Assert: Should use ≤2 queries (not 4)
			// 1 query: Get owner record
			// 1 query: Get properties with nested units.leases in single join
			// TOTAL: 2 queries (not 1 + properties + units + leases = 4)
			expect(queryCount).toBeLessThanOrEqual(2)
			expect(result).toEqual(['tenant-1', 'tenant-2'])
		})

		it('should use nested joins instead of sequential queries', async () => {
			const mockOwnerRecord = { id: 'owner-1' }
			const mockClient = mockSupabaseService.getAdminClient()

			let callIndex = 0
			mockClient.select = jest.fn().mockImplementation((columns: string) => {
				callIndex++

				if (callIndex === 1) {
					mockClient.maybeSingle = jest.fn().mockResolvedValue({
						data: mockOwnerRecord,
						error: null
					})
				} else if (callIndex === 2) {
					// Nested join query
					;(mockClient as any).then = (cb: (result: any) => void) => {
						cb({ data: [], error: null })
						return Promise.resolve({ data: [], error: null })
					}
				}

				return mockClient
			})

			queryCount = 0

			await service.getTenantIdsForOwner('auth-user-123')

			// Should use nested joins in the select statement
			const selectCalls = mockClient.select.mock.calls
			const hasNestedJoin = selectCalls.some((call: any[]) => {
				const columns = call[0]
				return (
					typeof columns === 'string' &&
					columns.includes('units(') &&
					columns.includes('leases(')
				)
			})
			expect(hasNestedJoin).toBe(true)
		})

		it('should handle empty results at any step', async () => {
			const mockClient = mockSupabaseService.getAdminClient()

			mockClient.select = jest.fn().mockImplementation(() => {
				mockClient.maybeSingle = jest.fn().mockResolvedValue({
					data: null, // No owner found
					error: null
				})
				return mockClient
			})

			const result = await service.getTenantIdsForOwner('auth-user-123')

			expect(result).toEqual([])
		})
	})
})
