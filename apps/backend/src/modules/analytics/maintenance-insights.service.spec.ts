import type { SupabaseService } from '../../database/supabase.service'
import { MaintenanceInsightsService } from './maintenance-insights.service'

describe('MaintenanceInsightsService', () => {
	let service: MaintenanceInsightsService
	let mockSupabase: jest.Mocked<Pick<SupabaseService, 'getAdminClient'>>
	let mockRpc: jest.Mock

	beforeEach(() => {
		mockRpc = jest.fn()
		mockSupabase = {
			getAdminClient: jest.fn().mockReturnValue({ rpc: mockRpc })
		}
		service = new MaintenanceInsightsService(
			mockSupabase as unknown as SupabaseService
		)
	})

	it('maps maintenance metrics from RPC payload', async () => {
		const metrics = {
			open_requests: 7,
			in_progress_requests: 3,
			completed_requests: 22,
			average_response_time_hours: 5.5,
			total_cost: 12400
		}

		mockRpc.mockResolvedValue({ data: metrics, error: null })

		const result = await service.getMaintenanceMetrics('ops-1')

		expect(mockRpc).toHaveBeenCalledWith(
			'calculate_maintenance_metrics',
			expect.objectContaining({ user_id: 'ops-1' })
		)
		expect(result).toEqual({
			openRequests: 7,
			inProgressRequests: 3,
			completedRequests: 22,
			averageResponseTimeHours: 5.5,
			totalCost: 12400
		})
	})

	it('returns safe fallbacks when RPC indicates an error', async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } })

		const insights = await service.getMaintenanceAnalytics('ops-2')

		expect(insights).toEqual({
			metrics: {
				openRequests: 0,
				inProgressRequests: 0,
				completedRequests: 0,
				averageResponseTimeHours: 0,
				totalCost: 0
			},
			costBreakdown: [],
			trends: [],
			categoryBreakdown: []
		})
	})

	it('handles RPC exceptions and logs graceful fallbacks', async () => {
		mockRpc.mockRejectedValue(new Error('network issue'))

		const result = await service.getMaintenanceInsightsPageData('ops-3')

		expect(result).toEqual({
			metrics: {
				openRequests: 0,
				inProgressRequests: 0,
				completedRequests: 0,
				averageResponseTimeHours: 0,
				totalCost: 0
			},
			costBreakdown: [],
			trends: [],
			categoryBreakdown: []
		})
	})

	it('aggregates analytics payload into the page response', async () => {
		const metrics = {
			open_requests: 4,
			in_progress_requests: 5,
			completed_requests: 30,
			average_response_time_hours: 6,
			total_cost: 8400
		}
		const analytics = {
			cost_breakdown: [
				{ category: 'HVAC', amount: 3200, percentage: 38 },
				{ category: 'Plumbing', amount: 2200, percentage: 26 }
			],
			trends_over_time: [
				{
					period: '2024-01',
					completed: 12,
					pending: 3,
					avg_resolution_time: 5
				},
				{ period: '2024-02', completed: 18, pending: 2, avg_resolution_time: 4 }
			],
			category_breakdown: [
				{ category: 'Emergency', count: 8 },
				{ category: 'Routine', count: 22 }
			]
		}

		mockRpc
			.mockResolvedValueOnce({ data: metrics, error: null })
			.mockResolvedValueOnce({ data: analytics, error: null })
			.mockResolvedValueOnce({ data: metrics, error: null })
			.mockResolvedValueOnce({ data: analytics, error: null })

		const quickInsights = await service.getMaintenanceAnalytics('ops-4')
		const pageData = await service.getMaintenanceInsightsPageData('ops-4')

		expect(quickInsights).toEqual({
			metrics: {
				openRequests: 4,
				inProgressRequests: 5,
				completedRequests: 30,
				averageResponseTimeHours: 6,
				totalCost: 8400
			},
			costBreakdown: [
				{ category: 'HVAC', amount: 3200, percentage: 38 },
				{ category: 'Plumbing', amount: 2200, percentage: 26 }
			],
			trends: [
				{ period: '2024-01', completed: 12, pending: 3, avgResolutionTime: 5 },
				{ period: '2024-02', completed: 18, pending: 2, avgResolutionTime: 4 }
			],
			categoryBreakdown: [
				{ category: 'Emergency', count: 8 },
				{ category: 'Routine', count: 22 }
			]
		})

		expect(pageData).toEqual({
			metrics: {
				openRequests: 4,
				inProgressRequests: 5,
				completedRequests: 30,
				averageResponseTimeHours: 6,
				totalCost: 8400
			},
			costBreakdown: [
				{ category: 'HVAC', amount: 3200, percentage: 38 },
				{ category: 'Plumbing', amount: 2200, percentage: 26 }
			],
			trends: [
				{ period: '2024-01', completed: 12, pending: 3, avgResolutionTime: 5 },
				{ period: '2024-02', completed: 18, pending: 2, avgResolutionTime: 4 }
			],
			categoryBreakdown: [
				{ category: 'Emergency', count: 8 },
				{ category: 'Routine', count: 22 }
			]
		})
	})
})
