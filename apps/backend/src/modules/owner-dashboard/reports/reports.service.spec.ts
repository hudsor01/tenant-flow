import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../../__tests__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'
import { ReportsService } from './reports.service'
import { DashboardAnalyticsService } from '../../analytics/dashboard-analytics.service'

describe('ReportsService (owner-dashboard)', () => {
	let service: ReportsService
	let mockDashboardAnalytics: jest.Mocked<
		Pick<DashboardAnalyticsService, 'getDashboardStats' | 'getOccupancyTrends' | 'getRevenueTrends' | 'getMaintenanceAnalytics'>
	>

	const USER_ID = 'user-123'

	const emptyStats = {
		properties: { total: 0, active: 0, inactive: 0 },
		units: { total: 0, occupied: 0, vacant: 0 },
		tenants: { total: 0, active: 0, newThisMonth: 0 },
		maintenance: { open: 3, inProgress: 0, completed: 0, highPriority: 0 },
		revenue: { thisMonth: 0, lastMonth: 0, ytd: 0 },
	} as any

	const emptyMaintenanceAnalytics = {
		total: 0,
		open: 0,
		inProgress: 0,
		completed: 0,
		highPriority: 0,
		avgResolutionTime: 0,
		costMetrics: { totalCost: 0, avgCost: 0, budgetUtilization: 0 },
		byCategory: [],
		byPriority: [],
		recentRequests: [],
		trendsOverTime: [],
	}

	beforeEach(async () => {
		mockDashboardAnalytics = {
			getDashboardStats: jest.fn().mockResolvedValue(emptyStats),
			getOccupancyTrends: jest.fn().mockResolvedValue([]),
			getRevenueTrends: jest.fn().mockResolvedValue([]),
			getMaintenanceAnalytics: jest.fn().mockResolvedValue(emptyMaintenanceAnalytics),
		}

		const module = await Test.createTestingModule({
			providers: [
				ReportsService,
				{ provide: DashboardAnalyticsService, useValue: mockDashboardAnalytics },
				{ provide: AppLogger, useValue: new SilentLogger() },
			],
		}).setLogger(new SilentLogger()).compile()

		service = module.get<ReportsService>(ReportsService)
	})

	afterEach(() => { jest.resetAllMocks() })

	// ================================================================
	// getMetricTrend
	// ================================================================
	describe('getMetricTrend', () => {
		describe('occupancy_rate metric', () => {
			it('returns empty trend when no occupancy data available', async () => {
				mockDashboardAnalytics.getOccupancyTrends.mockResolvedValue([])
				const result = await service.getMetricTrend(USER_ID, 'occupancy_rate')
				expect(result.current).toBe(0)
				expect(result.previous).toBeNull()
			})

			it('returns current occupancy rate from latest trend', async () => {
				mockDashboardAnalytics.getOccupancyTrends.mockResolvedValue([
					{ month: '2024-02', occupancy_rate: 85, occupied_units: 17, total_units: 20 },
				])
				const result = await service.getMetricTrend(USER_ID, 'occupancy_rate')
				expect(result.current).toBe(85)
				expect(result.previous).toBeNull()
			})

			it('calculates percent change when two trend periods available', async () => {
				mockDashboardAnalytics.getOccupancyTrends.mockResolvedValue([
					{ month: '2024-02', occupancy_rate: 90, occupied_units: 18, total_units: 20 },
					{ month: '2024-01', occupancy_rate: 80, occupied_units: 16, total_units: 20 },
				])
				const result = await service.getMetricTrend(USER_ID, 'occupancy_rate')
				expect(result.current).toBe(90)
				expect(result.previous).toBe(80)
				expect(result.change).toBe(10)
				expect(result.percentChange).toBe(12.5)
			})

			it('passes period=month default to getOccupancyTrends', async () => {
				await service.getMetricTrend(USER_ID, 'occupancy_rate')
				expect(mockDashboardAnalytics.getOccupancyTrends).toHaveBeenCalledWith(USER_ID, undefined, 2)
			})
		})

		describe('active_tenants metric', () => {
			it('returns current active tenant count', async () => {
				mockDashboardAnalytics.getDashboardStats.mockResolvedValue({
					...emptyStats,
					tenants: { total: 10, active: 8, newThisMonth: 2 },
				})
				const result = await service.getMetricTrend(USER_ID, 'active_tenants')
				expect(result.current).toBe(8)
			})

			it('uses newThisMonth as proxy for trend calculation', async () => {
				mockDashboardAnalytics.getDashboardStats.mockResolvedValue({
					...emptyStats,
					tenants: { total: 10, active: 8, newThisMonth: 3 },
				})
				const result = await service.getMetricTrend(USER_ID, 'active_tenants')
				// previous = current - newThisMonth = 8 - 3 = 5
				expect(result.previous).toBe(5)
			})
		})

		describe('monthly_revenue metric', () => {
			it('returns empty trend when no revenue data available', async () => {
				mockDashboardAnalytics.getRevenueTrends.mockResolvedValue([])
				const result = await service.getMetricTrend(USER_ID, 'monthly_revenue')
				expect(result.current).toBe(0)
				expect(result.previous).toBeNull()
			})

			it('returns current revenue from latest trend', async () => {
				mockDashboardAnalytics.getRevenueTrends.mockResolvedValue([
					{ month: '2024-02', revenue: 15000, collected: 15000, outstanding: 0 },
				])
				const result = await service.getMetricTrend(USER_ID, 'monthly_revenue')
				expect(result.current).toBe(15000)
			})

			it('calculates revenue change between two periods', async () => {
				mockDashboardAnalytics.getRevenueTrends.mockResolvedValue([
					{ month: '2024-02', revenue: 15000, collected: 15000, outstanding: 0 },
					{ month: '2024-01', revenue: 12000, collected: 12000, outstanding: 0 },
				])
				const result = await service.getMetricTrend(USER_ID, 'monthly_revenue')
				expect(result.current).toBe(15000)
				expect(result.previous).toBe(12000)
				expect(result.change).toBe(3000)
			})
		})

		describe('open_maintenance metric', () => {
			it('returns current open maintenance count from dashboard stats', async () => {
				mockDashboardAnalytics.getDashboardStats.mockResolvedValue({
					...emptyStats,
					maintenance: { open: 7, inProgress: 2, completed: 5, highPriority: 1 },
				})
				mockDashboardAnalytics.getMaintenanceAnalytics.mockResolvedValue({
					...emptyMaintenanceAnalytics,
					trendsOverTime: [],
				})
				const result = await service.getMetricTrend(USER_ID, 'open_maintenance')
				expect(result.current).toBe(7)
			})

			it('uses trendsOverTime for previous value when available', async () => {
				mockDashboardAnalytics.getDashboardStats.mockResolvedValue({
					...emptyStats,
					maintenance: { open: 7, inProgress: 2, completed: 5, highPriority: 1 },
				})
				mockDashboardAnalytics.getMaintenanceAnalytics.mockResolvedValue({
					...emptyMaintenanceAnalytics,
					trendsOverTime: [
						{ month: '2024-02', open: 7, completed: 3, inProgress: 2 },
						{ month: '2024-01', open: 5, completed: 4, inProgress: 1 },
					],
				})
				const result = await service.getMetricTrend(USER_ID, 'open_maintenance')
				// previous = trendsOverTime[1].completed = 4
				expect(result.previous).toBe(4)
			})
		})

		describe('total_maintenance metric', () => {
			it('delegates to same logic as open_maintenance', async () => {
				mockDashboardAnalytics.getDashboardStats.mockResolvedValue({
					...emptyStats,
					maintenance: { open: 5, inProgress: 1, completed: 10, highPriority: 0 },
				})
				mockDashboardAnalytics.getMaintenanceAnalytics.mockResolvedValue(emptyMaintenanceAnalytics)
				const result = await service.getMetricTrend(USER_ID, 'total_maintenance')
				expect(result.current).toBe(5)
			})
		})

		describe('unknown metric', () => {
			it('returns empty trend for unrecognized metric', async () => {
				const result = await service.getMetricTrend(USER_ID, 'unknown_metric' as any)
				expect(result.current).toBe(0)
				expect(result.previous).toBeNull()
				expect(result.change).toBe(0)
				expect(result.percentChange).toBe(0)
			})
		})

		it('returns empty trend on error and does not throw', async () => {
			mockDashboardAnalytics.getOccupancyTrends.mockRejectedValue(new Error('RPC failed'))
			const result = await service.getMetricTrend(USER_ID, 'occupancy_rate')
			expect(result.current).toBe(0)
			expect(result.previous).toBeNull()
		})
	})

	// ================================================================
	// getTimeSeries
	// ================================================================
	describe('getTimeSeries', () => {
		describe('occupancy_rate metric', () => {
			it('returns empty array when no occupancy trends', async () => {
				mockDashboardAnalytics.getOccupancyTrends.mockResolvedValue([])
				const result = await service.getTimeSeries(USER_ID, 'occupancy_rate', 30)
				expect(result).toEqual([])
			})

			it('converts occupancy trends to time series data points', async () => {
				mockDashboardAnalytics.getOccupancyTrends.mockResolvedValue([
					{ month: '2024-01', occupancy_rate: 85, occupied_units: 17, total_units: 20 },
					{ month: '2024-02', occupancy_rate: 90, occupied_units: 18, total_units: 20 },
				])
				const result = await service.getTimeSeries(USER_ID, 'occupancy_rate', 60)
				expect(result).toHaveLength(2)
				expect(result[0].value).toBe(85)
				expect(result[0].date).toBe('2024-01-01')
				expect(result[1].value).toBe(90)
			})
		})

		describe('monthly_revenue metric', () => {
			it('returns empty array when no revenue trends', async () => {
				mockDashboardAnalytics.getRevenueTrends.mockResolvedValue([])
				const result = await service.getTimeSeries(USER_ID, 'monthly_revenue', 30)
				expect(result).toEqual([])
			})

			it('converts revenue trends to time series data points', async () => {
				mockDashboardAnalytics.getRevenueTrends.mockResolvedValue([
					{ month: '2024-01', revenue: 12000, collected: 12000, outstanding: 0 },
				])
				const result = await service.getTimeSeries(USER_ID, 'monthly_revenue', 30)
				expect(result[0].value).toBe(12000)
				expect(result[0].date).toBe('2024-01-01')
			})
		})

		describe('active_tenants metric', () => {
			it('returns single data point with current active tenant count', async () => {
				mockDashboardAnalytics.getDashboardStats.mockResolvedValue({
					...emptyStats,
					tenants: { total: 15, active: 12, newThisMonth: 1 },
				})
				const result = await service.getTimeSeries(USER_ID, 'active_tenants', 30)
				expect(result).toHaveLength(1)
				expect(result[0].value).toBe(12)
			})
		})

		describe('open_maintenance metric', () => {
			it('converts maintenance trendsOverTime to time series', async () => {
				mockDashboardAnalytics.getMaintenanceAnalytics.mockResolvedValue({
					...emptyMaintenanceAnalytics,
					trendsOverTime: [
						{ month: '2024-01', completed: 5, open: 3, inProgress: 2 },
						{ month: '2024-02', completed: 8, open: 2, inProgress: 1 },
					],
				})
				const result = await service.getTimeSeries(USER_ID, 'open_maintenance', 60)
				expect(result).toHaveLength(2)
				// value = completed count
				expect(result[0].value).toBe(5)
				expect(result[0].date).toBe('2024-01-01')
			})

			it('returns empty array when no maintenance trends', async () => {
				mockDashboardAnalytics.getMaintenanceAnalytics.mockResolvedValue({
					...emptyMaintenanceAnalytics,
					trendsOverTime: [],
				})
				const result = await service.getTimeSeries(USER_ID, 'open_maintenance', 30)
				expect(result).toEqual([])
			})
		})

		describe('total_maintenance metric', () => {
			it('delegates to same logic as open_maintenance', async () => {
				mockDashboardAnalytics.getMaintenanceAnalytics.mockResolvedValue({
					...emptyMaintenanceAnalytics,
					trendsOverTime: [{ month: '2024-01', completed: 3, open: 2, inProgress: 1 }],
				})
				const result = await service.getTimeSeries(USER_ID, 'total_maintenance', 30)
				expect(result[0].value).toBe(3)
			})
		})

		describe('unknown metric', () => {
			it('returns empty array for unrecognized metric', async () => {
				const result = await service.getTimeSeries(USER_ID, 'unknown_metric' as any, 30)
				expect(result).toEqual([])
			})
		})

		it('returns empty array on error and does not throw', async () => {
			mockDashboardAnalytics.getOccupancyTrends.mockRejectedValue(new Error('DB down'))
			const result = await service.getTimeSeries(USER_ID, 'occupancy_rate', 30)
			expect(result).toEqual([])
		})

		it('normalizes days to months (30 days = 1 month)', async () => {
			mockDashboardAnalytics.getOccupancyTrends.mockResolvedValue([])
			await service.getTimeSeries(USER_ID, 'occupancy_rate', 30)
			// 30 days -> 1 month
			expect(mockDashboardAnalytics.getOccupancyTrends).toHaveBeenCalledWith(USER_ID, undefined, 1)
		})

		it('normalizes 60 days to 2 months', async () => {
			mockDashboardAnalytics.getOccupancyTrends.mockResolvedValue([])
			await service.getTimeSeries(USER_ID, 'occupancy_rate', 60)
			expect(mockDashboardAnalytics.getOccupancyTrends).toHaveBeenCalledWith(USER_ID, undefined, 2)
		})
	})
})
