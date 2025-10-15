import type { SupabaseService } from '../../database/supabase.service'
import { PropertyPerformanceService } from './property-performance.service'

describe('PropertyPerformanceService', () => {
	let service: PropertyPerformanceService
	let mockSupabase: jest.Mocked<Pick<SupabaseService, 'getAdminClient'>>
	let mockRpc: jest.Mock

	beforeEach(() => {
		mockRpc = jest.fn()
		// Create a mock supabase that exposes getAdminClient and rpcWithRetries.
		// rpcWithRetries delegates to the admin client's rpc so tests can assert
		// the underlying rpc was called and also that getAdminClient was used.
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

		service = new PropertyPerformanceService(
			mockSupabase as unknown as SupabaseService
		)
	})

	it('fetches property performance via RPC and maps the payload', async () => {
		const sample = [
			{
				property_id: 'prop_1',
				property_name: 'Property One',
				occupancy_rate: 94.5,
				monthly_revenue: 12000,
				annual_revenue: 144000,
				total_units: 50,
				occupied_units: 47,
				vacant_units: 3,
				address: '123 Main St',
				status: 'active',
				property_type: 'multi-family'
			}
		]

		mockRpc.mockResolvedValue({ data: sample, error: null })

		const result = await service.getPropertyPerformance('user-123')

		expect(mockSupabase.getAdminClient).toHaveBeenCalledTimes(1)
		expect(mockRpc).toHaveBeenCalledWith(
			'get_property_performance',
			expect.objectContaining({ user_id: 'user-123' })
		)
		expect(result).toEqual([
			{
				propertyId: 'prop_1',
				propertyName: 'Property One',
				occupancyRate: 94.5,
				monthlyRevenue: 12000,
				annualRevenue: 144000,
				totalUnits: 50,
				occupiedUnits: 47,
				vacantUnits: 3,
				address: '123 Main St',
				status: 'active',
				propertyType: 'multi-family'
			}
		])
	})

	it('returns safe fallbacks when RPC resolves with an error', async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } })

		const [performance, units, stats] = await Promise.all([
			service.getPropertyPerformance('user-123'),
			service.getPropertyUnits('user-123'),
			service.getUnitStatistics('user-123')
		])

		expect(performance).toEqual([])
		expect(units).toEqual([])
		expect(stats).toEqual([])
	})

	it('falls back to empty records when RPC throws unexpectedly', async () => {
		mockRpc.mockRejectedValue(new Error('network blip'))

		const visitorAnalytics = await service.getVisitorAnalytics('user-456')

		expect(visitorAnalytics).toEqual({
			summary: {
				totalVisits: 0,
				totalInquiries: 0,
				totalConversions: 0,
				conversionRate: 0
			},
			timeline: []
		})
	})

	it('builds property performance page data from multiple RPC calls', async () => {
		const performance = [
			{
				property_id: 'prop_1',
				property_name: 'Property One',
				occupancy_rate: 94.5,
				monthly_revenue: 12000,
				total_units: 50,
				occupied_units: 47,
				vacant_units: 3
			}
		]
		const units = [
			{
				property_id: 'prop_1',
				unit_id: 'unit_1',
				unit_number: '101',
				status: 'occupied',
				bedrooms: 2,
				bathrooms: 1,
				rent_amount: 1800,
				square_feet: 950
			}
		]
		const unitStats = [{ label: 'Vacant Units', value: 3, trend: -1 }]
		const visitorAnalytics = {
			summary: {
				total_visits: 1000,
				total_inquiries: 150,
				total_conversions: 30
			},
			timeline: [
				{ period: '2024-01', visits: 500, inquiries: 80, conversions: 15 },
				{ period: '2024-02', visits: 500, inquiries: 70, conversions: 15 }
			]
		}

		mockRpc
			.mockResolvedValueOnce({ data: performance, error: null })
			.mockResolvedValueOnce({ data: units, error: null })
			.mockResolvedValueOnce({ data: unitStats, error: null })
			.mockResolvedValueOnce({ data: visitorAnalytics, error: null })

		const result = await service.getPropertyPerformancePageData('user-789')

		expect(mockRpc).toHaveBeenCalledTimes(4)
		expect(result).toEqual({
			metrics: {
				totalProperties: 1,
				totalUnits: 50,
				occupiedUnits: 47,
				averageOccupancy: 94.5,
				totalRevenue: 12000,
				bestPerformer: 'Property One',
				worstPerformer: 'Property One'
			},
			performance: [
				{
					propertyId: 'prop_1',
					propertyName: 'Property One',
					occupancyRate: 94.5,
					monthlyRevenue: 12000,
					annualRevenue: 0,
					totalUnits: 50,
					occupiedUnits: 47,
					vacantUnits: 3,
					address: '',
					status: '',
					propertyType: ''
				}
			],
			units: [
				{
					propertyId: 'prop_1',
					unitId: 'unit_1',
					unitNumber: '101',
					status: 'OCCUPIED',
					bedrooms: 2,
					bathrooms: 1,
					rent: 1800,
					squareFeet: 950
				}
			],
			unitStats: [
				{
					label: 'Vacant Units',
					value: 3,
					trend: -1
				}
			],
			visitorAnalytics: {
				summary: {
					totalVisits: 1000,
					totalInquiries: 150,
					totalConversions: 30,
					conversionRate: 3
				},
				timeline: [
					{
						period: '2024-01',
						visits: 500,
						inquiries: 80,
						conversions: 15
					},
					{
						period: '2024-02',
						visits: 500,
						inquiries: 70,
						conversions: 15
					}
				]
			}
		})
	})
})
