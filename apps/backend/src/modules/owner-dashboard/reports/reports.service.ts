import { Injectable } from '@nestjs/common'
import { DashboardAnalyticsService } from '../../analytics/dashboard-analytics.service'
import type { MetricTypeValue, PeriodTypeValue } from './dto/reports-query.dto'
import { AppLogger } from '../../../logger/app-logger.service'
import type { MetricTrend, TimeSeriesDataPoint } from '@repo/shared/types/analytics'

/**
 * ReportsService
 *
 * Provides metric trends and time series data for owner dashboard charts.
 * Delegates to DashboardAnalyticsService for data retrieval.
 */
@Injectable()
export class ReportsService {
	constructor(
		private readonly dashboardAnalytics: DashboardAnalyticsService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get metric trend comparing current period to previous period
	 */
	async getMetricTrend(
		user_id: string,
		metric: MetricTypeValue,
		period: PeriodTypeValue = 'month'
	): Promise<MetricTrend> {
		this.logger.log('Calculating metric trend', { user_id, metric, period })

		try {
			switch (metric) {
				case 'occupancy_rate':
					return this.getOccupancyTrend(user_id, period)
				case 'active_tenants':
					return this.getActiveTenantsTrend(user_id, period)
				case 'monthly_revenue':
					return this.getRevenueTrend(user_id, period)
				case 'open_maintenance':
				case 'total_maintenance':
					return this.getMaintenanceTrend(user_id, period)
				default:
					this.logger.warn('Unknown metric requested', { metric })
					return this.emptyTrend()
			}
		} catch (error) {
			this.logger.error('Failed to calculate metric trend', {
				error: error instanceof Error ? error.message : String(error),
				user_id,
				metric,
				period
			})
			return this.emptyTrend()
		}
	}

	/**
	 * Get time series data for a metric over specified days
	 */
	async getTimeSeries(
		user_id: string,
		metric: MetricTypeValue,
		days: number = 30
	): Promise<TimeSeriesDataPoint[]> {
		this.logger.log('Fetching time series', { user_id, metric, days })

		try {
			const months = Math.max(1, Math.ceil(days / 30))

			switch (metric) {
				case 'occupancy_rate':
					return this.getOccupancyTimeSeries(user_id, months)
				case 'monthly_revenue':
					return this.getRevenueTimeSeries(user_id, months)
				case 'active_tenants':
					return this.getTenantTimeSeries(user_id, months)
				case 'open_maintenance':
				case 'total_maintenance':
					return this.getMaintenanceTimeSeries(user_id, months)
				default:
					this.logger.warn('Unknown metric for time series', { metric })
					return []
			}
		} catch (error) {
			this.logger.error('Failed to fetch time series', {
				error: error instanceof Error ? error.message : String(error),
				user_id,
				metric,
				days
			})
			return []
		}
	}

	private async getOccupancyTrend(
		user_id: string,
		_period: PeriodTypeValue
	): Promise<MetricTrend> {
		const trends = await this.dashboardAnalytics.getOccupancyTrends(
			user_id,
			undefined,
			2
		)

		if (trends.length === 0) {
			return this.emptyTrend()
		}

		const current = trends[0]?.occupancy_rate ?? 0
		const previous =
			trends.length > 1 ? (trends[1]?.occupancy_rate ?? null) : null

		return this.calculateTrend(current, previous)
	}

	private async getActiveTenantsTrend(
		user_id: string,
		_period: PeriodTypeValue
	): Promise<MetricTrend> {
		const stats = await this.dashboardAnalytics.getDashboardStats(user_id)

		// Use current active tenants and new this month as a proxy for trend
		const current = stats.tenants?.active ?? 0
		const newThisMonth = stats.tenants?.newThisMonth ?? 0
		const previous = current - newThisMonth

		return this.calculateTrend(current, previous > 0 ? previous : null)
	}

	private async getRevenueTrend(
		user_id: string,
		_period: PeriodTypeValue
	): Promise<MetricTrend> {
		const trends = await this.dashboardAnalytics.getRevenueTrends(
			user_id,
			undefined,
			2
		)

		if (trends.length === 0) {
			return this.emptyTrend()
		}

		const current = trends[0]?.revenue ?? 0
		const previous = trends.length > 1 ? (trends[1]?.revenue ?? null) : null

		return this.calculateTrend(current, previous)
	}

	private async getMaintenanceTrend(
		user_id: string,
		_period: PeriodTypeValue
	): Promise<MetricTrend> {
		const stats = await this.dashboardAnalytics.getDashboardStats(user_id)
		const analytics =
			await this.dashboardAnalytics.getMaintenanceAnalytics(user_id)

		const current = stats.maintenance?.open ?? 0

		// Use trends over time if available for previous value
		const trendsOverTime = analytics.trendsOverTime ?? []
		const previous =
			trendsOverTime.length > 1 ? (trendsOverTime[1]?.completed ?? null) : null

		return this.calculateTrend(current, previous)
	}

	private async getOccupancyTimeSeries(
		user_id: string,
		months: number
	): Promise<TimeSeriesDataPoint[]> {
		const trends = await this.dashboardAnalytics.getOccupancyTrends(
			user_id,
			undefined,
			months
		)

		return trends.map(item => ({
			date: this.normalizeMonthToDate(item.month),
			value: item.occupancy_rate ?? 0
		}))
	}

	private async getRevenueTimeSeries(
		user_id: string,
		months: number
	): Promise<TimeSeriesDataPoint[]> {
		const trends = await this.dashboardAnalytics.getRevenueTrends(
			user_id,
			undefined,
			months
		)

		return trends.map(item => ({
			date: this.normalizeMonthToDate(item.month),
			value: item.revenue ?? 0
		}))
	}

	private async getTenantTimeSeries(
		user_id: string,
		_months: number
	): Promise<TimeSeriesDataPoint[]> {
		// For tenant time series, we use occupancy trends as a proxy
		// since tenant counts correlate with occupancy
		const stats = await this.dashboardAnalytics.getDashboardStats(user_id)
		const activeTenants = stats.tenants?.active ?? 0

		// Return current month data point
		const now = new Date()
		return [
			{
				date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
				value: activeTenants
			}
		]
	}

	private async getMaintenanceTimeSeries(
		user_id: string,
		_months: number
	): Promise<TimeSeriesDataPoint[]> {
		const analytics =
			await this.dashboardAnalytics.getMaintenanceAnalytics(user_id)

		const trendsOverTime = analytics.trendsOverTime ?? []

		return trendsOverTime.map(item => ({
			date: this.normalizeMonthToDate(item.month),
			value: item.completed ?? 0
		}))
	}

	private calculateTrend(
		current: number,
		previous: number | null
	): MetricTrend {
		if (previous === null || previous === 0) {
			return {
				current,
				previous: null,
				change: 0,
				percentChange: 0
			}
		}

		const change = current - previous
		const percentChange = (change / previous) * 100

		return {
			current,
			previous,
			change,
			percentChange: Math.round(percentChange * 100) / 100
		}
	}

	private normalizeMonthToDate(month: string): string {
		// Convert "2024-01" or "January 2024" to "2024-01-01"
		if (!month) {
			const now = new Date()
			return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
		}

		// Already in YYYY-MM format
		if (/^\d{4}-\d{2}$/.test(month)) {
			return `${month}-01`
		}

		// Already in YYYY-MM-DD format
		if (/^\d{4}-\d{2}-\d{2}$/.test(month)) {
			return month
		}

		// Try parsing as date string
		try {
			const date = new Date(month)
			if (!isNaN(date.getTime())) {
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
			}
		} catch {
			// Fall through to default
		}

		// Default to current month
		const now = new Date()
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
	}

	private emptyTrend(): MetricTrend {
		return {
			current: 0,
			previous: null,
			change: 0,
			percentChange: 0
		}
	}
}
