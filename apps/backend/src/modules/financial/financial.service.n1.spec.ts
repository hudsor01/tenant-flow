import { Test } from '@nestjs/testing'
import { FinancialService } from './financial.service'
import { SupabaseService } from '../../database/supabase.service'
import { FinancialExpenseService } from './financial-expense.service'
import { FinancialRevenueService } from './financial-revenue.service'
import { Logger } from '@nestjs/common'

describe('FinancialService - N+1 Query Prevention', () => {
	let service: FinancialService
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let queryCount: number

	beforeEach(async () => {
		queryCount = 0

		// Create mock client that tracks query count
		const createMockClient = () => {
			const mockClient = {
				from: jest.fn().mockImplementation((table: string) => {
					queryCount++ // Count each .from() call as a query
					return mockClient
				}),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis()
			}
			return mockClient
		}

		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(createMockClient())
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				FinancialService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: FinancialExpenseService,
					useValue: {} // Not used in N+1 tests
				},
				{
					provide: FinancialRevenueService,
					useValue: {} // Not used in N+1 tests
				}
			]
		}).compile()

		service = module.get<FinancialService>(FinancialService)
		// Override logger to suppress output
		;(service as any).logger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		} as unknown as Logger
	})

	describe('getNetOperatingIncome - N+1 Prevention', () => {
		it('should use batch queries with joins instead of N queries for properties', async () => {
			// Setup: Mock data for 3 properties
			const mockProperties = [
				{ id: 'prop-1', name: 'Property 1' },
				{ id: 'prop-2', name: 'Property 2' },
				{ id: 'prop-3', name: 'Property 3' }
			]

			const mockUnits = [
				{ id: 'unit-1', property_id: 'prop-1' },
				{ id: 'unit-2', property_id: 'prop-1' },
				{ id: 'unit-3', property_id: 'prop-2' }
			]

			const mockLeases = [
				{ unit_id: 'unit-1', rent_amount: 150000, lease_status: 'active' },
				{ unit_id: 'unit-2', rent_amount: 120000, lease_status: 'active' },
				{ unit_id: 'unit-3', rent_amount: 180000, lease_status: 'active' }
			]

			// Mock client responses
			const mockClient = mockSupabaseService.getUserClient('test-token')

			let callIndex = 0
			mockClient.select = jest.fn().mockImplementation((columns: string) => {
				callIndex++

				// First call: properties query
				if (callIndex === 1) {
					;(mockClient as any).then = (cb: (result: any) => void) => {
						cb({ data: mockProperties, error: null })
					}
				}
				// Second call: batch units query with property join
				else if (callIndex === 2 && columns.includes('properties(')) {
					;(mockClient as any).then = (cb: (result: any) => void) => {
						cb({
							data: mockUnits.map(u => ({
								...u,
								properties: mockProperties.find(p => p.id === u.property_id)
							})),
							error: null
						})
					}
				}
				// Third call: batch leases query
				else if (callIndex === 3) {
					;(mockClient as any).then = (cb: (result: any) => void) => {
						cb({ data: mockLeases, error: null })
					}
				}
				// Fourth call: expenses query
				else if (callIndex === 4) {
					;(mockClient as any).then = (cb: (result: any) => void) => {
						cb({ data: [], error: null })
					}
				}

				return mockClient
			})

			// Reset query counter
			queryCount = 0

			// Execute
			await service.getNetOperatingIncome('test-token', { start_date: '2025-01-01', end_date: '2025-12-31' })

			// Assert: Should use ≤5 queries (not 10+)
			// 1 query: Get all properties
			// 1 query: Get all units with property join (or 2 if separate)
			// 1 query: Get all leases for all units at once
			// 1 query: Get all expenses for all properties at once
			// TOTAL: ≤5 queries (not 1 + 3*units + 3*leases + 3*expenses = 10+)
			expect(queryCount).toBeLessThanOrEqual(5)
		})

	})
})
