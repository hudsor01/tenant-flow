import { Logger } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { PropertyPerformanceService } from './property-performance.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('PropertyPerformanceService - Trend Calculation', () => {
	let service: PropertyPerformanceService
	let supabaseService: SupabaseService

	const mockuser_id = 'test-user-123'

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PropertyPerformanceService,
				{
					provide: SupabaseService,
					useValue: {
						rpcWithCache: jest.fn()
					}
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<PropertyPerformanceService>(PropertyPerformanceService)
		supabaseService = module.get<SupabaseService>(SupabaseService)

		jest.spyOn(Logger.prototype, 'warn').mockImplementation()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getPropertyPerformance', () => {
		it('maps consolidated RPC results and trend direction', async () => {
			const mockProperties = [
				{
					property_id: 'prop-1',
					property_name: 'Sunset Apartments',
					occupancy_rate: 85.5,
					total_revenue: 5000,
					previous_revenue: 4500,
					trend_percentage: 11.1,
					timeframe: '30d'
				},
				{
					property_id: 'prop-2',
					property_name: 'Ocean View',
					occupancy_rate: 92.3,
					total_revenue: 8000,
					previous_revenue: 8100,
					trend_percentage: -1.2,
					timeframe: '30d'
				},
				{
					property_id: 'prop-3',
					property_name: null,
					occupancy_rate: 0,
					total_revenue: 0,
					previous_revenue: 0,
					trend_percentage: 0,
					timeframe: '30d'
				}
			]

			jest
				.spyOn(supabaseService, 'rpcWithCache')
				.mockResolvedValueOnce({ data: mockProperties, error: null })

			const result = await service.getPropertyPerformance(mockuser_id)

			expect(result).toHaveLength(3)
			expect(result[0]).toMatchObject({
				property_id: 'prop-1',
				propertyName: 'Sunset Apartments',
				trend: 'up',
				trendPercentage: 11.1,
				monthlyRevenue: 5000,
				annualRevenue: 60000
			})
			expect(result[1]).toMatchObject({
				property_id: 'prop-2',
				propertyName: 'Ocean View',
				trend: 'down',
				trendPercentage: -1.2
			})
			expect(result[2]).toMatchObject({
				property_id: 'prop-3',
				propertyName: 'Unknown',
				trend: 'stable',
				trendPercentage: 0
			})
		})

		it('returns empty array on RPC error', async () => {
			jest
				.spyOn(supabaseService, 'rpcWithCache')
				.mockResolvedValueOnce({
					data: null,
					error: { message: 'Database error' }
				})

			const result = await service.getPropertyPerformance(mockuser_id)

			expect(result).toEqual([])
		})

		it('calls consolidated RPC with expected payload', async () => {
			const rpcSpy = jest
				.spyOn(supabaseService, 'rpcWithCache')
				.mockResolvedValueOnce({ data: [], error: null })

			await service.getPropertyPerformance(mockuser_id)

			expect(rpcSpy).toHaveBeenCalledTimes(1)
			expect(rpcSpy).toHaveBeenCalledWith(
				'get_property_performance_with_trends',
				{ p_user_id: mockuser_id, p_timeframe: '30d', p_limit: 100 },
				expect.any(Object)
			)
		})
	})
})
