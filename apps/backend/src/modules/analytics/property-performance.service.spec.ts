import { Test, type TestingModule } from '@nestjs/testing'
import { PropertyPerformanceService } from './property-performance.service'
import { SupabaseService } from '../../database/supabase.service'
import { Logger } from '@nestjs/common'

describe('PropertyPerformanceService - Trend Calculation', () => {
	let service: PropertyPerformanceService
	let supabaseService: SupabaseService

	const mockUserId = 'test-user-123'

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PropertyPerformanceService,
				{
					provide: SupabaseService,
					useValue: {
						rpcWithRetries: jest.fn()
					}
				}
			]
		}).compile()

		service = module.get<PropertyPerformanceService>(PropertyPerformanceService)
		supabaseService = module.get<SupabaseService>(SupabaseService)

		// Suppress logger output during tests
		jest.spyOn(Logger.prototype, 'warn').mockImplementation()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getPropertyPerformance - Trend Integration', () => {
		it('should merge trend data with property performance', async () => {
			// Mock property performance data
			const mockProperties = [
				{
					propertyId: 'prop-1',
					propertyName: 'Sunset Apartments',
					occupancyRate: 85.5,
					monthlyRevenue: 5000,
					annualRevenue: 60000,
					totalUnits: 10,
					occupiedUnits: 8,
					vacantUnits: 2
				},
				{
					propertyId: 'prop-2',
					propertyName: 'Ocean View',
					occupancyRate: 92.3,
					monthlyRevenue: 8000,
					annualRevenue: 96000,
					totalUnits: 12,
					occupiedUnits: 11,
					vacantUnits: 1
				}
			]

			// Mock trend data
			const mockTrends = [
				{
					data: [
						{
							property_id: 'prop-1',
							current_month_revenue: 5000,
							previous_month_revenue: 4500,
							trend: 'up' as const,
							trend_percentage: 11.1
						},
						{
							property_id: 'prop-2',
							current_month_revenue: 8000,
							previous_month_revenue: 8100,
							trend: 'down' as const,
							trend_percentage: 1.2
						}
					]
				}
			]

			// Setup mock responses
			jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: mockProperties, error: null }) // get_property_performance
				.mockResolvedValueOnce({ data: mockTrends[0]?.data, error: null }) // get_property_performance_trends

			const result = await service.getPropertyPerformance(mockUserId)

			expect(result).toHaveLength(2)

			// Verify first property has upward trend
			expect(result[0]).toMatchObject({
				propertyId: 'prop-1',
				propertyName: 'Sunset Apartments',
				trend: 'up',
				trendPercentage: 11.1
			})

			// Verify second property has downward trend
			expect(result[1]).toMatchObject({
				propertyId: 'prop-2',
				propertyName: 'Ocean View',
				trend: 'down',
				trendPercentage: 1.2
			})
		})

		it('should use stable trend as fallback when no trend data available', async () => {
			const mockProperties = [
				{
					propertyId: 'prop-new',
					propertyName: 'New Property',
					occupancyRate: 0,
					monthlyRevenue: 0,
					annualRevenue: 0,
					totalUnits: 5,
					occupiedUnits: 0,
					vacantUnits: 5
				}
			]

			// Mock empty trend data (new property with no payment history)
			const mockTrends: [] = []

			jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: mockProperties, error: null })
				.mockResolvedValueOnce({ data: mockTrends, error: null })

			const result = await service.getPropertyPerformance(mockUserId)

			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				propertyId: 'prop-new',
				trend: 'stable',
				trendPercentage: 0
			})
		})

		it('should handle null trend data gracefully', async () => {
			const mockProperties = [
				{
					propertyId: 'prop-1',
					propertyName: 'Test Property',
					occupancyRate: 75,
					monthlyRevenue: 3000,
					annualRevenue: 36000,
					totalUnits: 8,
					occupiedUnits: 6,
					vacantUnits: 2
				}
			]

			jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: mockProperties, error: null })
				.mockResolvedValueOnce({ data: null, error: null }) // Null trend data

			const result = await service.getPropertyPerformance(mockUserId)

			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				propertyId: 'prop-1',
				trend: 'stable',
				trendPercentage: 0
			})
		})

		it('should handle partial trend data (some properties have trends, others do not)', async () => {
			const mockProperties = [
				{
					propertyId: 'prop-1',
					propertyName: 'Property with History',
					occupancyRate: 85,
					monthlyRevenue: 5000,
					annualRevenue: 60000,
					totalUnits: 10,
					occupiedUnits: 8,
					vacantUnits: 2
				},
				{
					propertyId: 'prop-2',
					propertyName: 'New Property',
					occupancyRate: 0,
					monthlyRevenue: 0,
					annualRevenue: 0,
					totalUnits: 5,
					occupiedUnits: 0,
					vacantUnits: 5
				}
			]

			const mockTrends = [
				{
					property_id: 'prop-1',
					current_month_revenue: 5000,
					previous_month_revenue: 4800,
					trend: 'up' as const,
					trend_percentage: 4.2
				}
				// No trend data for prop-2
			]

			jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: mockProperties, error: null })
				.mockResolvedValueOnce({ data: mockTrends, error: null })

			const result = await service.getPropertyPerformance(mockUserId)

			expect(result).toHaveLength(2)

			// First property has real trend data
			expect(result[0]).toMatchObject({
				propertyId: 'prop-1',
				trend: 'up',
				trendPercentage: 4.2
			})

			// Second property falls back to stable
			expect(result[1]).toMatchObject({
				propertyId: 'prop-2',
				trend: 'stable',
				trendPercentage: 0
			})
		})

		it('should handle stable trend (< 1% change)', async () => {
			const mockProperties = [
				{
					propertyId: 'prop-1',
					propertyName: 'Stable Property',
					occupancyRate: 90,
					monthlyRevenue: 10000,
					annualRevenue: 120000,
					totalUnits: 20,
					occupiedUnits: 18,
					vacantUnits: 2
				}
			]

			const mockTrends = [
				{
					property_id: 'prop-1',
					current_month_revenue: 10000,
					previous_month_revenue: 9950, // 0.5% change
					trend: 'stable' as const,
					trend_percentage: 0 // Changes < 1% are considered stable
				}
			]

			jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: mockProperties, error: null })
				.mockResolvedValueOnce({ data: mockTrends, error: null })

			const result = await service.getPropertyPerformance(mockUserId)

			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				propertyId: 'prop-1',
				trend: 'stable',
				trendPercentage: 0
			})
		})

		it('should handle RPC errors gracefully and return empty array', async () => {
			jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })
				.mockResolvedValueOnce({ data: [], error: null })

			const result = await service.getPropertyPerformance(mockUserId)

			expect(result).toEqual([])
		})

		it('should call both RPC functions in parallel', async () => {
			const mockProperties = [{ propertyId: 'prop-1' }]
			const mockTrends: [] = []

			const rpcSpy = jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: mockProperties, error: null })
				.mockResolvedValueOnce({ data: mockTrends, error: null })

			await service.getPropertyPerformance(mockUserId)

			// Verify both RPC calls were made
			expect(rpcSpy).toHaveBeenCalledTimes(2)
			expect(rpcSpy).toHaveBeenNthCalledWith(1, 'get_property_performance', {
				user_id: mockUserId,
				user_id_param: mockUserId,
				p_user_id: mockUserId,
				uid: mockUserId
			})
			expect(rpcSpy).toHaveBeenNthCalledWith(
				2,
				'get_property_performance_trends',
				{
					user_id: mockUserId,
					user_id_param: mockUserId,
					p_user_id: mockUserId,
					uid: mockUserId
				}
			)
		})
	})

	describe('Edge Cases', () => {
		it('should handle properties with zero previous revenue', async () => {
			const mockProperties = [
				{
					propertyId: 'prop-1',
					propertyName: 'First Month Revenue',
					occupancyRate: 50,
					monthlyRevenue: 2000,
					annualRevenue: 24000,
					totalUnits: 4,
					occupiedUnits: 2,
					vacantUnits: 2
				}
			]

			const mockTrends = [
				{
					property_id: 'prop-1',
					current_month_revenue: 2000,
					previous_month_revenue: 0, // No previous revenue
					trend: 'stable' as const, // DB returns stable when prev = 0
					trend_percentage: 0
				}
			]

			jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: mockProperties, error: null })
				.mockResolvedValueOnce({ data: mockTrends, error: null })

			const result = await service.getPropertyPerformance(mockUserId)

			expect(result[0]?.trend).toBe('stable')
			expect(result[0]?.trendPercentage).toBe(0)
		})

		it('should correctly preserve all property fields when merging trends', async () => {
			const mockProperties = [
				{
					property_id: 'prop-1',
					property_name: 'Full Property',
					occupancy_rate: 85.5,
					monthly_revenue: 5000,
					annual_revenue: 60000,
					total_units: 10,
					occupied_units: 8,
					vacant_units: 2,
					address: '123 Main St',
					status: 'ACTIVE',
					property_type: 'APARTMENT'
				}
			]

			const mockTrends = [
				{
					property_id: 'prop-1',
					current_month_revenue: 5000,
					previous_month_revenue: 4500,
					trend: 'up' as const,
					trend_percentage: 11.1
				}
			]

			jest
				.spyOn(supabaseService, 'rpcWithRetries')
				.mockResolvedValueOnce({ data: mockProperties, error: null })
				.mockResolvedValueOnce({ data: mockTrends, error: null })

			const result = await service.getPropertyPerformance(mockUserId)

			// Verify all fields are preserved
			expect(result[0]).toEqual({
				propertyId: 'prop-1',
				propertyName: 'Full Property',
				occupancyRate: 85.5,
				monthlyRevenue: 5000,
				annualRevenue: 60000,
				totalUnits: 10,
				occupiedUnits: 8,
				vacantUnits: 2,
				address: '123 Main St',
				status: 'ACTIVE',
				propertyType: 'APARTMENT',
				trend: 'up',
				trendPercentage: 11.1
			})
		})
	})
})
