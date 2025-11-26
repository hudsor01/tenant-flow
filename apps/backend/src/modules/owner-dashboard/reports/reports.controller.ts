import {
	Controller,
	Get,
	Query,
	Logger,
	UseGuards,
	UseInterceptors,
	BadRequestException
} from '@nestjs/common'
import { user_id } from '../../../shared/decorators/user.decorator'
import { ReportsService, MetricTrend, TimeSeriesDataPoint } from './reports.service'
import { RolesGuard } from '../../../shared/guards/roles.guard'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'

type MetricType =
	| 'occupancy_rate'
	| 'active_tenants'
	| 'monthly_revenue'
	| 'open_maintenance'
	| 'total_maintenance'

type PeriodType = 'day' | 'week' | 'month' | 'year'

const VALID_METRICS: MetricType[] = [
	'occupancy_rate',
	'active_tenants',
	'monthly_revenue',
	'open_maintenance',
	'total_maintenance'
]

const VALID_PERIODS: PeriodType[] = ['day', 'week', 'month', 'year']

/**
 * ReportsController
 *
 * Handles owner dashboard reporting endpoints:
 * - Metric trends (current vs previous period comparison)
 * - Time series data for charts
 */
@UseGuards(RolesGuard)
@Roles('OWNER')
@UseInterceptors(OwnerContextInterceptor)
@Controller('')
export class ReportsController {
	private readonly logger = new Logger(ReportsController.name)

	constructor(private readonly reportsService: ReportsService) {}

	/**
	 * Get time series data for a metric
	 * @param metric - The metric to retrieve (occupancy_rate, monthly_revenue, etc.)
	 * @param days - Number of days of data (default 30)
	 */
	@Get('time-series')
	async getTimeSeries(
		@user_id() user_id: string,
		@Query('metric') metric: string,
		@Query('days') daysParam?: string
	): Promise<TimeSeriesDataPoint[]> {
		if (!metric) {
			throw new BadRequestException('metric query parameter is required')
		}

		if (!VALID_METRICS.includes(metric as MetricType)) {
			throw new BadRequestException(
				`Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}`
			)
		}

		const days = daysParam ? parseInt(daysParam, 10) : 30

		if (isNaN(days) || days < 1 || days > 365) {
			throw new BadRequestException('days must be a number between 1 and 365')
		}

		this.logger.log('Getting time series data', { user_id, metric, days })

		return this.reportsService.getTimeSeries(user_id, metric as MetricType, days)
	}

	/**
	 * Get trend data for a metric (current vs previous period)
	 * @param metric - The metric to retrieve
	 * @param period - The period to compare (day, week, month, year)
	 */
	@Get('metric-trend')
	async getMetricTrend(
		@user_id() user_id: string,
		@Query('metric') metric: string,
		@Query('period') period?: string
	): Promise<MetricTrend> {
		if (!metric) {
			throw new BadRequestException('metric query parameter is required')
		}

		if (!VALID_METRICS.includes(metric as MetricType)) {
			throw new BadRequestException(
				`Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}`
			)
		}

		const periodValue: PeriodType =
			period && VALID_PERIODS.includes(period as PeriodType)
				? (period as PeriodType)
				: 'month'

		this.logger.log('Getting metric trend', {
			user_id,
			metric,
			period: periodValue
		})

		return this.reportsService.getMetricTrend(
			user_id,
			metric as MetricType,
			periodValue
		)
	}
}
