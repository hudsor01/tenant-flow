import type { SupabaseService } from '../../database/supabase.service'
import { OccupancyTrendsService } from './occupancy-trends.service'

describe('OccupancyTrendsService', () => {
	let service: OccupancyTrendsService
	let mockSupabase: jest.Mocked<Pick<SupabaseService, 'getAdminClient'>>
	let mockRpc: jest.Mock

	beforeEach(() => {
		mockRpc = jest.fn()
		mockSupabase = {
			getAdminClient: jest.fn().mockReturnValue({ rpc: mockRpc })
		} as unknown as jest.Mocked<
			Pick<SupabaseService, 'getAdminClient' | 'rpcWithRetries'>
		>
		;(mockSupabase as unknown as any).rpcWithRetries = jest
			.fn()
			.mockImplementation((fn: string, payload: Record<string, unknown>) => {
				return (mockSupabase.getAdminClient() as any).rpc(fn, payload)
			})

		service = new OccupancyTrendsService(
			mockSupabase as unknown as SupabaseService
		)
	})

	it('maps occupancy metrics from RPC payload', async () => {
		const metrics = {
			current_occupancy: 96.5,
			average_vacancy_days: 12,
			seasonal_peak_occupancy: 99,
			trend: 1.5
		}

		mockRpc.mockResolvedValue({ data: metrics, error: null })

		const result = await service.getOccupancyMetrics('asset-1')

		expect(mockRpc).toHaveBeenCalledWith(
			'get_occupancy_overview',
			expect.objectContaining({ user_id: 'asset-1' })
		)
		expect(result).toEqual({
			currentOccupancy: 96.5,
			averageVacancyDays: 12,
			seasonalPeakOccupancy: 99,
			trend: 1.5
		})
	})

	it('returns fallbacks when RPC errors', async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc fail' } })

		const [trends, vacancy] = await Promise.all([
			service.getOccupancyTrends('asset-2'),
			service.getVacancyAnalysis('asset-2')
		])

		expect(trends).toEqual([])
		expect(vacancy).toEqual([])
	})

	it('handles RPC exceptions gracefully', async () => {
		mockRpc.mockRejectedValue(new Error('crash'))

		const pageData = await service.getOccupancyAnalyticsPageData('asset-3')

		expect(pageData).toEqual({
			metrics: {
				currentOccupancy: 0,
				averageVacancyDays: 0,
				seasonalPeakOccupancy: 0,
				trend: 0
			},
			trends: [],
			vacancyAnalysis: []
		})
	})

	it('aggregates RPC responses into page data', async () => {
		const metrics = {
			current_occupancy: 97,
			average_vacancy_days: 10,
			seasonal_peak_occupancy: 99,
			trend: 2.1
		}
		const trends = [
			{
				period: '2024-01',
				occupancy_rate: 95,
				occupied_units: 190,
				total_units: 200
			},
			{
				period: '2024-02',
				occupancy_rate: 97,
				occupied_units: 194,
				total_units: 200
			}
		]
		const vacancy = [
			{
				property_id: 'prop-1',
				property_name: 'Willow Creek',
				vacancy_days: 8,
				turnovers: 1,
				notes: 'Stable occupancy'
			}
		]

		mockRpc
			.mockResolvedValueOnce({ data: metrics, error: null })
			.mockResolvedValueOnce({ data: trends, error: null })
			.mockResolvedValueOnce({ data: vacancy, error: null })

		const pageData = await service.getOccupancyAnalyticsPageData('asset-4')

		expect(mockRpc).toHaveBeenCalledTimes(3)
		expect(pageData).toEqual({
			metrics: {
				currentOccupancy: 97,
				averageVacancyDays: 10,
				seasonalPeakOccupancy: 99,
				trend: 2.1
			},
			trends: [
				{
					period: '2024-01',
					occupancyRate: 95,
					occupiedUnits: 190,
					totalUnits: 200
				},
				{
					period: '2024-02',
					occupancyRate: 97,
					occupiedUnits: 194,
					totalUnits: 200
				}
			],
			vacancyAnalysis: [
				{
					propertyId: 'prop-1',
					propertyName: 'Willow Creek',
					vacancyDays: 8,
					turnovers: 1,
					notes: 'Stable occupancy'
				}
			]
		})
	})
})
