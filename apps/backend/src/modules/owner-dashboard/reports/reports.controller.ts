import {
	Controller,
	Get,
	Query,
	Logger,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { user_id } from '../../../shared/decorators/user.decorator'
import { ReportsService } from './reports.service'
import type { MetricTrend, TimeSeriesDataPoint } from './reports.service'
import { RolesGuard } from '../../../shared/guards/roles.guard'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { OwnerContextInterceptor } from '../interceptors/owner-context.interceptor'
import { TimeSeriesQueryDto, MetricTrendQueryDto } from './dto/reports-query.dto'

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
		@Query() query: TimeSeriesQueryDto
	): Promise<TimeSeriesDataPoint[]> {
		const { metric, days } = query

		this.logger.log('Getting time series data', { user_id, metric, days })

		return this.reportsService.getTimeSeries(user_id, metric, days)
	}

	/**
	 * Get trend data for a metric (current vs previous period)
	 * @param metric - The metric to retrieve
	 * @param period - The period to compare (day, week, month, year)
	 */
	@Get('metric-trend')
	async getMetricTrend(
		@user_id() user_id: string,
		@Query() query: MetricTrendQueryDto
	): Promise<MetricTrend> {
		const { metric, period } = query

		this.logger.log('Getting metric trend', {
			user_id,
			metric,
			period
		})

		return this.reportsService.getMetricTrend(user_id, metric, period)
	}
}
